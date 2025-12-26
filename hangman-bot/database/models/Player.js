const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  // Weekly points (reset every Monday)
  weeklyPoints: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  // Game statistics
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  lettersGuessed: {
    type: Number,
    default: 0
  },
  correctGuesses: {
    type: Number,
    default: 0
  },
  // Shop inventory
  shopItems: [{
    itemId: String,
    name: String,
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Active cosmetics
  activePrefix: {
    type: String,
    default: null
  },
  activeTheme: {
    type: String,
    default: null
  },
  // Weekly reset tracking
  lastWeeklyReset: {
    type: Date,
    default: () => getLastMonday(new Date())
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Helper: Get last Monday 00:00
function getLastMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days
  d.setDate(d.getDate() - diff);
  return d;
}

// Instance method: Check and perform weekly reset if needed
playerSchema.methods.checkWeeklyReset = async function() {
  const currentMonday = getLastMonday(new Date());

  if (currentMonday > this.lastWeeklyReset) {
    console.log(`🔄 Weekly reset for ${this.username} (${this.weeklyPoints} → 0)`);
    this.weeklyPoints = 0;
    this.lastWeeklyReset = currentMonday;
    await this.save();
    return true;
  }

  return false;
};

// Instance method: Add game result
playerSchema.methods.addGameResult = async function(won, pointsEarned, lettersGuessed, correctGuesses) {
  // Check for weekly reset first
  await this.checkWeeklyReset();

  this.gamesPlayed += 1;
  if (won) {
    this.gamesWon += 1;
  }

  this.weeklyPoints += pointsEarned;
  this.totalPoints += pointsEarned;
  this.lettersGuessed += lettersGuessed;
  this.correctGuesses += correctGuesses;
  this.lastActive = new Date();

  await this.save();

  return {
    weeklyPoints: this.weeklyPoints,
    totalPoints: this.totalPoints,
    gamesPlayed: this.gamesPlayed,
    gamesWon: this.gamesWon,
    winRate: this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : 0
  };
};

// Instance method: Purchase shop item
playerSchema.methods.purchaseItem = async function(itemId, itemName, cost) {
  // Check for weekly reset
  await this.checkWeeklyReset();

  if (this.weeklyPoints < cost) {
    throw new Error('Insufficient points');
  }

  // Check if already owned
  if (this.shopItems.some(item => item.itemId === itemId)) {
    throw new Error('Item already owned');
  }

  this.weeklyPoints -= cost;
  this.shopItems.push({
    itemId,
    name: itemName,
    purchasedAt: new Date()
  });

  await this.save();

  return {
    item: { itemId, name: itemName },
    remainingPoints: this.weeklyPoints
  };
};

// Instance method: Set active cosmetic
playerSchema.methods.setActiveCosmetic = async function(type, itemId) {
  // Verify ownership
  if (!this.shopItems.some(item => item.itemId === itemId)) {
    throw new Error('Item not owned');
  }

  if (type === 'prefix') {
    this.activePrefix = itemId;
  } else if (type === 'theme') {
    this.activeTheme = itemId;
  }

  await this.save();
  return true;
};

// Static method: Get weekly leaderboard
playerSchema.statics.getWeeklyLeaderboard = async function(limit = 10) {
  // Reset all players first (ensures consistency)
  const players = await this.find();
  for (const player of players) {
    await player.checkWeeklyReset();
  }

  return this.find({ weeklyPoints: { $gt: 0 } })
    .sort({ weeklyPoints: -1 })
    .limit(limit)
    .select('userId username weeklyPoints gamesPlayed gamesWon activePrefix');
};

// Static method: Find or create player
playerSchema.statics.findOrCreate = async function(userId, username) {
  let player = await this.findOne({ userId });

  if (!player) {
    player = await this.create({
      userId,
      username,
      weeklyPoints: 0,
      totalPoints: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      lettersGuessed: 0,
      correctGuesses: 0,
      shopItems: [],
      lastWeeklyReset: getLastMonday(new Date())
    });
    console.log(`✨ New player created: ${username}`);
  } else {
    // Update username if changed
    if (player.username !== username) {
      player.username = username;
      await player.save();
    }

    // Check for weekly reset
    await player.checkWeeklyReset();
  }

  return player;
};

// Virtual: Win rate
playerSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return (this.gamesWon / this.gamesPlayed * 100).toFixed(1);
});

