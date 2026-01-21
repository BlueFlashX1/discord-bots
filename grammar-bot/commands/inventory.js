const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('View your purchased items'),

  async execute(interaction) {
    await interaction.deferReply();
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Inventory`)
        .setColor(config.colors.success);

      const shopItems = user.shopItems || user.inventory || [];

      if (shopItems.length === 0) {
        embed.setDescription('Your inventory is empty. Visit `/shop` to purchase items!');
      } else {
        const itemsList = shopItems
          .map((item) => {
            const itemName = item.itemName || item.name || 'Unknown Item';
            const itemDesc = item.description || 'No description';
            return `**${itemName}**\n  └ ${itemDesc}`;
          })
          .join('\n\n');

        // Discord description limit: 4096 characters
        const { EMBED_LIMITS } = require('../utils/embedBuilder');
        embed.setDescription(
          itemsList.length > EMBED_LIMITS.description
            ? itemsList.substring(0, EMBED_LIMITS.description - 3) + '...'
            : itemsList
        );
      }

      // Show active title
      if (user.title || user.activeCosmetics?.title) {
        const title = user.title || user.activeCosmetics?.title || '';
        embed.addFields({ name: 'Active Title', value: title, inline: false });
      }

      // Show achievements
      const achievements = user.achievements || [];
      if (achievements.length > 0) {
        const achievementText = achievements
          .slice(0, 5)
          .map((a) => {
            const achName = typeof a === 'string' ? a : (a.achievementName || a.achievementId || 'Unknown');
            return achName;
          })
          .join('\n');
        // Discord field value limit: 1024 characters
        const { EMBED_LIMITS } = require('../utils/embedBuilder');
        embed.addFields({
          name: 'Recent Achievements',
          value:
            achievementText.length > EMBED_LIMITS.fieldValue
              ? achievementText.substring(0, EMBED_LIMITS.fieldValue - 3) + '...'
              : achievementText,
          inline: false,
        });
      }

      embed.setFooter({ text: `Total items: ${shopItems.length} | Points: ${user.points || 100}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in inventory command:', error);
      await interaction.editReply({ content: `Error: ${error.message}` });
    }
  },
};
