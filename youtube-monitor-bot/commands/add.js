const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a YouTube channel to monitor')
    .addStringOption((option) =>
      option
        .setName('channel')
        .setDescription('YouTube channel URL, ID, or username')
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('discord_channel')
        .setDescription('Discord channel to post videos (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption((option) =>
      option
        .setName('notify')
        .setDescription('Get notified when this channel posts (default: false)')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const channelInput = interaction.options.getString('channel');
    const discordChannel = interaction.options.getChannel('discord_channel') || interaction.channel;
    const notify = interaction.options.getBoolean('notify') || false;

    const youtubeService = interaction.client.youtubeService;
    const channelManager = interaction.client.channelManager;

    try {
      // Get channel info
      let channelData;

      // Try different methods to get channel
      // Enhanced with better URL parsing from Übersicht widget
      if (
        channelInput.includes('youtube.com') ||
        channelInput.includes('youtu.be') ||
        channelInput.startsWith('@') ||
        channelInput.match(/^UC[\w-]+$/)
      ) {
        // URL or direct identifier provided
        // getChannelByUrl handles: @handle, /c/, /user/, /channel/, direct IDs
        const data = await youtubeService.getChannelByUrl(channelInput);
        if (!data.items || data.items.length === 0) {
          return interaction.editReply({
            content:
              '❌ Channel not found. Please check the URL.\n\n' +
              'Supported formats:\n' +
              '- youtube.com/@handle\n' +
              '- youtube.com/c/ChannelName\n' +
              '- youtube.com/channel/UC...\n' +
              '- youtube.com/user/Username\n' +
              '- Direct channel ID: UC...\n' +
              '- Direct handle: @handle',
          });
        }
        channelData = data.items[0];
      } else {
        // Search for channel (fallback)
        const searchResults = await youtubeService.searchChannel(channelInput);
        if (searchResults.length === 0) {
          return interaction.editReply({
            content:
              '❌ No channels found. Please provide a channel URL, ID, or exact username.\n\n' +
              'Try using:\n' +
              '- Full URL: youtube.com/@handle\n' +
              '- Channel ID: UC...\n' +
              '- Handle: @channelname',
          });
        }
        // Use first result
        const channelId = searchResults[0].snippet.channelId;
        const data = await youtubeService.getChannelById(channelId);
        channelData = data.items[0];
      }

      // Add channel
      const addedChannel = channelManager.addChannel(channelData, discordChannel.id, notify);

      const embed = new EmbedBuilder()
        .setTitle('✅ Channel Added Successfully')
        .setDescription(`**${addedChannel.title}** is now being monitored`)
        .addFields(
          {
            name: '📺 Channel',
            value: `[${addedChannel.title}](https://youtube.com/channel/${addedChannel.id})`,
            inline: true,
          },
          {
            name: '📢 Discord Channel',
            value: `<#${discordChannel.id}>`,
            inline: true,
          },
          {
            name: '🔔 Notifications',
            value: notify ? 'Enabled' : 'Disabled',
            inline: true,
          },
          {
            name: '👥 Subscribers',
            value: parseInt(addedChannel.subscriberCount).toLocaleString(),
            inline: true,
          },
          {
            name: '📹 Videos',
            value: parseInt(addedChannel.videoCount).toLocaleString(),
            inline: true,
          }
        )
        .setThumbnail(addedChannel.thumbnail)
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error adding channel:', error);
      await interaction.editReply({
        content: `❌ Error adding channel: ${error.message}`,
      });
    }
  },
};
