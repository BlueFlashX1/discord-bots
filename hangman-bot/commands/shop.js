const { SlashCommandBuilder } = require('discord.js');
const ShopSystem = require('../utils/shopSystem');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the hangman shop')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Filter by category')
        .addChoices(
          { name: 'All Items', value: 'all' },
          { name: 'Prefixes', value: 'prefix' },
          { name: 'Themes', value: 'theme' },
          { name: 'Emojis', value: 'emoji' },
          { name: 'Badges', value: 'badge' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const category = interaction.options.getString('category') || 'all';
      const { ShopItem, Player } = getDatabase();
      const shopSystem = new ShopSystem(ShopItem, Player);

      // Get player to show their points
      const player = await shopSystem.Player.findOrCreate(
        interaction.user.id,
        interaction.user.username
      );

      // Check weekly reset
      if (player.checkWeeklyReset) {
        await player.checkWeeklyReset();
      }

      // Get items
      let items;

      if (category === 'all') {
        items = await shopSystem.getAvailableItems();
      } else {
        items = await shopSystem.getItemsByType(category);
      }

      if (!items || items.length === 0) {
        await interaction.editReply({
          content: '📭 No items available in this category.'
        });
        return;
      }

      const embed = shopSystem.createShopEmbed(items, player.weeklyPoints);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in shop command:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`
      });
    }
  }
};
