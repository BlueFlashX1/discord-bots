const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resources')
    .setDescription('Get detailed resource usage for all bots'),
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const stats = await client.vpsMonitor.getDetailedStats();
      const processes = stats.pm2.processes;

      // Sort by memory usage
      const sortedBots = processes
        .sort((a, b) => b.monit.memory - a.monit.memory)
        .slice(0, 15); // Top 15

      const botList = sortedBots.map((p, index) => {
        const mem = (p.monit.memory / 1024 / 1024).toFixed(1);
        const cpu = p.monit.cpu.toFixed(1);
        const status = p.pm2_env?.status === 'online' ? '🟢' : '🔴';
        return `${index + 1}. ${status} **${p.name}**\n   💾 ${mem}MB | ⚡ ${cpu}% CPU`;
      });

      const embed = new EmbedBuilder()
        .setTitle('📈 Resource Usage (Top 15)')
        .setColor(0xff9900)
        .setDescription(botList.join('\n\n'))
        .addFields({
          name: '📊 Totals',
          value: `**Bots:** ${stats.pm2.processCount}\n**Memory:** ${stats.pm2.totalMemory.toFixed(1)} MB\n**CPU:** ${stats.pm2.totalCPU.toFixed(1)}%`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Error fetching resources: ${error.message}`,
      });
    }
  },
};
