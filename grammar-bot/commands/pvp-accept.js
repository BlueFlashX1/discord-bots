const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { PvPSystem } = require('../gamification/systems');
const AIGrammar = require('../services/aiGrammar');
const config = require('../config.json');
const { activeBattles } = require('./pvp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvp-accept')
    .setDescription('Accept a grammar battle challenge')
    .addStringOption((option) =>
      option.setName('battle_id').setDescription('Battle ID from the challenge').setRequired(true)
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

    const battleId = interaction.options.getString('battle_id');
    const opponentText = interaction.options.getString('text');

    const battle = activeBattles.get(battleId);

    if (!battle) {
      await interaction.editReply({
        content: 'Battle not found or expired! Challenges expire after 2 minutes.',
      });
      return;
    }

    // Verify this user is the opponent
    if (interaction.user.id !== battle.opponentId) {
      await interaction.editReply({
        content: 'This battle challenge is not for you!',
      });
      return;
    }

    const { User } = getDatabase();

    try {
      // Get opponent user from database
      const opponentUser = await User.findOrCreate(interaction.user.id, interaction.user.username);

      // Check if opponent has HP
      if (opponentUser.hp <= 0) {
        await interaction.editReply({
          content: 'You have no HP left and cannot accept challenges!',
        });
        activeBattles.delete(battleId);
        return;
      }

      // Check grammar of opponent's text
      const aiGrammar = new AIGrammar();
      const opponentResult = await aiGrammar.checkGrammar(opponentText);

      // Calculate scores (fewer errors = higher score)
      const challengerScore = Math.max(0, 100 - battle.challenger.result.errors.length * 10);
      const opponentScore = Math.max(0, 100 - opponentResult.errors.length * 10);

      // Resolve battle
      const result = await PvPSystem.resolveBattle(
        battle.challenger.user,
        opponentUser,
        challengerScore,
        opponentScore
      );

      // Create result embed
      const embed = new EmbedBuilder()
        .setTitle('PvP Battle Results')
        .setColor(config.colors.info)
        .addFields(
          {
            name: `${battle.challenger.user.username} (Level ${battle.challenger.user.level || 1})`,
            value: `Score: ${challengerScore}`,
            inline: true,
          },
          {
            name: `${interaction.user.username} (Level ${opponentUser.level || 1})`,
            value: `Score: ${opponentScore}`,
            inline: true,
          }
        )
        .setTimestamp();

      // Determine winner
      let resultText;
      if (challengerScore > opponentScore) {
        resultText = `**${battle.challenger.user.username} wins!**`;
        embed.setColor(config.colors.success);
      } else if (opponentScore > challengerScore) {
        resultText = `**${interaction.user.username} wins!**`;
        embed.setColor(config.colors.success);
      } else {
        resultText = "**It's a draw!**";
        embed.setColor(config.colors.warning);
      }

      // Discord description limit: 4096 characters
      const { EMBED_LIMITS } = require('../utils/embedBuilder');
      embed.setDescription(
        resultText.length > EMBED_LIMITS.description
          ? resultText.substring(0, EMBED_LIMITS.description - 3) + '...'
          : resultText
      );

      // Add text previews
      embed.addFields(
        {
          name: "Challenger's Text",
          value:
            battle.challenger.text.substring(0, 200) +
            (battle.challenger.text.length > 200 ? '...' : ''),
          inline: false,
        },
        {
          name: 'Your Text',
          value: opponentText.substring(0, 200) + (opponentText.length > 200 ? '...' : ''),
          inline: false,
        }
      );

      await interaction.editReply({ embeds: [embed] });

      // Clean up battle
      activeBattles.delete(battleId);
    } catch (error) {
      console.error('Error in pvp-accept command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
      activeBattles.delete(battleId);
    }
  },
};
