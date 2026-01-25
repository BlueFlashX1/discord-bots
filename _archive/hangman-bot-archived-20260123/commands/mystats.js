const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const config = require('../config.json');
const WeeklyReset = require('../utils/weeklyReset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('View your hangman statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another user\'s stats')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const { Player } = getDatabase();

      // Get player
      let player;

      if (Player.findOne) {
        player = await Player.findOne({ userId: targetUser.id });
      } else if (Player.players) {
        player = Player.players[targetUser.id];
      }

      if (!player) {
        await interaction.editReply({
          content: targetUser.id === interaction.user.id
            ? '📭 You haven\'t played any games yet!'
            : `📭 ${targetUser.username} hasn't played any games yet!`
        });
        return;
      }

      // Check weekly reset
      if (player.checkWeeklyReset) {
        await player.checkWeeklyReset();
      } else if (Player.checkWeeklyReset) {
        await Player.checkWeeklyReset(player.userId);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${player.username}'s Statistics`)
        .setColor(config.colors.info)
        .setThumbnail(targetUser.displayAvatarURL());

      // Weekly stats
      embed.addFields({
        name: '🏆 Weekly Stats',
        value:
          `**Points:** ${player.weeklyPoints}\n` +
          `**Rank:** ${await this.getWeeklyRank(player.userId, Player)}`,
        inline: true
      });

      // All-time stats
      const winRate = player.gamesPlayed > 0
        ? (player.gamesWon / player.gamesPlayed * 100).toFixed(1)
        : 0;

      const accuracy = player.lettersGuessed > 0
        ? (player.correctGuesses / player.lettersGuessed * 100).toFixed(1)
        : 0;

      embed.addFields({
        name: '💎 All-Time Stats',
        value:
          `**Total Points:** ${player.totalPoints}\n` +
          `**Games Played:** ${player.gamesPlayed}\n` +
          `**Games Won:** ${player.gamesWon}\n` +
          `**Win Rate:** ${winRate}%`,
        inline: true
      });

      // Accuracy
      embed.addFields({
        name: '🎯 Accuracy',
        value:
          `**Letters Guessed:** ${player.lettersGuessed}\n` +
          `**Correct Guesses:** ${player.correctGuesses}\n` +
          `**Accuracy:** ${accuracy}%`,
        inline: true
      });

      // Active cosmetics
      const cosmetics = [];
      if (player.activePrefix) {
        cosmetics.push(`Prefix: ${this.getPrefixName(player.activePrefix)}`);
      }
      if (player.activeTheme) {
        cosmetics.push(`Theme: ${this.getThemeName(player.activeTheme)}`);
      }

      if (cosmetics.length > 0) {
        embed.addFields({
          name: '⭐ Active Cosmetics',
          value: cosmetics.join('\n'),
          inline: false
        });
      }

      // Shop inventory
      if (player.shopItems && player.shopItems.length > 0) {
        embed.addFields({
          name: '🎒 Inventory',
          value: `${player.shopItems.length} item(s) owned`,
          inline: true
        });
      }

      // Time until weekly reset
      const weeklyReset = new WeeklyReset(Player);
      const timeString = weeklyReset.formatTimeUntilReset();

      embed.setFooter({ text: `Weekly points reset in ${timeString}` });

      // Member since
      if (player.createdAt) {
        embed.setTimestamp(new Date(player.createdAt));
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in mystats command:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`
      });
    }
  },

  async getWeeklyRank(userId, Player) {
    let allPlayers;

    if (Player.find) {
      allPlayers = await Player.find({ weeklyPoints: { $gt: 0 } })
        .sort({ weeklyPoints: -1 });
    } else if (Player.players) {
      allPlayers = Object.values(Player.players)
        .filter(p => p.weeklyPoints > 0)
        .sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    }

    if (!allPlayers) return 'Unranked';

    const rank = allPlayers.findIndex(p => p.userId === userId) + 1;

    return rank > 0 ? `#${rank}` : 'Unranked';
  },

  getPrefixName(prefixId) {
    const prefixes = {
      fire_prefix: '🔥 Fire',
      star_prefix: '⭐ Star',
      crown_prefix: '👑 Crown'
    };
    return prefixes[prefixId] || prefixId;
  },

  getThemeName(themeId) {
    const themes = {
      dark_theme: '🌑 Dark',
      gold_theme: '✨ Gold'
    };
    return themes[themeId] || themeId;
  }
};
