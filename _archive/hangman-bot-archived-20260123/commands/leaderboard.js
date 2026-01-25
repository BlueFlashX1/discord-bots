const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const config = require('../config.json');
const WeeklyReset = require('../utils/weeklyReset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the weekly hangman leaderboard')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Leaderboard type')
        .addChoices(
          { name: 'Weekly Points', value: 'weekly' },
          { name: 'Total Points', value: 'total' },
          { name: 'Win Rate', value: 'winrate' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const type = interaction.options.getString('type') || 'weekly';
      const { Player } = getDatabase();

      let players;
      let sortField;
      let title;
      let description;

      if (type === 'weekly') {
        // Weekly points leaderboard (with auto-reset)
        if (Player.getWeeklyLeaderboard) {
          players = await Player.getWeeklyLeaderboard(10);
        } else if (Player.players) {
          // JSON mode
          const weeklyReset = new WeeklyReset(Player);
          await weeklyReset.checkAndReset();

          players = Object.values(Player.players)
            .filter(p => p.weeklyPoints > 0)
            .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
            .slice(0, 10);
        }

        sortField = 'weeklyPoints';
        title = '🏆 Weekly Leaderboard';
        description = 'Top players this week (resets every Monday)';

      } else if (type === 'total') {
        // Total points leaderboard
        if (Player.find) {
          players = await Player.find({ totalPoints: { $gt: 0 } })
            .sort({ totalPoints: -1 })
            .limit(10);
        } else if (Player.players) {
          players = Object.values(Player.players)
            .filter(p => p.totalPoints > 0)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 10);
        }

        sortField = 'totalPoints';
        title = '💎 All-Time Leaderboard';
        description = 'Top players by total points earned';

      } else if (type === 'winrate') {
        // Win rate leaderboard
        if (Player.find) {
          players = await Player.find({ gamesPlayed: { $gte: 5 } })
            .sort({ gamesWon: -1 })
            .limit(10);
        } else if (Player.players) {
          players = Object.values(Player.players)
            .filter(p => p.gamesPlayed >= 5)
            .sort((a, b) => {
              const aRate = a.gamesWon / a.gamesPlayed;
              const bRate = b.gamesWon / b.gamesPlayed;
              return bRate - aRate;
            })
            .slice(0, 10);
        }

        // Sort by win rate
        players = players.sort((a, b) => {
          const aRate = a.gamesPlayed > 0 ? a.gamesWon / a.gamesPlayed : 0;
          const bRate = b.gamesPlayed > 0 ? b.gamesWon / b.gamesPlayed : 0;
          return bRate - aRate;
        });

        sortField = 'winRate';
        title = '🎯 Win Rate Leaderboard';
        description = 'Top players by win rate (minimum 5 games)';
      }

      if (!players || players.length === 0) {
        await interaction.editReply({
          content: '📭 No players on the leaderboard yet. Play some games!'
        });
        return;
      }

      const embed = new EmbedBoard()
        .setTitle(title)
        .setDescription(description)
        .setColor(config.colors.success);

      // Add time until reset for weekly leaderboard
      if (type === 'weekly') {
        const weeklyReset = new WeeklyReset(Player);
        const timeString = weeklyReset.formatTimeUntilReset();

        embed.setFooter({ text: `Resets in ${timeString}` });
      }

      // Build leaderboard
      let leaderboardText = '';

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const rank = i + 1;
        const medal = this.getMedal(rank);

        let value;
        if (type === 'weekly') {
          value = `${player.weeklyPoints} points`;
        } else if (type === 'total') {
          value = `${player.totalPoints} points`;
        } else if (type === 'winrate') {
          const winRate = player.gamesPlayed > 0
            ? (player.gamesWon / player.gamesPlayed * 100).toFixed(1)
            : 0;
          value = `${winRate}% (${player.gamesWon}/${player.gamesPlayed})`;
        }

        // Get prefix if they have one active
        const prefix = player.activePrefix ? this.getPrefixEmoji(player.activePrefix) : '';

        leaderboardText += `${medal} **${rank}.** ${prefix}${player.username} - ${value}\n`;
      }

      embed.addFields({
        name: 'Rankings',
        value: leaderboardText || 'No players yet',
        inline: false
      });

      // Add user's rank if not in top 10
      const userRank = await this.getUserRank(interaction.user.id, Player, type);

      if (userRank && userRank.rank > 10) {
        embed.addFields({
          name: 'Your Rank',
          value: `**${userRank.rank}.** ${userRank.username} - ${userRank.value}`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`
      });
    }
  },

  getMedal(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏅';
  },

  getPrefixEmoji(prefixId) {
    const prefixes = {
      fire_prefix: '🔥',
      star_prefix: '⭐',
      crown_prefix: '👑'
    };
    return prefixes[prefixId] || '';
  },

  async getUserRank(userId, Player, type) {
    let allPlayers;

    if (Player.find) {
      if (type === 'weekly') {
        allPlayers = await Player.find({ weeklyPoints: { $gt: 0 } })
          .sort({ weeklyPoints: -1 });
      } else if (type === 'total') {
        allPlayers = await Player.find({ totalPoints: { $gt: 0 } })
          .sort({ totalPoints: -1 });
      } else if (type === 'winrate') {
        allPlayers = await Player.find({ gamesPlayed: { $gte: 5 } });
        allPlayers = allPlayers.sort((a, b) => {
          const aRate = a.gamesWon / a.gamesPlayed;
          const bRate = b.gamesWon / b.gamesPlayed;
          return bRate - aRate;
        });
      }
    } else if (Player.players) {
      allPlayers = Object.values(Player.players);

      if (type === 'weekly') {
        allPlayers = allPlayers
          .filter(p => p.weeklyPoints > 0)
          .sort((a, b) => b.weeklyPoints - a.weeklyPoints);
      } else if (type === 'total') {
        allPlayers = allPlayers
          .filter(p => p.totalPoints > 0)
          .sort((a, b) => b.totalPoints - a.totalPoints);
      } else if (type === 'winrate') {
        allPlayers = allPlayers
          .filter(p => p.gamesPlayed >= 5)
          .sort((a, b) => {
            const aRate = a.gamesWon / a.gamesPlayed;
            const bRate = b.gamesWon / b.gamesPlayed;
            return bRate - aRate;
          });
      }
    }

    if (!allPlayers) return null;

    const rank = allPlayers.findIndex(p => p.userId === userId) + 1;

    if (rank === 0) return null;

    const player = allPlayers[rank - 1];

    let value;
    if (type === 'weekly') {
      value = `${player.weeklyPoints} points`;
    } else if (type === 'total') {
      value = `${player.totalPoints} points`;
    } else if (type === 'winrate') {
      const winRate = (player.gamesWon / player.gamesPlayed * 100).toFixed(1);
      value = `${winRate}% (${player.gamesWon}/${player.gamesPlayed})`;
    }

    return {
      rank,
      username: player.username,
      value
    };
  }
};
