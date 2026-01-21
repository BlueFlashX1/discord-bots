const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Toggle automatic grammar checking'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);

      user.autoCheckEnabled = !user.autoCheckEnabled;
      await user.save();

      await interaction.editReply({
        content: `Automatic grammar checking ${user.autoCheckEnabled ? '**enabled**' : '**disabled**'}!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in toggle command:', error);
      await interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true });
    }
  }
};
