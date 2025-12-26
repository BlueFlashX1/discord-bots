const { EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../utils/embedBuilder');
const { isUsingJSON, JSONSession } = require('../database/db');
const Session = require('../database/models/Session');
const config = require('../config.json');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    try {
      // Get active session
      const session = isUsingJSON()
        ? await JSONSession.getActiveSession(interaction.channelId)
        : await Session.getActiveSession(interaction.channelId);

      if (!session || !session.active) {
        return await interaction.reply({
          embeds: [errorEmbed(
            'No Active Game',
            'There is no active spelling bee game in this channel!'
          )],
          ephemeral: true
        });
      }

      // Handle different button actions
      switch (interaction.customId) {
        case 'spelling_hint':
          await handleHint(interaction, session);
          break;

        case 'spelling_progress':
          await handleProgress(interaction, session);
          break;

        case 'spelling_end':
          await handleEndGame(interaction, session);
          break;

        default:
          await interaction.reply({
            content: 'Unknown button action!',
            ephemeral: true
          });
      }

    } catch (error) {
      console.error('Error handling button interaction:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [errorEmbed(
            'Button Error',
            'An error occurred while processing your request.'
          )],
          ephemeral: true
        }).catch(console.error);
      }
    }
  },
};

/**
 * Handle hint button - show a random unfound word
 */
async function handleHint(interaction, session) {
  const foundWords = session.foundWords || [];
  const allWords = session.allWords || [];

  // Get unfound words
  const unfoundWords = allWords.filter(word =>
    !foundWords.includes(word.toLowerCase())
  );

  if (unfoundWords.length === 0) {
    return await interaction.reply({
      embeds: [createEmbed({
        title: '🎉 All Words Found!',
        description: 'You\'ve found all the words! Great job!',
        color: 'success'
      })],
      ephemeral: true
    });
  }

  // Pick a random word (favor shorter words for hints)
  const shortWords = unfoundWords.filter(w => w.length <= 6);
  const hintWords = shortWords.length > 0 ? shortWords : unfoundWords;
  const randomWord = hintWords[Math.floor(Math.random() * hintWords.length)];

  // Create hint (show first and last letter, hide middle)
  let hint;
  if (randomWord.length <= 4) {
    hint = randomWord[0] + '_'.repeat(randomWord.length - 2) + randomWord[randomWord.length - 1];
  } else {
    // For longer words, show first 2 and last letter
    hint = randomWord.substring(0, 2) + '_'.repeat(randomWord.length - 3) + randomWord[randomWord.length - 1];
  }

  const hintEmbed = createEmbed({
    title: '💡 Hint',
    description: `Try finding this ${randomWord.length}-letter word: \`${hint}\``,
    color: 'info',
    timestamp: true
  });

  await interaction.reply({
    embeds: [hintEmbed],
    ephemeral: true
  });
}

/**
 * Handle progress button - show detailed game progress
 */
async function handleProgress(interaction, session) {
  const foundWords = session.foundWords || [];
  const allWords = session.allWords || [];
  const points = session.points || 0;

  // Calculate stats
  const completionPercentage = allWords.length > 0
    ? Math.round((foundWords.length / allWords.length) * 100)
    : 0;

  const remainingTime = getRemainingTime(session);
  const timeElapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);

  // Group found words by length
  const wordsByLength = {};
  foundWords.forEach(word => {
    const len = word.length;
    if (!wordsByLength[len]) wordsByLength[len] = [];
    wordsByLength[len].push(word);
  });

  // Create progress display
  let wordsDisplay = '';
  Object.keys(wordsByLength).sort((a, b) => a - b).forEach(length => {
    const words = wordsByLength[length];
    wordsDisplay += `**${length} letters (${words.length}):** ${words.join(', ')}\n`;
  });

  if (!wordsDisplay) {
    wordsDisplay = '_No words found yet!_';
  }

  const progressEmbed = new EmbedBuilder()
    .setTitle('📊 Game Progress')
    .setColor(config.colors.info)
    .addFields(
      {
        name: '✅ Words Found',
        value: `${foundWords.length} / ${allWords.length} (${completionPercentage}%)`,
        inline: true
      },
      {
        name: '⭐ Current Points',
        value: points.toLocaleString(),
        inline: true
      },
      {
        name: '⏱️ Time',
        value: `${formatTime(timeElapsed)} elapsed\n${formatTime(remainingTime)} remaining`,
        inline: true
      },
      {
        name: '📝 Found Words',
        value: wordsDisplay.length > 1024 ? wordsDisplay.substring(0, 1021) + '...' : wordsDisplay,
        inline: false
      }
    )
    .setFooter({ text: `Letters: ${session.letters}` })
    .setTimestamp();

  await interaction.reply({
    embeds: [progressEmbed],
    ephemeral: true
  });
}

