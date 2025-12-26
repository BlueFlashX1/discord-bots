const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const { PointsSystem, AchievementsSystem } = require('../gamification/systems');

const analysisEngine = new AnalysisEngine();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Check grammar of a message manually')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The text to check')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString('text');
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);

      const result = await analysisEngine.analyzeMessage(text, interaction.user.id);

      if (result.error) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }

      const formatted = analysisEngine.formatErrorMessage(result);
      const embed = require('../utils/embedBuilder').createEmbed({
        title: '✍️ Grammar Check Results',
        description: formatted.message,
        color: result.hasErrors ? 'error' : 'success'
      });

      if (!result.hasErrors) {
        const bonus = await PointsSystem.awardQualityBonus(user, text.length);
        if (bonus) {
          embed.addFields({
            name: '🎁 Quality Bonus',
            value: `+${bonus.bonusPoints} points, +${bonus.bonusXp} XP`,
            inline: false
          });
        }
      } else if (formatted.correctedText) {
        embed.addFields({
          name: '✅ Corrected Version',
          value: formatted.correctedText.substring(0, 1000),
          inline: false
        });
      }

      embed.setFooter({ text: `Quality Score: ${result.qualityScore}/100` });

      await interaction.editReply({ embeds: [embed] });

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
      await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
  }
};
