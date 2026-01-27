const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get comprehensive VPS dashboard with all bot statuses'),
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const stats = await client.vpsMonitor.getDetailedStats();
      const botList = await client.vpsMonitor.getBotStatus();

      // Parse PM2 processes
      const processes = stats.pm2.processes;
      const botStatuses = processes
        .map((p) => {
          const status = p.pm2_env?.status === 'online' ? '🟢' : '🔴';
          const mem = (p.monit.memory / 1024 / 1024).toFixed(1);
          const cpu = p.monit.cpu.toFixed(1);
          return `${status} **${p.name}** - ${mem}MB / ${cpu}% CPU`;
        })
        .slice(0, 20); // Limit to 20 bots

      // Parse system info
      const memoryLines = stats.memory.split('\n');
      const memoryInfo = memoryLines[1]?.match(/\s+(\d+\.?\d*[GM]i?)\s+(\d+\.?\d*[GM]i?)\s+(\d+\.?\d*[GM]i?)/);
      const cpuMatch = stats.cpu.match(/%Cpu\(s\):\s+(\d+\.\d+)\s+us,\s+(\d+\.\d+)\s+sy,\s+(\d+\.\d+)\s+id/);
      const loadMatch = stats.load.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);

      const embed = new EmbedBuilder()
        .setTitle('📊 VPS Dashboard')
        .setColor(0x5865f2)
        .setDescription('Complete system and bot status overview')
        .addFields(
          {
            name: '🖥️ System Resources',
            value: `**Memory:** ${memoryInfo ? `${memoryInfo[2]} / ${memoryInfo[1]}` : 'N/A'}\n**CPU:** ${cpuMatch ? `${(100 - parseFloat(cpuMatch[3])).toFixed(1)}%` : 'N/A'}\n**Load:** ${loadMatch ? loadMatch[1] : 'N/A'}`,
            inline: true,
          },
          {
            name: '🤖 Bot Summary',
            value: `**Total Bots:** ${stats.pm2.processCount}\n**Total Memory:** ${stats.pm2.totalMemory.toFixed(1)} MB\n**Total CPU:** ${stats.pm2.totalCPU.toFixed(1)}%`,
            inline: true,
          },
          {
            name: '⏱️ Uptime',
            value: stats.uptime || 'Unknown',
            inline: true,
          },
          {
            name: '📋 Bot Statuses',
            value: botStatuses.length > 0 ? botStatuses.join('\n') : 'No bots running',
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Error fetching dashboard: ${error.message}`,
      });
    }
  },
};
