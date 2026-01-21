const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const {
  COLORS,
  createDailyOverviewEmbed,
  formatTaskForEmbed,
  createEmptyStateEmbed,
} = require('../utils/embeds');

class DailyOverview {
  constructor(client, todoistService) {
    this.client = client;
    this.todoistService = todoistService;
    this.scheduledJob = null;
  }

  start() {
    // Daily overview now uses user preferences - no global channel needed
    // Each user can set their own channel via /settings channel
    this.scheduledJob = cron.schedule('0 9 * * *', async () => {
      await this.sendDailyOverviews();
    });

    console.log('Daily overview scheduled for 9:00 AM daily');
  }

  async sendDailyOverviews() {
    // Get all users who have set a channel preference
    const userPreferences = require('./userPreferences');

    // Load preferences directly from file
    const fs = require('fs');
    const path = require('path');
    const preferencesFile = path.join(__dirname, '../data/userPreferences.json');

    if (!fs.existsSync(preferencesFile)) {
      return; // No preferences set yet
    }

    try {
      const data = fs.readFileSync(preferencesFile, 'utf8');
      const allPreferences = JSON.parse(data);

      for (const [userId, prefs] of Object.entries(allPreferences)) {
        const channelId = prefs?.dailyOverviewChannelId;
        if (channelId) {
          try {
            await this.sendDailyOverview(channelId);
            // Small delay between users to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error sending daily overview to user ${userId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences for daily overview:', error);
    }
  }

  stop() {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
    }
  }

  async sendDailyOverview(channelId) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        return;
      }

      const tasks = await this.todoistService.getAllTasks();
      const organized = this.todoistService.organizeTasksByDueDate(tasks);
      const todayTasks = organized.today;

      // Get all tasks once for subtask lookup
      const allTasks = await this.todoistService.getAllTasks();

      if (todayTasks.length === 0) {
        const emptyEmbed = createEmptyStateEmbed(
          'Daily Task Overview',
          "🎉 **No tasks due today!** You're all caught up!"
        );
        await channel.send({ embeds: [emptyEmbed] });
        return;
      }

      const byProject = this.todoistService.organizeTasksByProject(todayTasks);
      const projectNames = await Promise.all(
        Object.keys(byProject).map(async (projectId) => {
          const name = await this.todoistService.getProjectName(projectId);
          return { projectId, name };
        })
      );

      // Create main embed
      const mainEmbed = createDailyOverviewEmbed(todayTasks, null, allTasks, this.todoistService);

      // Count incomplete tasks
      const incompleteCount = todayTasks.filter((t) => !t.isCompleted && !t.checked).length;
      const completedCount = todayTasks.length - incompleteCount;

      mainEmbed.addFields({
        name: '📊 Status',
        value: `⬜ ${incompleteCount} incomplete\n✅ ${completedCount} completed`,
        inline: true,
      });

      // Create project embeds (one per project)
      const embeds = [mainEmbed];

      for (const { projectId, name } of projectNames) {
        const projectTasks = byProject[projectId];
        const incompleteTasks = projectTasks.filter((t) => !t.isCompleted && !t.checked);

        if (incompleteTasks.length === 0 && projectTasks.length > 0) {
          // All tasks completed in this project
          continue;
        }

        let projectText = '';
        for (const task of incompleteTasks.slice(0, 10)) {
          projectText += formatTaskForEmbed(task, allTasks, this.todoistService) + '\n';
        }

        if (incompleteTasks.length > 10) {
          projectText += `\n*... and ${incompleteTasks.length - 10} more tasks*`;
        }

        if (projectText) {
          const projectEmbed = new EmbedBuilder()
            .setTitle(`📁 ${name}`)
            .setDescription(projectText)
            .setColor(COLORS.info)
            .setFooter({ text: `${incompleteTasks.length} task(s) in this project` });

          embeds.push(projectEmbed);
        }
      }

      await channel.send({ embeds: embeds.slice(0, 10) });
    } catch (error) {
      console.error('Error sending daily overview:', error);
    }
  }

  async sendManualOverview(interaction) {
    try {
      await interaction.deferReply();

      const tasks = await this.todoistService.getAllTasks();
      const organized = this.todoistService.organizeTasksByDueDate(tasks);
      const todayTasks = organized.today;

      // Get all tasks once for subtask lookup
      const allTasks = await this.todoistService.getAllTasks();

      if (todayTasks.length === 0) {
        const emptyEmbed = createEmptyStateEmbed(
          "Today's Tasks",
          "🎉 **No tasks due today!** You're all caught up!"
        );
        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      const byProject = this.todoistService.organizeTasksByProject(todayTasks);
      const projectNames = await Promise.all(
        Object.keys(byProject).map(async (projectId) => {
          const name = await this.todoistService.getProjectName(projectId);
          return { projectId, name };
        })
      );

      // Create main embed
      const mainEmbed = new EmbedBuilder()
        .setTitle("📋 Today's Tasks")
        .setColor(COLORS.primary)
        .setTimestamp();

      const incompleteCount = todayTasks.filter((t) => !t.isCompleted && !t.checked).length;
      const completedCount = todayTasks.length - incompleteCount;

      mainEmbed.setDescription(`**Total tasks: ${todayTasks.length}**`);
      mainEmbed.addFields({
        name: '📊 Status',
        value: `⬜ ${incompleteCount} incomplete\n✅ ${completedCount} completed`,
        inline: true,
      });

      // Create project embeds (one per project)
      const embeds = [mainEmbed];

      for (const { projectId, name } of projectNames) {
        const projectTasks = byProject[projectId];
        const incompleteTasks = projectTasks.filter((t) => !t.isCompleted && !t.checked);

        if (incompleteTasks.length === 0 && projectTasks.length > 0) {
          // All tasks completed in this project - skip
          continue;
        }

        let projectText = '';
        for (const task of incompleteTasks.slice(0, 10)) {
          projectText += formatTaskForEmbed(task, allTasks, this.todoistService) + '\n';
        }

        if (incompleteTasks.length > 10) {
          projectText += `\n*... and ${incompleteTasks.length - 10} more tasks*`;
        }

        if (projectText) {
          const projectEmbed = new EmbedBuilder()
            .setTitle(`📁 ${name}`)
            .setDescription(projectText)
            .setColor(COLORS.info)
            .setFooter({ text: `${incompleteTasks.length} task(s) in this project` });

          embeds.push(projectEmbed);
        }
      }

      await interaction.editReply({ embeds: embeds.slice(0, 10) });
    } catch (error) {
      console.error('Error sending manual overview:', error);
      await interaction.editReply('❌ Error fetching tasks. Please try again.');
    }
  }
}

module.exports = DailyOverview;
