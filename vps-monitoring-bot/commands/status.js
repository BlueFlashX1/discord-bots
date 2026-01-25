const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get VPS system status and resource usage'),
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const stats = await client.vpsMonitor.getDetailedStats();

      // Parse memory info
      const memoryLines = stats.memory.split('\n');
      const memoryInfo = memoryLines[1]?.match(/\s+(\d+\.?\d*[GM]i?)\s+(\d+\.?\d*[GM]i?)\s+(\d+\.?\d*[GM]i?)/);
      
      // Parse CPU info
      const cpuMatch = stats.cpu.match(/%Cpu\(s\):\s+(\d+\.\d+)\s+us,\s+(\d+\.\d+)\s+sy,\s+(\d+\.\d+)\s+id/);
      
      // Parse load average
      const loadMatch = stats.load.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);
      
      // Parse disk
      const diskMatch = stats.disk.match(/(\d+\.?\d*[GM])\s+(\d+\.?\d*[GM])\s+(\d+\.?\d*[GM])\s+(\d+)%/);

      const embed = new EmbedBuilder()
        .setTitle('🖥️ VPS System Status')
        .setColor(0x00ff00)
        .addFields(
          {
            name: '💾 Memory',
            value: memoryInfo
              ? `**Used:** ${memoryInfo[2]}\n**Free:** ${memoryInfo[3]}\n**Total:** ${memoryInfo[1]}`
              : 'Unable to parse',
            inline: true,
          },
          {
            name: '⚡ CPU',
            value: cpuMatch
              ? `**Usage:** ${(100 - parseFloat(cpuMatch[3])).toFixed(1)}%\n**User:** ${cpuMatch[1]}%\n**System:** ${cpuMatch[2]}%\n**Idle:** ${cpuMatch[3]}%`
              : 'Unable to parse',
            inline: true,
          },
          {
            name: '📊 Load Average',
            value: loadMatch
              ? `**1min:** ${loadMatch[1]}\n**5min:** ${loadMatch[2]}\n**15min:** ${loadMatch[3]}`
              : 'Unable to parse',
            inline: true,
          },
          {
            name: '💿 Disk',
            value: diskMatch
              ? `**Used:** ${diskMatch[2]} / ${diskMatch[1]}\n**Available:** ${diskMatch[3]}\n**Usage:** ${diskMatch[4]}%`
              : 'Unable to parse',
            inline: true,
          },
          {
            name: '🤖 PM2 Processes',
            value: `**Total:** ${stats.pm2.processCount}\n**Memory:** ${stats.pm2.totalMemory.toFixed(1)} MB\n**CPU:** ${stats.pm2.totalCPU.toFixed(1)}%`,
            inline: true,
          },
          {
            name: '⏱️ Uptime',
            value: stats.uptime || 'Unknown',
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Error fetching VPS status: ${error.message}`,
      });
    }
  },
};
