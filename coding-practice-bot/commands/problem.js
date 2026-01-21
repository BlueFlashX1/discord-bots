const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('problem')
    .setDescription('Get a Python coding problem to practice')
    .addStringOption((option) =>
      option
        .setName('difficulty')
        .setDescription('Problem difficulty')
        .addChoices(
          { name: 'Easy', value: 'easy' },
          { name: 'Medium', value: 'medium' },
          { name: 'Hard', value: 'hard' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('Problem source')
        .addChoices(
          { name: 'LeetCode', value: 'leetcode' },
          { name: 'Codewars', value: 'codewars' },
          { name: 'Random', value: 'random' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const difficulty = interaction.options.getString('difficulty') || null;
    const source = interaction.options.getString('source') || 'random';

    const problemService = interaction.client.problemService;
    const problem = await problemService.getRandomProblem(difficulty, source === 'random' ? null : source);

    if (!problem) {
      return interaction.editReply({
        content: '❌ Failed to fetch a problem. Please try again later.',
      });
    }

    // Set as current problem for user
    problemService.setCurrentProblem(interaction.user.id, problem);

    // Mark as attempted
    const progressService = interaction.client.progressService;
    progressService.markAttempted(interaction.user.id, problem.id);

    const difficultyEmoji = {
      easy: '🟢',
      medium: '🟡',
      hard: '🔴',
    };

    const embed = new EmbedBuilder()
      .setTitle(`${difficultyEmoji[problem.difficulty] || '📝'} ${problem.title}`)
      .setDescription(
        `**Difficulty:** ${problem.difficulty.toUpperCase()}\n` +
          `**Source:** ${problem.source.toUpperCase()}\n` +
          (problem.rank
            ? `**Rank:** ${problem.rank.name} (${problem.rank.color})\n`
            : '') +
          `**Tags:** ${problem.tags?.join(', ') || 'N/A'}\n` +
          (problem.category ? `**Category:** ${problem.category}\n` : '') +
          `\n[View Problem](${problem.url})\n\n` +
          `**How to submit:**\n` +
          `1. Type your solution in a code block: \\`\\`\\`python\n# your code\n\\`\\`\\`\n` +
          `2. Or attach a .py file\n` +
          `3. Use /submit to validate your solution`
      )
      .setColor(problem.difficulty === 'easy' ? 0x00ff00 : problem.difficulty === 'medium' ? 0xffaa00 : 0xff0000)
      .setFooter({ text: `Problem ID: ${problem.id}` })
      .setTimestamp();

    // Add Codewars-specific stats if available
    if (problem.stats && problem.source === 'codewars') {
      embed.addFields({
        name: '📊 Codewars Stats',
        value:
          `**Completed:** ${problem.stats.totalCompleted.toLocaleString()}\n` +
          `**Attempts:** ${problem.stats.totalAttempts.toLocaleString()}\n` +
          `**Stars:** ${problem.stats.totalStars || 0}`,
        inline: true,
      });
    }

    if (problem.description) {
      // Clean up markdown for Discord (remove code blocks that might break formatting)
      let cleanDescription = problem.description
        .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
        .substring(0, 1000);
      if (problem.description.length > 1000) {
        cleanDescription += '...';
      }
      embed.addFields({
        name: '📝 Description',
        value: cleanDescription,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
