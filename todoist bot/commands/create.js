const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createTaskEmbed } = require('../utils/embeds');
const Logger = require('../../utils/logger');
const { retryDiscordAPI } = require('../../utils/retry');

const logger = new Logger('todoist-create');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new task in Todoist')
    .addStringOption((option) =>
      option.setName('content').setDescription('Task content').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('due').setDescription('Due date').setAutocomplete(true),
    )
    .addStringOption((option) =>
      option.setName('project').setDescription('Select a project (optional)').setAutocomplete(true),
    )
    .addStringOption((option) =>
      option.setName('labels').setDescription('Select labels (optional)').setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName('priority')
        .setDescription('Priority level')
        .addChoices(
          { name: 'Normal', value: '1' },
          { name: 'High', value: '2' },
          { name: 'Very High', value: '3' },
          { name: 'Urgent', value: '4' },
        ),
    ),
  async autocomplete(interaction, client, todoistService) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'project') {
      try {
        const projects = await todoistService.getProjects();
        const filtered = projects
          .filter((project) =>
            project.name.toLowerCase().includes(focusedOption.value.toLowerCase()),
          )
          .slice(0, 25)
          .map((project) => ({
            name: project.name,
            value: project.name,
          }));

        await retryDiscordAPI(
          () => interaction.respond(filtered),
          {
            operationName: 'Project autocomplete',
            logger,
          },
        );
      } catch (error) {
        logger.error('Error in create project autocomplete', error);
        await interaction.respond([]).catch(() => {});
      }
    } else if (focusedOption.name === 'labels') {
      try {
        const labels = await todoistService.getLabels();
        const filtered = labels
          .filter((label) => label.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25)
          .map((label) => ({
            name: label.name,
            value: label.name,
          }));

        await retryDiscordAPI(
          () => interaction.respond(filtered),
          {
            operationName: 'Labels autocomplete',
            logger,
          },
        );
      } catch (error) {
        logger.error('Error in create labels autocomplete', error);
        await interaction.respond([]).catch(() => {});
      }
    } else if (focusedOption.name === 'due') {
      const commonDates = [
        { name: 'Today', value: 'today' },
        { name: 'Tomorrow', value: 'tomorrow' },
        { name: 'Next Week', value: '+7d' },
        { name: 'Next Month', value: '+30d' },
      ];

      const filtered = commonDates.filter((date) =>
        date.name.toLowerCase().includes(focusedOption.value.toLowerCase()),
      );

      await interaction.respond(filtered);
    }
  },
  async execute(interaction, client, todoistService) {
    await interaction.deferReply();

    try {
      const content = interaction.options.getString('content');
      const dueInput = interaction.options.getString('due');
      const projectName = interaction.options.getString('project');
      const labelsInput = interaction.options.getString('labels');
      const priority = interaction.options.getString('priority') || '1';

      const taskData = {
        priority: parseInt(priority, 10),
      };

      if (dueInput) {
        let dueString = dueInput;
        if (dueInput.toLowerCase() === 'today') {
          dueString = 'today';
        } else if (dueInput.toLowerCase() === 'tomorrow') {
          dueString = 'tomorrow';
        } else {
          dueString = dueInput;
        }
        taskData.dueString = dueString;
      }

      if (projectName) {
        const projects = await todoistService.getProjects();
        const project = projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase());
        if (project) {
          taskData.projectId = project.id;
        } else {
          await interaction.editReply(
            `❌ Project "${projectName}" not found. Task created without project.`,
          );
        }
      }

      if (labelsInput) {
        // Support both single label and comma-separated labels
        const labelNames = labelsInput.includes(',')
          ? labelsInput.split(',').map((l) => l.trim())
          : [labelsInput.trim()];
        const allLabels = await todoistService.getLabels();
        const labelIds = labelNames
          .map((name) => {
            const label = allLabels.find((l) => l.name.toLowerCase() === name.toLowerCase());
            return label ? label.id : null;
          })
          .filter((id) => id !== null);

        if (labelIds.length > 0) {
          taskData.labelIds = labelIds;
        }
      }

      const task = await todoistService.createTask(content, taskData);

      // Get project name if exists (reuse existing projectName from input or fetch from task)
      let finalProjectName = projectName;
      if (!finalProjectName && task.projectId) {
        finalProjectName = await todoistService.getProjectName(task.projectId);
      }

      const embed = createTaskEmbed(task, '✅ Task Created Successfully', COLORS.success);

      // Add project field if exists
      if (finalProjectName) {
        embed.addFields({ name: '📁 Project', value: finalProjectName, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

      if (task.due) {
        const dueDate = new Date(task.due.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === today.getTime()) {
          await interaction.followUp({
            content: `🔔 ${interaction.user} - You have a task due today: **${task.content}**`,
          });
        }
      }
    } catch (error) {
      logger.error('Error in create command', error, {
        userId: interaction.user?.id,
        channelId: interaction.channel?.id,
      });
      await interaction.editReply('❌ Error creating task. Please try again.');
    }
  },
};
