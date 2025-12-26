const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and status'),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true
    });

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(config.colors.success)
      .addFields(
        {
          name: 'Latency',
          value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`,
          inline: true
        },
        {
          name: 'API Latency',
          value: `${Math.round(interaction.client.ws.ping)}ms`,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
