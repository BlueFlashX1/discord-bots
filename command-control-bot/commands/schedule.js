const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require('discord.js');
const configManager = require('../services/configManager');
const scheduler = require('../services/scheduler');
const processManager = require('../services/processManager');
const logger = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Manage scheduled commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Schedule a command to run on a cron schedule')
        .addStringOption(option =>
          option
            .setName('command')
            .setDescription('Command ID to schedule')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('cron')
            .setDescription('Cron expression (e.g., "0 9 * * *" for 9 AM daily)')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('notify')
            .setDescription('Send notification when complete (default: true)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all scheduled commands')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a scheduled command')
        .addStringOption(option =>
          option
            .setName('job')
            .setDescription('Job ID to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable a scheduled command')
        .addStringOption(option =>
          option
            .setName('job')
            .setDescription('Job ID to toggle')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable the schedule')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('run')
        .setDescription('Manually run a scheduled command now')
        .addStringOption(option =>
          option
            .setName('job')
            .setDescription('Job ID to run')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const subcommand = interaction.options.getSubcommand();

    if (focusedOption.name === 'command') {
      const config = configManager.loadConfig();
      const filtered = config.commands
        .filter(cmd => cmd.id.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
                       cmd.label.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25)
        .map(cmd => ({ name: `${cmd.label} (${cmd.id})`, value: cmd.id }));

      await interaction.respond(filtered);
    } else if (focusedOption.name === 'job') {
      const jobs = scheduler.getScheduledJobs();
      const filtered = jobs
        .filter(job => job.jobId.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25)
        .map(job => {
          const cmd = configManager.getCommand(job.commandId);
          return {
            name: `${cmd?.label || job.commandId} - ${job.cronExpression}`,
            value: job.jobId,
          };
        });

      await interaction.respond(filtered);
    }
  },

  async execute(interaction) {
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    if (!processManager.isAdmin(interaction.user.id, adminIds)) {
      return interaction.reply({
        content: 'Only admins can manage schedules.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'add') {
        const commandId = interaction.options.getString('command');
        const cronExpression = interaction.options.getString('cron');
        const notify = interaction.options.getBoolean('notify') ?? true;

        const result = await scheduler.scheduleCommand(commandId, cronExpression, {
          notifyOnComplete: notify,
          notifyOnError: true,
        });

        const commandConfig = configManager.getCommand(commandId);

        const embed = new EmbedBuilder()
          .setTitle('Command Scheduled')
          .setColor(0x2ecc71)
          .addFields(
            { name: 'Command', value: commandConfig?.label || commandId, inline: true },
            { name: 'Schedule', value: `\`${cronExpression}\``, inline: true },
            { name: 'Job ID', value: `\`${result.jobId}\``, inline: false },
            { name: 'Notifications', value: notify ? 'Enabled' : 'Disabled', inline: true },
          )
          .setFooter({ text: 'Use /schedule list to view all scheduled commands' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'list') {
        const jobs = scheduler.getScheduledJobs();

        if (jobs.length === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setTitle('Scheduled Commands')
              .setDescription('No commands are currently scheduled.')
              .setColor(0x3498db)],
          });
        }

        const jobList = jobs.map(job => {
          const cmd = configManager.getCommand(job.commandId);
          const statusIcon = job.enabled ? '▶️' : '⏸️';
          const lastRun = job.lastRun ? `<t:${Math.floor(job.lastRun / 1000)}:R>` : 'Never';
          return `${statusIcon} **${cmd?.label || job.commandId}**\n` +
                 `  Cron: \`${job.cronExpression}\`\n` +
                 `  Last run: ${lastRun} (${job.lastStatus || 'N/A'})\n` +
                 `  ID: \`${job.jobId}\``;
        }).join('\n\n');

        const embed = new EmbedBuilder()
          .setTitle('Scheduled Commands')
          .setDescription(jobList)
          .setColor(0x3498db)
          .setFooter({ text: `${jobs.length} scheduled command(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'remove') {
        const jobId = interaction.options.getString('job');
        scheduler.unscheduleCommand(jobId);

        const embed = new EmbedBuilder()
          .setTitle('Schedule Removed')
          .setDescription(`Removed scheduled job: \`${jobId}\``)
          .setColor(0xe74c3c)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'toggle') {
        const jobId = interaction.options.getString('job');
        const enabled = interaction.options.getBoolean('enabled');

        scheduler.toggleJob(jobId, enabled);

        const embed = new EmbedBuilder()
          .setTitle(enabled ? 'Schedule Enabled' : 'Schedule Disabled')
          .setDescription(`Job \`${jobId}\` is now ${enabled ? 'enabled' : 'disabled'}.`)
          .setColor(enabled ? 0x2ecc71 : 0xf1c40f)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'run') {
        const jobId = interaction.options.getString('job');
        const job = scheduler.getJob(jobId);

        if (!job) {
          return interaction.reply({
            content: `Scheduled job "${jobId}" not found.`,
            ephemeral: true,
          });
        }

        await interaction.deferReply();

        await scheduler.executeScheduledCommand(jobId);

        const updatedJob = scheduler.getJob(jobId);
        const commandConfig = configManager.getCommand(job.commandId);

        const embed = new EmbedBuilder()
          .setTitle('Scheduled Command Executed')
          .setColor(updatedJob.lastStatus === 'completed' ? 0x2ecc71 :
                    updatedJob.lastStatus === 'error' ? 0xe74c3c : 0xf1c40f)
          .addFields(
            { name: 'Command', value: commandConfig?.label || job.commandId, inline: true },
            { name: 'Status', value: updatedJob.lastStatus || 'unknown', inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.logError(error, { command: 'schedule', subcommand, userId: interaction.user.id });

      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`\`\`\`${error.message}\`\`\``)
        .setColor(0xe74c3c);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
