const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('View API quota usage and bot status'),

  async execute(interaction) {
    const quotaManager = interaction.client.apiQuotaManager;
    const channelManager = interaction.client.channelManager;
    const youtubeMonitor = interaction.client.youtubeMonitor;

    const quotaInfo = quotaManager.getQuotaInfo();
    const channels = channelManager.getAllChannels();

    const embed = new EmbedBuilder()
      .setTitle('📊 YouTube Bot Dashboard')
      .setDescription('API quota usage and bot status')
      .addFields(
        {
          name: '📈 API Quota',
          value: `${quotaInfo.used.toLocaleString()} / ${quotaInfo.limit.toLocaleString()} units`,
          inline: true,
        },
        {
          name: '📉 Remaining',
          value: `${quotaInfo.remaining.toLocaleString()} units`,
          inline: true,
        },
        {
          name: '📊 Usage',
          value: `${quotaInfo.percentage}%`,
          inline: true,
        },
        {
          name: '⏸️ Status',
          value: quotaInfo.paused
            ? '⏸️ Paused'
            : quotaInfo.exceeded
            ? '⚠️ Quota Exceeded'
            : '✅ Active',
          inline: true,
        },
        {
          name: '🔄 Last Reset',
          value: new Date(quotaInfo.lastReset).toLocaleString(),
          inline: true,
        },
        {
          name: '📺 Monitored Channels',
          value: `${channels.filter((c) => c.enabled).length} active`,
          inline: true,
        },
        {
          name: '🤖 Monitor Status',
          value: youtubeMonitor.isRunning ? '✅ Running' : '⏹️ Stopped',
          inline: true,
        }
      )
      .setColor(quotaInfo.exceeded ? 0xff0000 : quotaInfo.paused ? 0xffaa00 : 0x00ff00)
      .setFooter({ text: `Quota resets daily at midnight` })
      .setTimestamp();

    // Add warning if quota is high
    if (quotaInfo.percentage > 80) {
      embed.addFields({
        name: '⚠️ Warning',
        value: `API quota is at ${quotaInfo.percentage}%. Consider pausing if needed.`,
      });
    }

    if (quotaInfo.exceeded) {
      embed.addFields({
        name: '🛑 Auto-Stopped',
        value: 'Bot will automatically resume when quota resets (midnight UTC).',
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
