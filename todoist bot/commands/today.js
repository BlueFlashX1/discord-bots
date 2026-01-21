const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription('Get daily overview of tasks due today'),
  async execute(interaction, client, _todoistService) {
    await client.dailyOverview.sendManualOverview(interaction);
  },
};
