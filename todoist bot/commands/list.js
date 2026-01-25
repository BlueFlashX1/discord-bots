const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  COLORS,
  createTaskListEmbed,
  formatTaskForEmbed,
  createEmptyStateEmbed,
} = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all tasks organized by due date and projects')
    .addStringOption((option) =>
      option
        .setName('filter')
        .setDescription('Filter tasks by due date')
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'Tomorrow', value: 'tomorrow' },
          { name: 'All', value: 'all' },
        ),
    ),
  async execute(interaction, client, todoistService) {
    await interaction.deferReply();

    try {
      const filter = interaction.options.getString('filter') || 'all';
      const tasks = await todoistService.getAllTasks();
      const organized = todoistService.organizeTasksByDueDate(tasks);

      let tasksToShow = [];
      let title = '';

      if (filter === 'today') {
        tasksToShow = organized.today;
        title = '📋 Tasks Due Today';
      } else if (filter === 'tomorrow') {
        tasksToShow = organized.tomorrow;
        title = '📋 Tasks Due Tomorrow';
      } else {
        tasksToShow = tasks;
        title = '📋 All Tasks';
      }

      // Get all tasks once to find subtasks efficiently
      const allTasksForSubtasks = filter === 'all' ? tasks : await todoistService.getAllTasks();

      const incompleteTasks = tasksToShow.filter((t) => !t.isCompleted && !t.checked);

      if (incompleteTasks.length === 0) {
        const emptyEmbed = createEmptyStateEmbed(
          title.replace('📋 ', ''),
          '✅ **All tasks complete!** Great work! 🎉',
        );
        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      const byProject = todoistService.organizeTasksByProject(incompleteTasks);
      const projectNames = await Promise.all(
        Object.keys(byProject).map(async (projectId) => {
          const name = await todoistService.getProjectName(projectId);
          return { projectId, name };
        }),
      );

      // Create main embed
      const mainEmbed = createTaskListEmbed(incompleteTasks, title, COLORS.primary);
      mainEmbed.addFields({
        name: '📊 Summary',
        value: `⬜ **${incompleteTasks.length}** incomplete task(s)\n📁 **${projectNames.length}** project(s)`,
        inline: true,
      },
      );

      const embeds = [mainEmbed];

      for (const { projectId, name } of projectNames) {
        const projectTasks = byProject[projectId];
        let projectText = '';

        for (const task of projectTasks.slice(0, 10)) {
          projectText += formatTaskForEmbed(task, allTasksForSubtasks, todoistService) + '\n';
          projectText += `   \`ID: ${task.id.substring(0, 8)}...\`\n\n`;
        }

        if (projectTasks.length > 10) {
          projectText += `\n*... and ${projectTasks.length - 10} more tasks in this project*`;
        }

        if (projectText) {
          const fieldValue =
            projectText.length > 1024 ? projectText.substring(0, 1021) + '...' : projectText;

          const projectEmbed = new EmbedBuilder()
            .setTitle(`📁 ${name}`)
            .setDescription(fieldValue)
            .setColor(COLORS.info)
            .setFooter({ text: `${projectTasks.length} task(s) in this project` });

          embeds.push(projectEmbed);
        }
      }

      await interaction.editReply({ embeds: embeds.slice(0, 10) });
    } catch (error) {
      console.error('Error in list command:', error);
      await interaction.editReply('❌ Error fetching tasks. Please try again.');
    }
  },
};
