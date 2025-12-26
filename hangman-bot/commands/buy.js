const { SlashCommandBuilder } = require('discord.js');
const ShopSystem = require('../utils/shopSystem');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item from the shop')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item ID or name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const { ShopItem } = getDatabase();

      let items;

      if (ShopItem.getAvailableItems) {
        items = await ShopItem.getAvailableItems();
      } else if (ShopItem.items) {
        items = Object.values(ShopItem.items).filter(i => i.isAvailable);
      } else {
        items = [];
      }

      const filtered = items
        .filter(item =>
          item.name.toLowerCase().includes(focusedValue) ||
          item.itemId.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25);

      await interaction.respond(
        filtered.map(item => ({
          name: `${item.name} - ${item.cost} points`,
          value: item.itemId
        }))
      );
    } catch (error) {
      console.error('Error in buy autocomplete:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const itemSearch = interaction.options.getString('item');
      const { ShopItem, Player } = getDatabase();
      const shopSystem = new ShopSystem(ShopItem, Player);

      // Find item (by ID or name)
      let itemId = itemSearch;

      // Try to find by ID first
      let item = await shopSystem.findItem(itemId);

      // If not found, try by name
      if (!item) {
        itemId = await shopSystem.getItemIdFromName(itemSearch);
        if (itemId) {
          item = await shopSystem.findItem(itemId);
        }
      }

      if (!item) {
        await interaction.editReply({
          content: `❌ Item not found: "${itemSearch}"\n\nUse \`/shop\` to see available items.`
        });
        return;
      }

      // Purchase item
      const result = await shopSystem.purchaseItem(
        interaction.user.id,
        interaction.user.username,
        item.itemId
      );

      // Create success embed
      const embed = shopSystem.createPurchaseEmbed(item, result.remainingPoints);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in buy command:', error);

      const errorMessage = error.message || 'An error occurred';

      await interaction.editReply({
        content: `❌ ${errorMessage}`
      });
    }
  }
};