/**
 * Handle end game button - only starter or admin can end
 */
async function handleEndGame(interaction, session) {
  // Check if user is the game starter or has admin permissions
  const isStarter = interaction.user.id === session.userId;
  const isAdmin = interaction.member.permissions.has('Administrator');

  if (!isStarter && !isAdmin) {
    return await interaction.reply({
      embeds: [errorEmbed(
        'Permission Denied',
        'Only the game starter or admins can end the game!'
      )],
      ephemeral: true
    });
  }

  // Confirm end game
  const foundWords = session.foundWords || [];
  const allWords = session.allWords || [];
  const points = session.points || 0;

  const confirmEmbed = createEmbed({
    title: '⚠️ End Game?',
    description: `Are you sure you want to end the game?\n\n**Progress:** ${foundWords.length}/${allWords.length} words (${points} points)`,
    color: 'warning'
  });

  // For now, just end immediately (could add confirmation buttons in future)
  await interaction.reply({
    embeds: [confirmEmbed],
    ephemeral: true
  });

  // End the game after short delay
  setTimeout(async () => {
    await endGameNow(interaction.channel, session);
  }, 2000);
}

/**
 * End game immediately and post summary
 */
async function endGameNow(channel, session) {
  try {
    const { isUsingJSON, JSONPlayer, JSONSession } = require('../database/db');
    const Player = require('../database/models/Player');

    // Mark session as ended
    if (isUsingJSON()) {
      await JSONSession.updateOne(session._id, {
        active: false,
        endTime: new Date().toISOString()
      });
    } else {
      const dbSession = await Session.findById(session._id);
      if (dbSession) {
        dbSession.active = false;
        dbSession.endTime = new Date();
        await dbSession.save();
      }
    }

    // Update player stats
    const wordsFound = (session.foundWords || []).length;
    const points = session.points || 0;
    const completed = wordsFound === session.allWords.length;

    if (isUsingJSON()) {
      const player = await JSONPlayer.getOrCreate(session.userId, session.username);
      await JSONPlayer.updateOne(session.userId, {
        gamesPlayed: (player.gamesPlayed || 0) + 1,
        gamesWon: (player.gamesWon || 0) + (completed ? 1 : 0),
        totalPoints: (player.totalPoints || 0) + points,
        totalWordsFound: (player.totalWordsFound || 0) + wordsFound,
        bestScore: Math.max(player.bestScore || 0, points),
        lastPlayed: new Date().toISOString()
      });
    } else {
      const player = await Player.getOrCreate(session.userId, session.username);
      player.addGameResult(wordsFound, points, completed);
      await player.save();
    }

    // Post summary
    const completionPercentage = Math.round((wordsFound / session.allWords.length) * 100);

    const summaryEmbed = createEmbed({
      title: '🛑 Game Ended',
      description: `**${session.username}** ended the spelling bee game.`,
      color: 'warning',
      fields: [
        {
          name: '📊 Final Score',
          value: `**${points} points**`,
          inline: true
        },
        {
          name: '✅ Words Found',
          value: `${wordsFound} / ${session.allWords.length} (${completionPercentage}%)`,
          inline: true
        }
      ],
      timestamp: true
    });

    // Show some missed words
    const missedWords = session.allWords.filter(w =>
      !(session.foundWords || []).includes(w.toLowerCase())
    );

    if (missedWords.length > 0) {
      const displayWords = missedWords.slice(0, 10).join(', ');
      const extraCount = missedWords.length > 10 ? ` (+${missedWords.length - 10} more)` : '';

      summaryEmbed.addFields({
        name: '💭 Some Missed Words',
        value: displayWords + extraCount,
        inline: false
      });
    }

    await channel.send({ embeds: [summaryEmbed] });

  } catch (error) {
    console.error('Error ending game:', error);
  }
}

/**
 * Get remaining time in seconds
 */
function getRemainingTime(session) {
  const now = Date.now();
  const startTime = new Date(session.startTime).getTime();
  const elapsed = (now - startTime) / 1000;
  const remaining = Math.max(0, session.timeLimit - elapsed);
  return Math.round(remaining);
}

/**
 * Format seconds to readable time
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
