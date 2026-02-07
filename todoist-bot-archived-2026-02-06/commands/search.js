const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, createEmptyStateEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for tasks by content')
    .addStringOption((option) =>
      option.setName('query').setDescription('Search query').setRequired(true),
    ),
  async execute(interaction, client, todoistService) {
    await interaction.deferReply();

    try {
      const query = interaction.options.getString('query').toLowerCase();
      const tasks = await todoistService.getAllTasks();

      const matchingTasks = tasks.filter(
        (task) => task.content.toLowerCase().includes(query) && !task.isCompleted,
      );

      if (matchingTasks.length === 0) {
        const emptyEmbed = createEmptyStateEmbed(
          'Search Results',
          `❌ No tasks found matching **"${query}"**\n\nTry a different search term or check your spelling.`,
        );
        emptyEmbed.setColor(COLORS.warning);
        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Search Results: "${query}"`)
        .setColor(COLORS.info)
        .setDescription(`**Found ${matchingTasks.length} matching task(s)**\n`)
        .setTimestamp();

      let tasksList = '';
      for (const task of matchingTasks.slice(0, 15)) {
        const projectName = await todoistService.getProjectName(task.projectId);
        const priorityEmoji = require('../utils/embeds').PRIORITY_EMOJI[task.priority] || '🔵';

        let dueDate = 'No due date';
        if (task.due) {
          const date = new Date(task.due.date);
          dueDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        tasksList += `${priorityEmoji} **${task.content}**\n`;
        tasksList += `   📁 ${projectName} | 📅 ${dueDate}\n`;
        tasksList += `   \`ID: ${task.id.substring(0, 8)}...\`\n\n`;
      }

      if (matchingTasks.length > 15) {
        tasksList += `\n*... and ${matchingTasks.length - 15} more tasks*`;
      }

      embed.addFields({
        name: '📋 Matching Tasks',
        value: tasksList,
        inline: false,
      },
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in search command:', error);
      await interaction.editReply('❌ Error searching tasks. Please try again.');
    }
  },
};
