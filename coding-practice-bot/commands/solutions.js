const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solutions')
    .setDescription('View your archived solutions or solutions for a problem')
    .addSubcommand((sub) =>
      sub
        .setName('my')
        .setDescription('View your successful solutions')
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Number of solutions to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('problem')
        .setDescription('View successful solutions for a specific problem')
        .addStringOption((opt) =>
          opt
            .setName('problem_id')
            .setDescription('Problem ID from /problem command')
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Number of solutions to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('recent')
        .setDescription('View recent successful solutions from all users')
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Number of solutions to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const submissionArchive = interaction.client.submissionArchive;
    const subcommand = interaction.options.getSubcommand();
    const limit = interaction.options.getInteger('limit') || 5;

    let submissions = [];
    let title = '';

    if (subcommand === 'my') {
      submissions = submissionArchive.getUserSubmissions(interaction.user.id, limit);
      title = `Your Solutions (${submissions.length})`;
    } else if (subcommand === 'problem') {
      const problemId = interaction.options.getString('problem_id');
      submissions = submissionArchive.getProblemSubmissions(problemId, limit);
      title = `Solutions for Problem: ${problemId}`;
    } else if (subcommand === 'recent') {
      submissions = submissionArchive.getSuccessfulSubmissions(null, limit);
      title = `Recent Successful Solutions (${submissions.length})`;
    }

    if (submissions.length === 0) {
      return interaction.editReply({
        content: `❌ No solutions found. ${
          subcommand === 'my'
            ? 'Start solving problems with `/problem`!'
            : 'No one has solved this problem yet.'
        }`,
      });
    }

    // Create embeds for each submission (Discord limit: 10 embeds per message)
    const embeds = submissions.slice(0, 10).map((submission) => {
      return submissionArchive.createArchiveEmbed(submission);
    });

    // Add navigation buttons if more than one solution
    const components = [];
    if (submissions.length > 1) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('solutions_prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true), // TODO: Implement pagination
        new ButtonBuilder()
          .setCustomId('solutions_next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true) // TODO: Implement pagination
      );
      components.push(row);
    }

    await interaction.editReply({
      content: `📚 **${title}**`,
      embeds: embeds,
      components: components.length > 0 ? components : undefined,
    });
  },
};
