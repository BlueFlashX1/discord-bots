const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View grammar leaderboards')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Level', value: 'level' },
          { name: 'Accuracy', value: 'accuracy' },
          { name: 'Streak', value: 'streak' },
          { name: 'PvP Wins', value: 'pvp' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const leaderboardType = interaction.options.getString('type') || 'level';
    const { User } = getDatabase();

    try {
      let allUsers = await User.find();
      let users;
      let title;
      let emoji;

      switch (leaderboardType) {
        case 'accuracy':
          users = allUsers
            .filter((u) => (u.totalMessages || 0) >= 10)
            .sort((a, b) => {
              const aAccuracy = a.totalMessages > 0 ? (a.cleanMessages || 0) / a.totalMessages : 0;
              const bAccuracy = b.totalMessages > 0 ? (b.cleanMessages || 0) / b.totalMessages : 0;
              if (bAccuracy !== aAccuracy) return bAccuracy - aAccuracy;
              return (b.totalMessages || 0) - (a.totalMessages || 0);
            })
            .slice(0, 10);
          title = 'Top Grammar Accuracy';
          break;

        case 'streak':
          users = allUsers
            .sort((a, b) => {
              if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
              return (b.bestStreak || 0) - (a.bestStreak || 0);
            })
            .slice(0, 10);
          title = 'Longest Streaks';
          break;

        case 'pvp':
          users = allUsers
            .sort((a, b) => {
              if ((b.pvpWins || 0) !== (a.pvpWins || 0)) return (b.pvpWins || 0) - (a.pvpWins || 0);
              return (a.pvpLosses || 0) - (b.pvpLosses || 0);
            })
            .slice(0, 10);
          title = 'PvP Champions';
          break;

        case 'level':
        default:
          users = allUsers
            .sort((a, b) => {
              if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
              return (b.xp || 0) - (a.xp || 0);
            })
            .slice(0, 10);
          title = 'Top Levels';
          break;
      }

      const embed = new EmbedBuilder().setTitle(title).setColor(config.colors.info).setTimestamp();

      if (users.length === 0) {
        embed.setDescription('No users found on the leaderboard yet!');
      } else {
        const leaderboardText = users
          .map((user, index) => {
            const medal =
              index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

            let value;
            switch (leaderboardType) {
              case 'accuracy':
                const accuracy =
                  user.totalMessages > 0
                    ? Math.round((user.cleanMessages / user.totalMessages) * 100)
                    : 0;
                value = `${accuracy}% (${user.cleanMessages}/${user.totalMessages})`;
                break;
              case 'streak':
                value = `${user.streak} days (Best: ${user.bestStreak})`;
                break;
              case 'pvp':
                value = `${user.pvpWins}W - ${user.pvpLosses}L`;
                break;
              case 'level':
              default:
                value = `Level ${user.level} (${user.xp} XP)`;
                break;
            }

            return `${medal} **${user.username}** - ${value}`;
          })
          .join('\n');

        // Discord description limit: 4096 characters
        const { EMBED_LIMITS } = require('../utils/embedBuilder');
        embed.setDescription(
          leaderboardText.length > EMBED_LIMITS.description
            ? leaderboardText.substring(0, EMBED_LIMITS.description - 3) + '...'
            : leaderboardText
        );
      }

      // Find current user's rank
      const currentUser = await User.findOne({ userId: interaction.user.id });
      if (currentUser) {
        let rankedUsers;
        switch (leaderboardType) {
          case 'accuracy':
            rankedUsers = allUsers
              .filter((u) => (u.totalMessages || 0) >= 10)
              .sort((a, b) => {
                const aAccuracy =
                  a.totalMessages > 0 ? (a.cleanMessages || 0) / a.totalMessages : 0;
                const bAccuracy =
                  b.totalMessages > 0 ? (b.cleanMessages || 0) / b.totalMessages : 0;
                if (bAccuracy !== aAccuracy) return bAccuracy - aAccuracy;
                return (b.totalMessages || 0) - (a.totalMessages || 0);
              });
            break;
          case 'streak':
            rankedUsers = allUsers.sort((a, b) => {
              if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
              return (b.bestStreak || 0) - (a.bestStreak || 0);
            });
            break;
          case 'pvp':
            rankedUsers = allUsers.sort((a, b) => {
              if ((b.pvpWins || 0) !== (a.pvpWins || 0)) return (b.pvpWins || 0) - (a.pvpWins || 0);
              return (a.pvpLosses || 0) - (b.pvpLosses || 0);
            });
            break;
          case 'level':
          default:
            rankedUsers = allUsers.sort((a, b) => {
              if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
              return (b.xp || 0) - (a.xp || 0);
            });
            break;
        }

        const userRank = rankedUsers.findIndex((u) => u.userId === currentUser.userId) + 1;
        if (userRank > 0) {
          embed.setFooter({ text: `Your rank: #${userRank}` });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};
