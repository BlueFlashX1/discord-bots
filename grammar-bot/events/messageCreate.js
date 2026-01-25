const { EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const { PointsSystem, AchievementsSystem } = require('../gamification/systems');
const config = require('../config.json');

const analysisEngine = new AnalysisEngine();

// Track recent messages to avoid spam
// PER-USER cooldown: Each user has their own separate cooldown timer
const recentChecks = new Map(); // Key: userId, Value: timestamp of last check
const COOLDOWN_MS = (config.rateLimit?.timeWindow || 30) * 1000; // Convert seconds to milliseconds

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // Ignore commands
    if (message.content.startsWith('/')) return;

    // Process asynchronously to prevent blocking Discord event loop
    // Use setImmediate to defer to next event loop tick
    setImmediate(async () => {
      await processMessage(message);
    });
  },
};

// Extract message processing to separate function for better performance
async function processMessage(message) {

    // STRICT: Only analyze messages from explicitly configured servers
    const guildId = message.guild.id;
    const serverConfig = config.channels?.servers?.[guildId];

    // Server must be explicitly configured with all required settings
    if (!serverConfig) {
      console.log(
        `[Grammar Check] Skipping ${message.author.tag} (${message.author.id}) - Server ${guildId} not configured`
      );
      return; // Server not configured, skip analysis completely
    }

    // All three required: server ID, primary channel(s), corrections channel
    const primaryChannelIds = serverConfig.primaryChannelIds || [];
    const correctionsChannelId = serverConfig.correctionsChannelId;

    // Require at least one primary channel and a corrections channel
    if (primaryChannelIds.length === 0 || !correctionsChannelId) {
      console.log(
        `[Grammar Check] Skipping ${message.author.tag} (${message.author.id}) - Server ${guildId} missing channel config`
      );
      return; // Server configured but missing required settings, skip analysis
    }

    // Only analyze messages in configured primary channels
    if (!primaryChannelIds.includes(message.channel.id)) {
      console.log(
        `[Grammar Check] Skipping ${message.author.tag} (${message.author.id}) - Channel #${message.channel.name} (${message.channel.id}) not in primary channels`
      );
      return; // Not a primary channel, skip analysis
    }

    // Get user from database
    const { User } = getDatabase();
    const user = await User.findOrCreate(message.author.id, message.author.username);

    // ALWAYS check all users - no opt-out, no exceptions
    // Grammar checking is enabled for everyone in configured channels
    console.log(
      `[Grammar Check] Analyzing message from ${message.author.tag} (${message.author.id}) in #${message.channel.name}`
    );

    // Check per-user cooldown (each user has separate cooldown timer)
    const lastCheck = recentChecks.get(message.author.id);
    if (lastCheck && Date.now() - lastCheck < COOLDOWN_MS) {
      const remainingCooldown = Math.ceil((COOLDOWN_MS - (Date.now() - lastCheck)) / 1000);
      console.log(
        `[Grammar Check] User ${message.author.tag} (${message.author.id}) in cooldown (${remainingCooldown}s remaining)`
      );
      return; // This specific user is still in cooldown
    }

    try {
      console.log(
        `[Grammar Check] Starting analysis for ${message.author.tag} (${
          message.author.id
        }): "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`
      );
      // Analyze message
      const result = await analysisEngine.analyzeMessage(message.content, message.author.id);

      // Update per-user cooldown (only for this specific user)
      recentChecks.set(message.author.id, Date.now());

      // Handle errors
      if (result.error) {
        console.error(
          `[Grammar Check] Error for ${message.author.tag} (${message.author.id}):`,
          result.error
        );
        return;
      }

      console.log(
        `[Grammar Check] Analysis complete for ${message.author.tag} (${message.author.id}): ${
          result.hasErrors ? `${result.errorCount} error(s) found` : 'No errors'
        }`
      );

      // Track message result (always call this!)
      // Use errorTypesAll if available (includes all instances) for accurate stats
      // Fallback to errorTypes (unique types) for backward compatibility
      const errorTypesForTracking = result.errorTypesAll || result.errorTypes || [];
      await user.addMessageResult(
        result.hasErrors,
        result.errorCount || 0,
        errorTypesForTracking
      );

      // If no errors, award quality bonus
      if (!result.hasErrors && result.shouldRespond !== false) {
        const bonus = await PointsSystem.awardQualityBonus(user, message.content.length);

        if (bonus) {
          // Check for level up
          if (bonus.newLevel > user.level - 1) {
            await sendLevelUpMessage(message, user, bonus.newLevel);
          }

          // Check for achievements
          const newAchievements = await AchievementsSystem.checkAchievements(user);
          if (newAchievements.length > 0) {
            await sendAchievementMessage(message, newAchievements);
          }

          // Silently award bonus (no spam)
          // Could optionally send periodic "streak" notifications
          if (user.streak > 0 && user.streak % 10 === 0) {
            await sendStreakMessage(message, user);
          }
        }
      }

      // If errors found, send correction
      else if (result.shouldRespond && result.hasErrors) {
        console.log(
          `[Grammar Check] Sending correction to ${message.author.tag} (${message.author.id}) - ${result.errorCount} error(s)`
        );
        await sendCorrectionMessage(message, user, result);

        // Check for achievements (even with errors)
        const newAchievements = await AchievementsSystem.checkAchievements(user);
        if (newAchievements.length > 0) {
          await sendAchievementMessage(message, newAchievements);
        }
      }
    } catch (error) {
      console.error('Error in messageCreate event:', error);

      // Don't spam errors to users
      if (error.message.includes('budget exceeded')) {
        // Could send one notification per day about budget
        return;
      }
    }
}

