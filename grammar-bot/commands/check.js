const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const { PointsSystem, AchievementsSystem } = require('../gamification/systems');

const analysisEngine = new AnalysisEngine();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Check grammar of a message manually')
    .addStringOption((option) =>
      option.setName('text').setDescription('The text to check').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString('text');
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);

      const result = await analysisEngine.analyzeMessage(text, interaction.user.id);

      if (result.error) {
        await interaction.editReply({ content: `${result.error}` });
        return;
      }

      // Track message result
      await user.addMessageResult(
        result.hasErrors,
        result.errorCount || 0,
        result.errorTypes || []
      );

      const formatted = analysisEngine.formatErrorMessage(result);
      const { createEmbed, splitText, EMBED_LIMITS } = require('../utils/embedBuilder');
      const AIGrammarService = require('../services/aiGrammar');
      const aiGrammar = new AIGrammarService();

      // Generate roast if there are errors
      let roast = null;
      if (result.hasErrors && result.errors && result.errors.length > 0) {
        try {
          roast = await aiGrammar.generateRoast(text, result.errors, result.errorCount);
        } catch (error) {
          console.error('Error generating roast:', error);
        }
      }

      // Split description if needed
      const descriptionChunks = splitText(formatted.message, EMBED_LIMITS.description);
      const embeds = [];

      // Create first embed
      const firstEmbed = createEmbed({
        title: 'Grammar Check Results',
        description: descriptionChunks[0],
        color: result.hasErrors ? 'error' : 'success',
      });

      // Add roast if available
      if (roast) {
        firstEmbed.addFields({
          name: '🔥 Roast',
          value: roast.length > EMBED_LIMITS.fieldValue ? roast.substring(0, 1021) + '...' : roast,
          inline: false,
        });
      }

      if (!result.hasErrors) {
        const bonus = await PointsSystem.awardQualityBonus(user, text.length);
        if (bonus) {
          firstEmbed.addFields({
            name: 'Quality Bonus',
            value: `+${bonus.bonusPoints} points, +${bonus.bonusXp} XP`,
            inline: false,
          });
        }
      } else if (formatted.correctedText) {
        const correctedChunks = splitText(formatted.correctedText, EMBED_LIMITS.fieldValue);
        if (correctedChunks.length === 1) {
          firstEmbed.addFields({
            name: 'Corrected Version',
            value: correctedChunks[0],
            inline: false,
          });
        } else {
          firstEmbed.addFields({
            name: 'Corrected Version (Part 1)',
            value: correctedChunks[0],
            inline: false,
          });
        }
      }

      firstEmbed.setFooter({ text: `Quality Score: ${result.qualityScore}/100` });
      embeds.push(firstEmbed);

      // Add additional description chunks
      for (let i = 1; i < descriptionChunks.length; i++) {
        const additionalEmbed = createEmbed({
          title: `Grammar Check Results (Continued ${i + 1}/${descriptionChunks.length})`,
          description: descriptionChunks[i],
          color: result.hasErrors ? 'error' : 'success',
        });
        embeds.push(additionalEmbed);
      }

      // Add additional corrected text chunks
      if (formatted.correctedText && result.hasErrors) {
        const correctedChunks = splitText(formatted.correctedText, EMBED_LIMITS.fieldValue);
        for (let i = 1; i < correctedChunks.length; i++) {
          const additionalEmbed = createEmbed({
            title: `Corrected Version (Part ${i + 1}/${correctedChunks.length})`,
            description: correctedChunks[i],
            color: 'info',
          });
          embeds.push(additionalEmbed);
        }
      }

      // Discord allows up to 10 embeds per message
      const embedsToSend = embeds.slice(0, 10);
      await interaction.editReply({ embeds: embedsToSend });

      // If we have more than 10 embeds, send additional messages
      if (embeds.length > 10) {
        for (let i = 10; i < embeds.length; i += 10) {
          await interaction.followUp({ embeds: embeds.slice(i, i + 10) });
        }
      }

      // Check achievements
      const achievements = await AchievementsSystem.checkAchievements(user);
      if (achievements.length > 0) {
        for (const achievement of achievements) {
          const achEmbed = AchievementsSystem.createUnlockEmbed(achievement);
          await interaction.followUp({ embeds: [achEmbed] });
        }
      }
    } catch (error) {
      console.error('Error in check command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};
