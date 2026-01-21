const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Toggle notifications for a channel')
    .addStringOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel to toggle notifications for')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const channelManager = interaction.client.channelManager;
    const channels = channelManager.getAllChannels();
    const focused = interaction.options.getFocused();

    const filtered = channels
      .filter((channel) => channel.title.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25)
      .map((channel) => ({
        name: `${channel.notify ? '🔔' : '🔕'} ${channel.title}`,
        value: channel.id,
      }));

    await interaction.respond(filtered);
  },

  async execute(interaction) {
    await interaction.deferReply();

    const channelId = interaction.options.getString('channel');
    const channelManager = interaction.client.channelManager;

    const channel = channelManager.getChannel(channelId);
    if (!channel) {
      return interaction.editReply({
        content: '❌ Channel not found in monitoring list.',
      });
    }

    const newNotifyStatus = channelManager.toggleChannelNotify(channelId);

    const embed = new EmbedBuilder()
      .setTitle('✅ Notifications Updated')
      .setDescription(`**${channel.title}**`)
      .addFields({
        name: '🔔 Status',
        value: newNotifyStatus ? 'Notifications enabled' : 'Notifications disabled',
      })
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
