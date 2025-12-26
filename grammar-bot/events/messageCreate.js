const { EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const { PointsSystem, AchievementsSystem } = require('../gamification/systems');
const config = require('../config.json');

const analysisEngine = new AnalysisEngine();

// Track recent messages to avoid spam
const recentChecks = new Map();
const COOLDOWN_MS = 30000; // 30 seconds between checks per user

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // Ignore commands
    if (message.content.startsWith('/')) return;

    // Get user from database
    const { User } = getDatabase();
    const user = await User.findOrCreate(message.author.id, message.author.username);

    // Check if auto-check is enabled
    if (!user.autoCheckEnabled) return;

    // Check cooldown
    const lastCheck = recentChecks.get(message.author.id);
    if (lastCheck && (Date.now() - lastCheck) < COOLDOWN_MS) {
      return; // Still in cooldown
    }

    try {
      // Analyze message
      const result = await analysisEngine.analyzeMessage(
        message.content,
        message.author.id
      );

      // Update cooldown
      recentChecks.set(message.author.id, Date.now());

      // Handle errors
      if (result.error) {
        console.error(`Grammar check error for ${message.author.username}:`, result.error);
        return;
      }

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
  },
};

/**
 * Send grammar correction message
 */
async function sendCorrectionMessage(message, user, result) {
  const formatted = analysisEngine.formatErrorMessage(result);

  const embed = new EmbedBuilder()
    .setTitle('✍️ Grammar Check')
    .setDescription(formatted.message)
    .setColor(config.colors.error)
    .setFooter({ text: `Quality Score: ${result.qualityScore}/100` });

  // Add corrected version
  if (formatted.correctedText && formatted.correctedText !== message.content) {
    embed.addFields({
      name: '✅ Corrected Version',
      value: formatted.correctedText.substring(0, 1000), // Limit length
      inline: false
    });
  }

  // Add user stats
  const accuracy = user.totalMessages > 0
    ? ((user.cleanMessages / user.totalMessages) * 100).toFixed(1)
    : 0;

  embed.addFields({
    name: '📊 Your Stats',
    value: `HP: ${user.hp}/${user.maxHp} | Level: ${user.level} | Accuracy: ${accuracy}%`,
    inline: false
  });

  // Add suggestion
  const suggestion = analysisEngine.generateSuggestion(result.errorTypes);
  embed.addFields({
    name: '💡 Tip',
    value: suggestion,
    inline: false
  });

  try {
    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending correction message:', error);
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
      inline: false
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
    .setTitle('🔥 Streak Milestone!')
    .setDescription(`${user.username} has a **${user.streak}-day** clean message streak!`)
    .setColor(config.colors.success)
    .setFooter({ text: 'Keep up the great work!' });

  try {
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending streak message:', error);
  }
}

// Cleanup old cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of recentChecks.entries()) {
    if (now - timestamp > COOLDOWN_MS * 2) {
      recentChecks.delete(userId);
    }
  }
}, 60000); // Clean up every minute