// Virtual: Accuracy
playerSchema.virtual('accuracy').get(function() {
  if (this.lettersGuessed === 0) return 0;
  return (this.correctGuesses / this.lettersGuessed * 100).toFixed(1);
});

// Ensure virtuals are included in JSON
playerSchema.set('toJSON', { virtuals: true });
playerSchema.set('toObject', { virtuals: true });

// JSON-file based storage (fallback if MongoDB not available)
class PlayerJSON {
  constructor(dataPath) {
    this.dataPath = dataPath || './data/players.json';
    this.players = this.loadData();
  }

  loadData() {
    const fs = require('fs');
    const path = require('path');

    try {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading players data:', error);
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
      fs.writeFileSync(this.dataPath, JSON.stringify(this.players, null, 2));
    } catch (error) {
      console.error('Error saving players data:', error);
    }
  }

  async findOrCreate(userId, username) {
    if (!this.players[userId]) {
      this.players[userId] = {
        userId,
        username,
        weeklyPoints: 0,
        totalPoints: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        lettersGuessed: 0,
        correctGuesses: 0,
        shopItems: [],
        activePrefix: null,
        activeTheme: null,
        lastWeeklyReset: getLastMonday(new Date()).toISOString(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.saveData();
    } else {
      this.players[userId].username = username;
      await this.checkWeeklyReset(userId);
    }

    return this.players[userId];
  }

  async checkWeeklyReset(userId) {
    const player = this.players[userId];
    if (!player) return false;

    const currentMonday = getLastMonday(new Date());
    const lastReset = new Date(player.lastWeeklyReset);

    if (currentMonday > lastReset) {
      player.weeklyPoints = 0;
      player.lastWeeklyReset = currentMonday.toISOString();
      this.saveData();
      return true;
    }

    return false;
  }

  async addGameResult(userId, won, pointsEarned, lettersGuessed, correctGuesses) {
    const player = this.players[userId];
    if (!player) return null;

    await this.checkWeeklyReset(userId);

    player.gamesPlayed += 1;
    if (won) player.gamesWon += 1;
    player.weeklyPoints += pointsEarned;
    player.totalPoints += pointsEarned;
    player.lettersGuessed += lettersGuessed;
    player.correctGuesses += correctGuesses;
    player.lastActive = new Date().toISOString();

    this.saveData();

    return {
      weeklyPoints: player.weeklyPoints,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      gamesWon: player.gamesWon,
      winRate: player.gamesPlayed > 0 ? (player.gamesWon / player.gamesPlayed * 100).toFixed(1) : 0
    };
  }

  async purchaseItem(userId, itemId, itemName, cost) {
    const player = this.players[userId];
    if (!player) throw new Error('Player not found');

    await this.checkWeeklyReset(userId);

    if (player.weeklyPoints < cost) {
      throw new Error('Insufficient points');
    }

    if (player.shopItems.some(item => item.itemId === itemId)) {
      throw new Error('Item already owned');
    }

    player.weeklyPoints -= cost;
    player.shopItems.push({
      itemId,
      name: itemName,
      purchasedAt: new Date().toISOString()
    });

    this.saveData();

    return {
      item: { itemId, name: itemName },
      remainingPoints: player.weeklyPoints
    };
  }

  async setActiveCosmetic(userId, type, itemId) {
    const player = this.players[userId];
    if (!player) throw new Error('Player not found');

    if (!player.shopItems.some(item => item.itemId === itemId)) {
      throw new Error('Item not owned');
    }

    if (type === 'prefix') {
      player.activePrefix = itemId;
    } else if (type === 'theme') {
      player.activeTheme = itemId;
    }

    this.saveData();
    return true;
  }

  async getWeeklyLeaderboard(limit = 10) {
    // Reset all players
    for (const userId in this.players) {
      await this.checkWeeklyReset(userId);
    }

    return Object.values(this.players)
      .filter(p => p.weeklyPoints > 0)
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
      .slice(0, limit);
  }

  async findOne(query) {
    if (query.userId) {
      return this.players[query.userId] || null;
    }
    return null;
  }
}

module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema);
module.exports.PlayerJSON = PlayerJSON;
