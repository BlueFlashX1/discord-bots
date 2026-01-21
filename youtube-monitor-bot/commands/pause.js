const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the YouTube bot (stops posting but keeps bot active)'),

  async execute(interaction) {
    const quotaManager = interaction.client.apiQuotaManager;

    if (quotaManager.isPaused()) {
      return interaction.reply({
        content: '⏸️ Bot is already paused.',
        ephemeral: true,
      });
    }

    quotaManager.pause();

    const embed = new EmbedBuilder()
      .setTitle('⏸️ Bot Paused')
      .setDescription(
        'YouTube monitoring is paused. Bot remains active but will not post new videos.'
      )
      .addFields({
        name: 'ℹ️ Note',
        value: 'Use `/resume` to start posting again.',
      })
      .setColor(0xffaa00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
