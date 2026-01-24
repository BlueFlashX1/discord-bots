const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-post')
    .setDescription('Manually trigger a problem post to your auto-post channel (for testing)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral = 64

    const userPreferences = interaction.client.userPreferences;
    const problemAutoPoster = interaction.client.problemAutoPoster;

    const prefs = userPreferences.getUserPreferences(interaction.user.id);

    if (!prefs.autoPost || !prefs.autoPostChannel) {
      return interaction.editReply({
        content:
          '❌ Auto-post is not enabled or channel is not set. Use `/settings autopost enabled:true channel:#your-channel` first.',
      });
    }

    try {
      // Manually trigger a post
      await problemAutoPoster.postProblem(
        interaction.user.id,
        prefs.autoPostChannel,
        prefs.preferredDifficulty,
        prefs.preferredSource
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Test Post Sent')
        .setDescription(
          `Problem posted to <#${prefs.autoPostChannel}>\n\n` +
            `**Difficulty:** ${prefs.preferredDifficulty.toUpperCase()}\n` +
            `**Source:** ${prefs.preferredSource.toUpperCase()}`
        )
        .setColor(0x00ff00)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in test-post:', error);
      return interaction.editReply({
        content: `❌ Error posting problem: ${error.message}`,
      });
    }
  },
};
