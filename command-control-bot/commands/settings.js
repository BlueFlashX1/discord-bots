const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const processManager = require('../services/processManager');
const scheduler = require('../services/scheduler');
const userPreferences = require('../services/userPreferences');
const logger = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings (admin only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Set notification channel for scheduled commands')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription(
              'Channel to send scheduler notifications (optional - removes if not provided)'
            )
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('view').setDescription('View current bot settings')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()) || [];
    if (!processManager.isAdmin(interaction.user.id, adminIds)) {
      return interaction.reply({
        content: 'Only admins can manage bot settings.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'channel') {
        const channel = interaction.options.getChannel('channel');

        if (channel) {
          userPreferences.setNotificationChannel(channel.id);

          // Update scheduler with new channel
          scheduler.setDiscordClient(interaction.client, channel.id);

          const embed = new EmbedBuilder()
            .setTitle('✅ Notification Channel Set')
            .setDescription(
              `Scheduled command notifications will be sent to ${channel.mention}.\n\n` +
                'All scheduled jobs will now send completion/error notifications to this channel.'
            )
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } else {
          // Remove notification channel
          userPreferences.setNotificationChannel(null);
          scheduler.setDiscordClient(interaction.client, null);

          const embed = new EmbedBuilder()
            .setTitle('✅ Notification Channel Removed')
            .setDescription(
              'Scheduler notifications have been disabled. Use `/settings channel` to set a channel again.'
            )
            .setColor(0xff9900)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        }
      } else if (subcommand === 'view') {
        const channelId = userPreferences.getNotificationChannel();
        const jobs = scheduler.getScheduledJobs();

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Bot Settings')
          .addFields(
            {
              name: '📢 Notification Channel',
              value: channelId
                ? `<#${channelId}>`
                : 'Not set (use `/settings channel` to configure)',
              inline: false,
            },
            {
              name: '⏰ Scheduled Jobs',
              value: `${jobs.length} active job(s)`,
              inline: true,
            }
          )
          .setColor(0x0099ff)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.logError(error, {
        command: 'settings',
        subcommand,
        userId: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`\`\`\`${error.message}\`\`\``)
        .setColor(0xe74c3c);

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