/**
 * Send grammar correction message
 */
async function sendCorrectionMessage(message, user, result) {
  const formatted = analysisEngine.formatErrorMessage(result);
  const { splitText, EMBED_LIMITS } = require('../utils/embedBuilder');
  const AIGrammarService = require('../services/aiGrammar');
  const aiGrammar = new AIGrammarService();

  // Generate roast if there are errors
  let roast = null;
  if (result.hasErrors && result.errors && result.errors.length > 0) {
    try {
      roast = await aiGrammar.generateRoast(message.content, result.errors, result.errorCount);
    } catch (error) {
      console.error('Error generating roast:', error);
      // Continue without roast if generation fails
    }
  }

  // Split description if it's too long
  const descriptionChunks = splitText(formatted.message, EMBED_LIMITS.description);
  const embeds = [];

  // Create first embed with main content
  const firstEmbed = new EmbedBuilder()
    .setTitle('Grammar Check')
    .setDescription(descriptionChunks[0])
    .setColor(config.colors.error)
    .setFooter({ text: `Quality Score: ${result.qualityScore}/100` });

  // Add roast if available (keep it short, max 200 chars)
  if (roast) {
    firstEmbed.addFields({
      name: '🔥 Roast',
      value: roast.length > EMBED_LIMITS.fieldValue ? roast.substring(0, 1021) + '...' : roast,
      inline: false,
    });
  }

  // Add corrected version (split if needed)
  if (formatted.correctedText && formatted.correctedText !== message.content) {
    const correctedChunks = splitText(formatted.correctedText, EMBED_LIMITS.fieldValue);
    if (correctedChunks.length === 1) {
      // Single chunk fits in first embed
      firstEmbed.addFields({
        name: 'Corrected Version',
        value: correctedChunks[0],
        inline: false,
      });
    } else {
      // First chunk in first embed
      firstEmbed.addFields({
        name: 'Corrected Version (Part 1)',
        value: correctedChunks[0],
        inline: false,
      });
    }
  }

  // Add user stats
  const accuracy =
    user.totalMessages > 0 ? ((user.cleanMessages / user.totalMessages) * 100).toFixed(1) : 0;

  firstEmbed.addFields({
    name: 'Your Stats',
    value: `HP: ${user.hp}/${user.maxHp} | Level: ${user.level} | Accuracy: ${accuracy}%`,
    inline: false,
  });

  // Add educational suggestion (use AI learning tip if available)
  const suggestion = analysisEngine.generateSuggestion(result.errorTypes, result.learningTip);
  const suggestionChunks = splitText(suggestion, EMBED_LIMITS.fieldValue);
  if (suggestionChunks.length === 1) {
    firstEmbed.addFields({
      name: 'Learning Tip',
      value: suggestionChunks[0],
      inline: false,
    });
  } else {
    firstEmbed.addFields({
      name: 'Learning Tip (Part 1)',
      value: suggestionChunks[0],
      inline: false,
    });
  }

  embeds.push(firstEmbed);

  // Create additional embeds for split content
  // Additional description chunks
  for (let i = 1; i < descriptionChunks.length; i++) {
    const additionalEmbed = new EmbedBuilder()
      .setTitle(`Grammar Check (Continued ${i + 1}/${descriptionChunks.length})`)
      .setDescription(descriptionChunks[i])
      .setColor(config.colors.error);
    embeds.push(additionalEmbed);
  }

  // Additional corrected text chunks
  if (formatted.correctedText && formatted.correctedText !== message.content) {
    const correctedChunks = splitText(formatted.correctedText, EMBED_LIMITS.fieldValue);
    for (let i = 1; i < correctedChunks.length; i++) {
      const additionalEmbed = new EmbedBuilder()
        .setTitle(`Corrected Version (Part ${i + 1}/${correctedChunks.length})`)
        .setDescription(correctedChunks[i])
        .setColor(config.colors.info);
      embeds.push(additionalEmbed);
    }
  }

  // Additional suggestion chunks
  const suggestionChunksFull = splitText(suggestion, EMBED_LIMITS.fieldValue);
  for (let i = 1; i < suggestionChunksFull.length; i++) {
    const additionalEmbed = new EmbedBuilder()
      .setTitle(`Learning Tip (Part ${i + 1}/${suggestionChunksFull.length})`)
      .setDescription(suggestionChunksFull[i])
      .setColor(config.colors.info);
    embeds.push(additionalEmbed);
  }

  // Get channel configuration for this server (must be explicitly configured)
  const guildId = message.guild.id;
  const serverConfig = config.channels?.servers?.[guildId];

  // If server not configured, this shouldn't happen (already filtered above)
  if (!serverConfig) {
    // Fallback: reply in same channel if somehow we got here
    await message.reply({ embeds: embeds });
    return;
  }

  const primaryChannelIds = serverConfig.primaryChannelIds || [];
  const correctionsChannelId = serverConfig.correctionsChannelId;
  const isPrimaryChannel = primaryChannelIds.includes(message.channel.id);
  const shouldRedirect = isPrimaryChannel && correctionsChannelId;

  if (shouldRedirect && embeds.length > 0) {
    // Add original message link to first embed
    embeds[0].addFields({
      name: 'Original Message',
      value: `[Jump to message](${message.url})\n**Channel:** ${message.channel.name}\n**User:** ${message.author.tag}`,
      inline: false,
    });
  }

  try {
    if (shouldRedirect) {
      // Send to corrections channel
      const correctionsChannel = message.guild.channels.cache.get(correctionsChannelId);
      if (correctionsChannel) {
        // Discord allows up to 10 embeds per message
        const embedsToSend = embeds.slice(0, 10);
        await correctionsChannel.send({ embeds: embedsToSend });

        // If we have more than 10 embeds, send additional messages
        if (embeds.length > 10) {
          for (let i = 10; i < embeds.length; i += 10) {
            await correctionsChannel.send({ embeds: embeds.slice(i, i + 10) });
          }
        }
      } else {
        // Fallback to reply if channel not found
        console.warn(
          `Corrections channel ${correctionsChannelId} not found, falling back to reply`
        );
        const embedsToSend = embeds.slice(0, 10);
        await message.reply({ embeds: embedsToSend });

        if (embeds.length > 10) {
          for (let i = 10; i < embeds.length; i += 10) {
            await message.channel.send({ embeds: embeds.slice(i, i + 10) });
          }
        }
      }
    } else {
      // Normal reply in same channel
      const embedsToSend = embeds.slice(0, 10);
      await message.reply({ embeds: embedsToSend });

      if (embeds.length > 10) {
        for (let i = 10; i < embeds.length; i += 10) {
          await message.channel.send({ embeds: embeds.slice(i, i + 10) });
        }
      }
    }
  } catch (error) {
    console.error('Error sending correction message:', error);
    // Fallback to reply if redirect fails
    try {
      const embedsToSend = embeds.slice(0, 10);
      await message.reply({ embeds: embedsToSend });

      if (embeds.length > 10) {
        for (let i = 10; i < embeds.length; i += 10) {
          await message.channel.send({ embeds: embeds.slice(i, i + 10) });
        }
      }
    } catch (fallbackError) {
      console.error('Fallback reply also failed:', fallbackError);
    }
  }
}

