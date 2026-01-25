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
        // Show top 5 error types with counts and percentages
        const errorText = errorStats
          .slice(0, 5)
          .map((e, index) => {
            // Use emojis to indicate severity/dominance
            let emoji = '⚪';
            if (e.isDominant) {
              emoji = '🔴'; // Dominant error type (>40%)
            } else if (e.isSignificant) {
              emoji = '🟠'; // Significant error type (>20%)
            } else if (index < 3) {
              emoji = '🟡'; // Top 3 errors
            }
            return `${emoji} **${e.type}**: ${e.count} (${e.percentage}%)`;
          })
          .join('\n');
        
        // Add trend analysis if we have enough data
        const totalErrors = errorStats.reduce((sum, e) => sum + e.count, 0);
        let trendNote = '';
        if (totalErrors >= 10) {
          const topError = errorStats[0];
          const topErrorPercentage = parseFloat(topError.percentage);
          
          if (topError.isDominant) {
            trendNote = `\n\n⚠️ **Primary Focus**: ${topError.type} errors account for ${topErrorPercentage.toFixed(1)}% of all errors. This is your main area to improve!`;
          } else if (topError.isSignificant && errorStats.length > 1) {
            const secondError = errorStats[1];
            const secondPercentage = parseFloat(secondError.percentage);
            trendNote = `\n\n📊 **Top Issues**: ${topError.type} (${topErrorPercentage.toFixed(1)}%) and ${secondError.type} (${secondPercentage.toFixed(1)}%) are your main error types.`;
          } else if (totalErrors >= 20) {
            // Show distribution if we have enough data
            const top3Total = errorStats.slice(0, 3).reduce((sum, e) => sum + parseFloat(e.percentage), 0);
            trendNote = `\n\n📈 **Distribution**: Top 3 error types account for ${top3Total.toFixed(1)}% of all errors.`;
          }
        }
        
        // Discord field value limit: 1024 characters
        const { EMBED_LIMITS } = require('../utils/embedBuilder');
        const fullText = errorText + trendNote;
        embed.addFields({
          name: `Common Errors (${totalErrors} total instances)`,
          value:
            fullText.length > EMBED_LIMITS.fieldValue
              ? fullText.substring(0, EMBED_LIMITS.fieldValue - 3) + '...'
              : fullText,
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
