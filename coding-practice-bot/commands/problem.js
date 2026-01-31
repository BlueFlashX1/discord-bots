const { SlashCommandBuilder } = require('discord.js');
const {
  createProblemEmbed,
  createCodewarsLinksEmbed,
} = require('../utils/embedBuilder');

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

    if (source === 'codewars') {
      return interaction.editReply({
        embeds: [createCodewarsLinksEmbed()],
      });
    }

    const problemService = interaction.client.problemService;
    const problem = await problemService.getRandomProblem(
      difficulty,
      source === 'random' ? null : source
    );

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

    const embed = createProblemEmbed(problem);

    await interaction.editReply({ embeds: [embed] });
  },
};
