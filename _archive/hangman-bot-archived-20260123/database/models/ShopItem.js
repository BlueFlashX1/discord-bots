const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['prefix', 'theme', 'emoji', 'badge'],
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  // Display
  emoji: {
    type: String,
    default: ''
  },
  color: {
    type: Number,
    default: null
  },
  // Availability
  isAvailable: {
    type: Boolean,
    default: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  // Stats
  purchaseCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method: Get all available items
shopItemSchema.statics.getAvailableItems = async function() {
  return this.find({ isAvailable: true }).sort({ cost: 1 });
};

// Static method: Get items by type
shopItemSchema.statics.getItemsByType = async function(type) {
  return this.find({ isAvailable: true, type }).sort({ cost: 1 });
};

// Static method: Find item by ID
shopItemSchema.statics.findItem = async function(itemId) {
  return this.findOne({ itemId, isAvailable: true });
};

// Static method: Record purchase
shopItemSchema.statics.recordPurchase = async function(itemId) {
  const item = await this.findOne({ itemId });
  if (item) {
    item.purchaseCount += 1;
    await item.save();
  }
  return item;
};

// Static method: Initialize shop from config
shopItemSchema.statics.initializeFromConfig = async function(configItems) {
  for (const item of configItems) {
    const existing = await this.findOne({ itemId: item.id });

    if (!existing) {
      await this.create({
        itemId: item.id,
        name: item.name,
        description: item.description || '',
        cost: item.cost,
        type: item.type,
        value: item.value || item.id,
        emoji: item.emoji || '',
        color: item.color || null,
        isAvailable: true,
        isLimited: item.limited || false,
        purchaseCount: 0
      });
      console.log(`✨ Shop item created: ${item.name}`);
    }
  }
};

// Virtual: Formatted cost
shopItemSchema.virtual('formattedCost').get(function() {
  return `${this.cost} points`;
});

// Virtual: Display name
shopItemSchema.virtual('displayName').get(function() {
  return this.emoji ? `${this.emoji} ${this.name}` : this.name;
});

// Ensure virtuals are included in JSON
shopItemSchema.set('toJSON', { virtuals: true });
shopItemSchema.set('toObject', { virtuals: true });

// JSON-file based storage (fallback)
class ShopItemJSON {
  constructor(dataPath) {
    this.dataPath = dataPath || './data/shop_items.json';
    this.items = this.loadData();
  }

  loadData() {
    const fs = require('fs');

    try {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading shop items:', error);
    }

    return {};
  }

  saveData() {
    const fs = require('fs');
    const path = require('path');

    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.items, null, 2));
    } catch (error) {
      console.error('Error saving shop items:', error);
    }
  }

  async getAvailableItems() {
    return Object.values(this.items)
      .filter(item => item.isAvailable)
      .sort((a, b) => a.cost - b.cost);
  }

  async getItemsByType(type) {
    return Object.values(this.items)
      .filter(item => item.isAvailable && item.type === type)
      .sort((a, b) => a.cost - b.cost);
  }

  async findItem(itemId) {
    const item = this.items[itemId];
    return (item && item.isAvailable) ? item : null;
  }

  async recordPurchase(itemId) {
    if (this.items[itemId]) {
      this.items[itemId].purchaseCount = (this.items[itemId].purchaseCount || 0) + 1;
      this.saveData();
      return this.items[itemId];
    }
    return null;
  }

  async initializeFromConfig(configItems) {
    for (const item of configItems) {
      if (!this.items[item.id]) {
        this.items[item.id] = {
          itemId: item.id,
          name: item.name,
          description: item.description || '',
          cost: item.cost,
          type: item.type,
          value: item.value || item.id,
          emoji: item.emoji || '',
          color: item.color || null,
          isAvailable: true,
          isLimited: item.limited || false,
          purchaseCount: 0,
          createdAt: new Date().toISOString()
        };
        console.log(`✨ Shop item created: ${item.name}`);
      }
    }

    this.saveData();
  }

  async findOne(query) {
    if (query.itemId) {
      return this.findItem(query.itemId);
    }
    return null;
  }

  async find(query = {}) {
    let items = Object.values(this.items);

    if (query.isAvailable !== undefined) {
      items = items.filter(item => item.isAvailable === query.isAvailable);
    }

    if (query.type) {
      items = items.filter(item => item.type === query.type);
    }

    return items;
  }
}

module.exports = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);
module.exports.ShopItemJSON = ShopItemJSON;
