const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a YouTube channel from monitoring')
    .addStringOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel to remove')
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
        name: channel.title.substring(0, 100),
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

    const removed = channelManager.removeChannel(channelId);
    if (removed) {
      const embed = new EmbedBuilder()
        .setTitle('✅ Channel Removed')
        .setDescription(`**${channel.title}** is no longer being monitored`)
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to remove channel.',
      });
    }
  },
};
