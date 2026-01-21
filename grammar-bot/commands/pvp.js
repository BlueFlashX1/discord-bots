const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { PvPSystem } = require('../gamification/systems');
const AIGrammar = require('../services/aiGrammar');
const config = require('../config.json');

// Store active battles temporarily (in production, use Redis or database)
const activeBattles = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvp')
    .setDescription('Challenge another user to a grammar battle')
    .addUserOption((option) =>
      option.setName('opponent').setDescription('User to challenge').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('Your text for the battle')
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const opponent = interaction.options.getUser('opponent');
    const challengerText = interaction.options.getString('text');

    // Validation
    if (opponent.bot) {
      await interaction.editReply({ content: 'Cannot challenge bots!' });
      return;
    }

    if (opponent.id === interaction.user.id) {
      await interaction.editReply({ content: 'Cannot challenge yourself!' });
      return;
    }

    const { User } = getDatabase();

    try {
      const challenger = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const opponentUser = await User.findOrCreate(opponent.id, opponent.username);

      // Check if opponent has HP
      if (opponentUser.hp <= 0) {
        await interaction.editReply({
          content: `${opponent.username} has no HP left and cannot accept challenges!`,
        });
        return;
      }

      // Check grammar of challenger's text
      const aiGrammar = new AIGrammar();
      const challengerResult = await aiGrammar.checkGrammar(challengerText);

      // Create battle request
      const battleId = `${interaction.user.id}_${opponent.id}_${Date.now()}`;
      activeBattles.set(battleId, {
        challenger: {
          user: challenger,
          text: challengerText,
          result: challengerResult,
        },
        opponentId: opponent.id,
        opponentUsername: opponent.username,
        createdAt: Date.now(),
      });

      // Create challenge embed
      const embed = new EmbedBuilder()
        .setTitle('Grammar Battle Challenge!')
        .setColor(config.colors.warning)
        .setDescription(
          `**${interaction.user.username}** has challenged **${opponent.username}** to a grammar battle!\n\n` +
            `${opponent}, respond with \`/pvp-accept ${battleId}\` within 2 minutes to accept!`
        )
        .addFields(
          {
            name: "Challenger's Text",
            value: challengerText.substring(0, 200) + (challengerText.length > 200 ? '...' : ''),
            inline: false,
          },
          { name: 'Time Limit', value: '2 minutes', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Auto-expire battle after 2 minutes
      setTimeout(() => {
        if (activeBattles.has(battleId)) {
          activeBattles.delete(battleId);
        }
      }, 120000);
    } catch (error) {
      console.error('Error in pvp command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};

module.exports.activeBattles = activeBattles;
