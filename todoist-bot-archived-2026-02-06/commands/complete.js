const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('complete')
    .setDescription('Mark a task as complete')
    .addStringOption((option) =>
      option
        .setName('task')
        .setDescription('Select a task to complete')
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async autocomplete(interaction, client, todoistService) {
    const focusedValue = interaction.options.getFocused();

    try {
      const tasks = await todoistService.getAllTasks();
      const incompleteTasks = tasks
        .filter((task) => !task.isCompleted && !task.checked)
        .slice(0, 25); // Discord autocomplete limit is 25

      const filtered = incompleteTasks
        .filter((task) => task.content.toLowerCase().includes(focusedValue.toLowerCase()))
        .slice(0, 25)
        .map((task) => ({
          name: `${task.content.substring(0, 80)}${
            task.content.length > 80 ? '...' : ''
          } | ${task.id.substring(0, 8)}`,
          value: task.id,
        }));

      await interaction.respond(filtered);
    } catch (error) {
      console.error('Error in complete autocomplete:', error);
      await interaction.respond([]);
    }
  },
  async execute(interaction, client, todoistService) {
    await interaction.deferReply();

    try {
      const taskId = interaction.options.getString('task');
      const task = await todoistService.getTaskById(taskId);

      if (!task) {
        await interaction.editReply('❌ Task not found.');
        return;
      }

      if (task.isCompleted || task.checked) {
        await interaction.editReply('✅ Task is already completed.');
        return;
      }

      await todoistService.closeTask(taskId);

      const embed = createSuccessEmbed(
        'Task Completed',
        `**${task.content}**\n\n🎉 Great job! Keep up the productivity!`,
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in complete command:', error);
      await interaction.editReply(
        '❌ Error completing task. Please check the task ID and try again.',
      );
    }
  },
};
