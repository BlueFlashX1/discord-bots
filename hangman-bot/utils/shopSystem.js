const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

class ShopSystem {
  constructor(ShopItem, Player) {
    this.ShopItem = ShopItem;
    this.Player = Player;
  }

  /**
   * Initialize shop items from config
   */
  async initializeShop() {
    if (this.ShopItem.initializeFromConfig) {
      await this.ShopItem.initializeFromConfig(config.shop.items);
      console.log(`✅ Shop initialized with ${config.shop.items.length} items`);
    }
  }

  /**
   * Get all available shop items
   */
  async getAvailableItems() {
    return await this.ShopItem.getAvailableItems();
  }

  /**
   * Get items by type
   */
  async getItemsByType(type) {
    return await this.ShopItem.getItemsByType(type);
  }

  /**
   * Find specific item
   */
  async findItem(itemId) {
    return await this.ShopItem.findItem(itemId);
  }

  /**
   * Purchase item
   */
  async purchaseItem(userId, username, itemId) {
    // Get player
    const player = await this.Player.findOrCreate(userId, username);

    // Check weekly reset
    if (player.checkWeeklyReset) {
      await player.checkWeeklyReset();
    }

    // Get item
    const item = await this.findItem(itemId);

    if (!item) {
      throw new Error('Item not found or unavailable');
    }

    // Check if player can afford
    if (player.weeklyPoints < item.cost) {
      throw new Error(`Insufficient points. You have ${player.weeklyPoints}, need ${item.cost}`);
    }

    // Check if already owned
    if (player.shopItems.some(i => i.itemId === itemId)) {
      throw new Error('You already own this item');
    }

    // Purchase using Player model method
    const result = await player.purchaseItem(itemId, item.name, item.cost);

    // Record purchase in shop item
    if (this.ShopItem.recordPurchase) {
      await this.ShopItem.recordPurchase(itemId);
    }

    return {
      item,
      remainingPoints: result.remainingPoints,
      player
    };
  }

  /**
   * Set active cosmetic
   */
  async setActiveCosmetic(userId, username, type, itemId) {
    const player = await this.Player.findOrCreate(userId, username);

    await player.setActiveCosmetic(type, itemId);

    return player;
  }

  /**
   * Get player inventory
   */
  async getPlayerInventory(userId, username) {
    const player = await this.Player.findOrCreate(userId, username);

    // Check weekly reset
    if (player.checkWeeklyReset) {
      await player.checkWeeklyReset();
    }

    return {
      items: player.shopItems || [],
      activePrefix: player.activePrefix,
      activeTheme: player.activeTheme,
      weeklyPoints: player.weeklyPoints
    };
  }

  /**
   * Create shop embed
   */
  createShopEmbed(items, userPoints = null) {
    const embed = new EmbedBuilder()
      .setTitle('🛍️ Hangman Shop')
      .setDescription('Purchase cosmetics with your weekly points!')
      .setColor(config.colors.info);

    if (userPoints !== null) {
      embed.addFields({
        name: '💰 Your Points',
        value: `${userPoints} weekly points`,
        inline: false
      });
    }

    // Group items by type
    const itemsByType = {};
    for (const item of items) {
      if (!itemsByType[item.type]) {
        itemsByType[item.type] = [];
      }
      itemsByType[item.type].push(item);
    }

    // Add fields for each type
    for (const [type, typeItems] of Object.entries(itemsByType)) {
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
      const itemList = typeItems
        .map(item => {
          const affordable = userPoints !== null && userPoints >= item.cost;
          const status = affordable ? '✅' : '❌';
          return `${status} **${item.name}** - ${item.cost} points`;
        })
        .join('\n');

      embed.addFields({
        name: `${this.getTypeEmoji(type)} ${typeLabel}`,
        value: itemList || 'No items',
        inline: false
      });
    }

    embed.setFooter({ text: 'Use /buy <item_id> to purchase an item' });

    return embed;
  }

  /**
   * Create inventory embed
   */
  createInventoryEmbed(userId, username, inventory) {
    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${username}'s Inventory`)
      .setDescription(`You have ${inventory.items.length} item(s)`)
      .setColor(config.colors.info);

    embed.addFields({
      name: '💰 Weekly Points',
      value: `${inventory.weeklyPoints} points`,
      inline: false
    });

    if (inventory.items.length === 0) {
      embed.addFields({
        name: 'Items',
        value: 'No items yet. Visit the shop with `/shop`!',
        inline: false
      });
    } else {
      // Group by type
      const itemsByType = {};
      for (const item of inventory.items) {
        const type = this.getItemType(item.itemId);
        if (!itemsByType[type]) {
          itemsByType[type] = [];
        }
        itemsByType[type].push(item);
      }

      for (const [type, items] of Object.entries(itemsByType)) {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
        const itemList = items
          .map(item => {
            const isActive =
              (type === 'prefix' && item.itemId === inventory.activePrefix) ||
              (type === 'theme' && item.itemId === inventory.activeTheme);

            return `${isActive ? '⭐' : '•'} ${item.name}`;
          })
          .join('\n');

        embed.addFields({
          name: `${this.getTypeEmoji(type)} ${typeLabel}`,
          value: itemList,
          inline: false
        });
      }
    }

    // Active cosmetics
    const activeCosmetics = [];
    if (inventory.activePrefix) {
      activeCosmetics.push(`Prefix: ${inventory.activePrefix}`);
    }
    if (inventory.activeTheme) {
      activeCosmetics.push(`Theme: ${inventory.activeTheme}`);
    }

    if (activeCosmetics.length > 0) {
      embed.addFields({
        name: '⭐ Active Cosmetics',
        value: activeCosmetics.join('\n'),
        inline: false
      });
    }

    return embed;
  }

  /**
   * Create purchase confirmation embed
   */
  createPurchaseEmbed(item, remainingPoints) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Purchase Successful!')
      .setDescription(`You purchased **${item.name}**!`)
      .setColor(config.colors.success);

    embed.addFields({
      name: '💰 Cost',
      value: `${item.cost} points`,
      inline: true
    });

    embed.addFields({
      name: '💳 Remaining',
      value: `${remainingPoints} points`,
      inline: true
    });

    embed.setFooter({ text: 'Use /inventory to view your items' });

    return embed;
  }

  /**
   * Helper: Get item type from ID
   */
  getItemType(itemId) {
    if (itemId.includes('prefix')) return 'prefix';
    if (itemId.includes('theme')) return 'theme';
    if (itemId.includes('emoji')) return 'emoji';
    if (itemId.includes('badge')) return 'badge';
    return 'other';
  }

  /**
   * Helper: Get emoji for type
   */
  getTypeEmoji(type) {
    const emojis = {
      prefix: '🏷️',
      theme: '🎨',
      emoji: '😀',
      badge: '🏅'
    };
    return emojis[type] || '📦';
  }

  /**
   * Get item ID from name (for user-friendly commands)
   */
  async getItemIdFromName(searchTerm) {
    const items = await this.getAvailableItems();

    // Exact match
    let match = items.find(item =>
      item.itemId.toLowerCase() === searchTerm.toLowerCase() ||
      item.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (match) return match.itemId;

    // Partial match
    match = items.find(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (match) return match.itemId;

    return null;
  }
}

module.exports = ShopSystem;
