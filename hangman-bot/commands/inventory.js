const { SlashCommandBuilder } = require('discord.js');
const ShopSystem = require('../utils/shopSystem');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your purchased items')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another user\'s inventory')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const { ShopItem, Player } = getDatabase();
      const shopSystem = new ShopSystem(ShopItem, Player);

      // Get player inventory
      const inventory = await shopSystem.getPlayerInventory(
        targetUser.id,
        targetUser.username
      );

      // Create inventory embed
      const embed = shopSystem.createInventoryEmbed(
        targetUser.id,
        targetUser.username,
        inventory
      );

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in inventory command:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`
      });
    }
  }
};
