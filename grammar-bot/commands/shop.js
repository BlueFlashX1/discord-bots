const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { ShopSystem } = require('../gamification/systems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the grammar shop'),

  async execute(interaction) {
    await interaction.deferReply();
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const embed = ShopSystem.createShopEmbed(user.points);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in shop command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  }
};
