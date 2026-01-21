const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mastery')
    .setDescription('Check your Codewars mastery progress and get difficulty recommendations'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userPreferences = interaction.client.userPreferences;
    const codewarsProgress = interaction.client.codewarsProgress;

    const prefs = userPreferences.getUserPreferences(interaction.user.id);

    if (!prefs.codewarsUsername) {
      return interaction.editReply({
        content:
          '❌ No Codewars username linked. Use `/settings codewars username:your_username` to link your account.',
      });
    }

    try {
      const mastery = await codewarsProgress.analyzeMastery(prefs.codewarsUsername);

      const recommendation = mastery.recommendation;
      const profile = mastery.profile;

      const difficultyEmoji = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴',
      };

      const embed = new EmbedBuilder()
        .setTitle('📈 Your Mastery Progress')
        .setDescription(`**Codewars Username:** ${prefs.codewarsUsername}`)
        .addFields(
          {
            name: '🏆 Overall Stats',
            value:
              `**Rank:** ${profile.rank?.name || 'N/A'} (${profile.rank?.color || 'N/A'})\n` +
              `**Honor:** ${profile.honor.toLocaleString()}\n` +
              `**Total Completed:** ${mastery.totalCompleted} kata`,
            inline: true,
          },
          {
            name: '📊 Current Level',
            value: `${difficultyEmoji[recommendation.current] || '📝'} ${recommendation.current.toUpperCase()}`,
            inline: true,
          },
          {
            name: '🎯 Recommendation',
            value: `${difficultyEmoji[recommendation.recommended] || '📝'} ${recommendation.recommended.toUpperCase()}`,
            inline: true,
          },
          {
            name: '💡 Why?',
            value: recommendation.reason,
            inline: false,
          }
        )
        .setColor(
          recommendation.recommended === 'hard'
            ? 0xff0000
            : recommendation.recommended === 'medium'
              ? 0xffaa00
              : 0x00ff00
        )
        .setFooter({ text: 'Update your difficulty preference with /settings difficulty' })
        .setTimestamp();

      // Add language-specific ranks if available
      if (Object.keys(profile.languages).length > 0) {
        const languageRanks = Object.entries(profile.languages)
          .slice(0, 5)
          .map(([lang, rank]) => `**${lang}:** ${rank.name}`)
          .join('\n');

        embed.addFields({
          name: '🌐 Language Ranks',
          value: languageRanks || 'N/A',
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching mastery:', error);
      return interaction.editReply({
        content: `❌ Error fetching mastery data: ${error.message}\n\nPlease check that your Codewars username is correct.`,
      });
    }
  },
};
