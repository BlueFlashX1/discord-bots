const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const config = require('../config.json');

const analysisEngine = new AnalysisEngine();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View grammar statistics')
    .addUserOption((option) =>
      option.setName('user').setDescription("View another user's stats").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const { User } = getDatabase();

    try {
      const user = await User.findOne({ userId: targetUser.id });
      if (!user) {
        await interaction.editReply({ content: 'No stats found for this user.' });
        return;
      }

      const improvement = await analysisEngine.analyzeImprovement(user);
      const errorStats = analysisEngine.getErrorTypeStats(user);

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Grammar Stats`)
        .setColor(config.colors.info)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Level', value: `${user.level || 1}`, inline: true },
          { name: 'Points', value: `${user.points || 100}`, inline: true },
          { name: 'HP', value: `${user.hp || 100}/${user.maxHp || 100}`, inline: true },
          {
            name: 'Accuracy',
            value: `${improvement.accuracy}% (Grade: ${improvement.grade})`,
            inline: true,
          },
          { name: 'Streak', value: `${user.streak || 0} days (Best: ${user.bestStreak || 0})`, inline: true },
          {
            name: 'Messages',
            value: `${user.totalMessages || 0} total, ${user.cleanMessages || 0} clean`,
            inline: true,
          }
        );

      if (errorStats && errorStats.length > 0) {
        const errorText = errorStats
          .slice(0, 5)
          .map((e) => `${e.type}: ${e.count} (${e.percentage}%)`)
          .join('\n');
        // Discord field value limit: 1024 characters
        const { EMBED_LIMITS } = require('../utils/embedBuilder');
        embed.addFields({
          name: 'Common Errors',
          value:
            errorText.length > EMBED_LIMITS.fieldValue
              ? errorText.substring(0, EMBED_LIMITS.fieldValue - 3) + '...'
              : errorText,
          inline: false,
        });
      }

      embed.addFields(
        { name: 'Trend', value: improvement.improvement || 'Not enough data', inline: true },
        { name: 'Quality Bonuses', value: `${user.qualityBonusesEarned || 0}`, inline: true },
        { name: 'PvP Record', value: `${user.pvpWins || 0}W - ${user.pvpLosses || 0}L`, inline: true }
      );

      if (user.title || user.activeCosmetics?.title) {
        const title = user.title || user.activeCosmetics?.title || '';
        embed.setFooter({ text: `Title: ${title}` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in stats command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};