/**
 * Send level up message
 */
async function sendLevelUpMessage(message, user, newLevel) {
  const embed = new EmbedBuilder()
    .setTitle('🎉 Level Up!')
    .setDescription(`Congratulations ${user.username}! You reached **Level ${newLevel}**!`)
    .setColor(config.colors.success)
    .addFields({
      name: '🎁 Rewards',
      value: `Max HP +10 (now ${user.maxHp})\nHP restored +20`,
      inline: false,
    });

  try {
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending level up message:', error);
  }
}

/**
 * Send achievement unlock message
 */
async function sendAchievementMessage(message, achievements) {
  for (const achievement of achievements) {
    const embed = AchievementsSystem.createUnlockEmbed(achievement);

    try {
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error sending achievement message:', error);
    }
  }
}

/**
 * Send streak milestone message
 */
async function sendStreakMessage(message, user) {
  const embed = new EmbedBuilder()
    .setTitle('Streak Milestone!')
    .setDescription(`${user.username} has a **${user.streak}-day** clean message streak!`)
    .setColor(config.colors.success)
    .setFooter({ text: 'Keep up the great work!' });

  try {
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending streak message:', error);
  }
}

// Cleanup old cooldowns periodically - track interval for cleanup
let cooldownCleanupInterval = null;

// Initialize cleanup interval (will be cleaned up on bot shutdown)
function startCooldownCleanup() {
  if (cooldownCleanupInterval) return; // Already started

  cooldownCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of recentChecks.entries()) {
      if (now - timestamp > COOLDOWN_MS * 2) {
        recentChecks.delete(userId);
      }
    }
  }, 60000); // Clean up every minute
}

// Cleanup function for graceful shutdown
function stopCooldownCleanup() {
  if (cooldownCleanupInterval) {
    clearInterval(cooldownCleanupInterval);
    cooldownCleanupInterval = null;
  }
}

// Start cleanup on module load
startCooldownCleanup();

// Export cleanup function for graceful shutdown
module.exports.stopCooldownCleanup = stopCooldownCleanup;
