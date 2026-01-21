const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const userPreferences = require('../services/userPreferences');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure Todoist bot settings')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Set channel for daily overview notifications')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription(
              'Channel to send daily overviews (optional - removes channel if not provided)'
            )
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('view').setDescription('View your current settings')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'channel') {
        const channel = interaction.options.getChannel('channel');

        if (channel) {
          userPreferences.setDailyOverviewChannel(interaction.user.id, channel.id);

          const embed = new EmbedBuilder()
            .setTitle('✅ Daily Overview Channel Set')
            .setDescription(`Daily overviews will be sent to ${channel.mention} at **9:00 AM daily**.\n\n📅 You'll receive a summary of all tasks due today!`)
            .setColor(COLORS.success)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } else {
          // Remove channel preference
          userPreferences.setDailyOverviewChannel(interaction.user.id, null);

          const embed = new EmbedBuilder()
            .setTitle('✅ Daily Overview Channel Removed')
            .setDescription(
              'Daily overviews have been disabled.\n\nUse `/settings channel` to set a channel again and resume daily notifications.'
            )
            .setColor(COLORS.warning)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        }
      } else if (subcommand === 'view') {
        const prefs = userPreferences.getUserPreferences(interaction.user.id);
        const channelId = prefs.dailyOverviewChannelId;

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Your Settings')
          .setDescription('Configure your Todoist bot preferences')
          .addFields({
            name: '📬 Daily Overview Channel',
            value: channelId 
              ? `✅ Configured: <#${channelId}>\n⏰ Sends daily summary at 9:00 AM` 
              : '❌ Not set\nUse `/settings channel` to configure',
            inline: false,
          })
          .setColor(COLORS.info)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in settings command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while updating settings. Please try again.',
      });
    }
  },
};
