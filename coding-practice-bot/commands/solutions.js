const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solutions')
    .setDescription('View your successful solutions')
    .addIntegerOption((opt) =>
      opt
        .setName('limit')
        .setDescription('Number of solutions to show (1-10)')
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const submissionArchive = interaction.client.submissionArchive;
    const limit = interaction.options.getInteger('limit') || 5;

    const submissions = submissionArchive.getUserSubmissions(interaction.user.id, limit);
    const title = `Your Solutions (${submissions.length})`;

    if (submissions.length === 0) {
      return interaction.editReply({
        content: '❌ No solutions found. Start solving problems with `/problem`!',
      });
    }

    // Create embeds for each submission (Discord limit: 10 embeds per message)
    const embeds = submissions.slice(0, 10).map((submission) => {
      return submissionArchive.createArchiveEmbed(submission);
    });

    await interaction.editReply({
      content: `📚 **${title}**`,
      embeds: embeds,
    });
  },
};
