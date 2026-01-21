const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your coding practice statistics'),

  async execute(interaction) {
    const progressService = interaction.client.progressService;
    const stats = progressService.getStats(interaction.user.id);

    const totalSolved = stats.solved.length;
    const totalAttempted = stats.attempted.length;
    const successRate = totalAttempted > 0 ? ((totalSolved / totalAttempted) * 100).toFixed(1) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${interaction.user.username}'s Coding Stats`)
      .setColor(0x5865f2)
      .addFields(
        {
          name: '🔥 Streak',
          value: `${stats.streak} days`,
          inline: true,
        },
        {
          name: '✅ Solved',
          value: `${totalSolved} problems`,
          inline: true,
        },
        {
          name: '📝 Attempted',
          value: `${totalAttempted} problems`,
          inline: true,
        },
        {
          name: '📈 Success Rate',
          value: `${successRate}%`,
          inline: true,
        },
        {
          name: '🟢 Easy',
          value: `${stats.stats.easy || 0}`,
          inline: true,
        },
        {
          name: '🟡 Medium',
          value: `${stats.stats.medium || 0}`,
          inline: true,
        },
        {
          name: '🔴 Hard',
          value: `${stats.stats.hard || 0}`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
