const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { ShopSystem } = require('../gamification/systems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase a shop item')
    .addStringOption((option) =>
      option.setName('item').setDescription('Item ID').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused().toLowerCase();
      const items = ShopSystem.getShopItems();

      if (!items || items.length === 0) {
        console.warn('No shop items found for autocomplete');
        await interaction.respond([]);
        return;
      }

      const filtered = items
        .filter(
          (i) => i.name.toLowerCase().includes(focused) || i.id.toLowerCase().includes(focused)
        )
        .slice(0, 25);

      const choices = filtered.map((i) => ({
        name: `${i.name} - ${i.cost} pts`,
        value: i.id,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error('Error in buy autocomplete:', error);
      await interaction.respond([]).catch(() => {
        // Ignore if already responded
      });
    }
  },

  async execute(interaction) {
    await interaction.deferReply();
    const itemId = interaction.options.getString('item');
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const result = await ShopSystem.purchaseItem(user, itemId);

      await interaction.editReply({
        content: `Purchased **${result.item.name}**! Remaining points: ${result.remainingPoints}`,
      });
    } catch (error) {
      await interaction.editReply({ content: `${error.message}` });
    }
  },
};
