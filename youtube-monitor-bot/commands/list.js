const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all monitored YouTube channels'),

  async execute(interaction) {
    const channelManager = interaction.client.channelManager;
    const channels = channelManager.getAllChannels();

    if (channels.length === 0) {
      return interaction.reply({
        content: '❌ No channels are being monitored. Use `/add` to add a channel.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📺 Monitored Channels')
      .setDescription(`Total: ${channels.length} channel(s)`)
      .setColor(0x5865f2)
      .setTimestamp();

    const channelList = channels
      .map((channel, index) => {
        const notify = channel.notify ? '🔔' : '🔕';
        const status = channel.enabled ? '✅' : '❌';
        return `${index + 1}. ${status} ${notify} **${channel.title}**\n   Channel: <#${
          channel.discordChannelId
        }>\n   [View Channel](https://youtube.com/channel/${channel.id})`;
      })
      .join('\n\n');

    if (channelList.length > 4000) {
      embed.addFields({
        name: 'Channels',
        value: channelList.substring(0, 3900) + '...\n*(Too many channels to display fully)*',
      });
    } else {
      embed.addFields({
        name: 'Channels',
        value: channelList,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
