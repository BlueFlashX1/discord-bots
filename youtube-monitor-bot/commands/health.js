const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('View health status of all monitored channels'),

  async execute(interaction) {
    const channelManager = interaction.client.channelManager;
    const channels = channelManager.getAllChannels();

    if (channels.length === 0) {
      return interaction.reply({
        content: '❌ No channels are being monitored.',
        ephemeral: true,
      });
    }

    const healthy = channels.filter((c) => c.health.status === 'healthy').length;
    const errors = channels.filter((c) => c.health.status === 'error').length;

    const embed = new EmbedBuilder()
      .setTitle('🏥 Channel Health Dashboard')
      .setDescription(`Monitoring ${channels.length} channel(s)`)
      .addFields({
        name: '📊 Summary',
        value: `✅ Healthy: ${healthy}\n❌ Errors: ${errors}`,
        inline: true,
      })
      .setColor(healthy === channels.length ? 0x00ff00 : errors > 0 ? 0xff0000 : 0xffaa00)
      .setTimestamp();

    // Add channel details
    const channelList = channels
      .map((channel) => {
        const status = channel.health.status === 'healthy' ? '✅' : '❌';
        const lastCheck = channel.lastChecked
          ? new Date(channel.lastChecked).toLocaleString()
          : 'Never';
        const errorCount = channel.health.errorCount || 0;
        return `${status} **${channel.title}**\n   Last check: ${lastCheck}\n   Errors: ${errorCount}`;
      })
      .join('\n\n');

    if (channelList.length > 4000) {
      // Split into multiple embeds if too long
      embed.addFields({
        name: '📺 Channels',
        value: channelList.substring(0, 1000) + '...\n*(Too many channels to display fully)*',
      });
    } else {
      embed.addFields({
        name: '📺 Channels',
        value: channelList || 'No channels',
      });
    }

    // Add error details if any
    const channelsWithErrors = channels.filter((c) => c.health.lastError);
    if (channelsWithErrors.length > 0) {
      const errorDetails = channelsWithErrors
        .map((channel) => {
          const error = channel.health.lastError;
          return `**${channel.title}**: ${error.message}\n   *${new Date(
            error.timestamp
          ).toLocaleString()}*`;
        })
        .join('\n\n');

      embed.addFields({
        name: '⚠️ Recent Errors',
        value: errorDetails.substring(0, 1000) + (errorDetails.length > 1000 ? '...' : ''),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
