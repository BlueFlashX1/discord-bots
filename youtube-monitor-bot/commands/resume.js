const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the YouTube bot (starts posting again)'),

  async execute(interaction) {
    const quotaManager = interaction.client.apiQuotaManager;

    if (!quotaManager.isPaused()) {
      return interaction.reply({
        content: '✅ Bot is already running.',
        ephemeral: true,
      });
    }

    // Check if quota is exceeded
    const quotaInfo = quotaManager.getQuotaInfo();
    if (quotaInfo.exceeded) {
      return interaction.reply({
        content: '⚠️ Cannot resume: API quota exceeded. Bot will auto-resume when quota resets.',
        ephemeral: true,
      });
    }

    quotaManager.resume();

    const embed = new EmbedBuilder()
      .setTitle('✅ Bot Resumed')
      .setDescription('YouTube monitoring has resumed. Bot will now post new videos.')
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
