const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('List all active hangman games'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { Game } = getDatabase();

      // Get all active games
      let games;

      if (Game.find) {
        // MongoDB
        games = await Game.find({
          state: { $in: ['waiting', 'active'] }
        }).sort({ createdAt: -1 }).limit(10);
      } else if (Game.games) {
        // JSON mode
        games = Object.values(Game.games)
          .filter(g => g.state === 'waiting' || g.state === 'active')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10);
      } else {
        throw new Error('Unable to fetch games');
      }

      if (!games || games.length === 0) {
        await interaction.editReply({
          content: '📭 No active games right now. Start one with `/hangman start`!'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 Active Hangman Games')
        .setDescription(`Found ${games.length} active game(s)`)
        .setColor(config.colors.info);

      for (const game of games) {
        const channel = interaction.guild.channels.cache.get(game.channelId);
        const channelName = channel ? `#${channel.name}` : 'Unknown channel';

        const playerList = game.players.map(p => p.username).join(', ');
        const wordDisplay = game.state === 'waiting'
          ? `\`${'_'.repeat(game.word.length)}\` (${game.word.length} letters)`
          : this.getDisplay(game);

        const statusEmoji = game.state === 'waiting' ? '⏳' : '▶️';
        const status = game.state === 'waiting' ? 'Waiting for players' : 'In progress';

        embed.addFields({
          name: `${statusEmoji} ${channelName}`,
          value:
            `**Status:** ${status}\n` +
            `**Starter:** ${game.starterUsername}\n` +
            `**Players:** ${playerList}\n` +
            `**Word:** ${wordDisplay}\n` +
            `**Mistakes:** ${game.mistakeCount}/${game.maxMistakes}`,
          inline: false
        });
      }

      embed.setFooter({ text: 'Join a game by going to that channel!' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in games command:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`
      });
    }
  },

  getDisplay(game) {
    return game.word
      .split('')
      .map(char => {
        if (char === ' ') return ' ';
        if (!/[a-zA-Z]/.test(char)) return char;
        return game.guessedLetters.includes(char.toLowerCase()) ? char : '_';
      })
      .join(' ');
  }
};
