const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delay')
    .setDescription('Delay a task to a later date')
    .addStringOption((option) =>
      option
        .setName('task')
        .setDescription('Select a task to delay')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option.setName('date').setDescription('New due date').setRequired(true).setAutocomplete(true)
    ),
  async autocomplete(interaction, client, todoistService) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'task') {
      try {
        const tasks = await todoistService.getAllTasks();
        const incompleteTasks = tasks
          .filter((task) => !task.isCompleted && !task.checked)
          .slice(0, 25);

        const filtered = incompleteTasks
          .filter((task) => task.content.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25)
          .map((task) => ({
            name: `${task.content.substring(0, 80)}${
              task.content.length > 80 ? '...' : ''
            } | ${task.id.substring(0, 8)}`,
            value: task.id,
          }));

        await interaction.respond(filtered);
      } catch (error) {
        console.error('Error in delay task autocomplete:', error);
        await interaction.respond([]);
      }
    } else if (focusedOption.name === 'date') {
      const commonDates = [
        { name: 'Tomorrow', value: 'tomorrow' },
        { name: 'Next Week', value: '+7d' },
        { name: 'Next Month', value: '+30d' },
        { name: 'Today', value: 'today' },
      ];

      const filtered = commonDates.filter((date) =>
        date.name.toLowerCase().includes(focusedOption.value.toLowerCase())
      );

      await interaction.respond(filtered);
    }
  },
  async execute(interaction, client, todoistService) {
    await interaction.deferReply();

    try {
      const taskId = interaction.options.getString('task');
      const dateInput = interaction.options.getString('date');

      const task = await todoistService.getTaskById(taskId);

      if (!task) {
        await interaction.editReply('❌ Task not found.');
        return;
      }

      let newDueString = dateInput;

      if (dateInput.toLowerCase() === 'tomorrow') {
        newDueString = 'tomorrow';
      } else if (dateInput.startsWith('+')) {
        const days = parseInt(dateInput.substring(1, dateInput.length - 1), 10);
        if (!isNaN(days)) {
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + days);
          newDueString = newDate.toISOString().split('T')[0];
        }
      }

      await todoistService.updateTask(taskId, {
        dueString: newDueString,
      });

      // Format the new due date nicely
      let formattedDate = newDueString;
      try {
        if (newDueString !== 'today' && newDueString !== 'tomorrow') {
          const date = new Date(newDueString);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
        } else {
          formattedDate = newDueString.charAt(0).toUpperCase() + newDueString.slice(1);
        }
      } catch (e) {
        // Keep original if parsing fails
      }

      const embed = createSuccessEmbed(
        'Task Delayed',
        `**${task.content}**\n\n📅 **New due date:** ${formattedDate}`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in delay command:', error);
      await interaction.editReply(
        '❌ Error delaying task. Please check the task ID and date format.'
      );
    }
  },
};
