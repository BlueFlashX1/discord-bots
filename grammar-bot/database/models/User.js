const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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

  // Core Gamification
  points: {
    type: Number,
    default: 100
  },
  hp: {
    type: Number,
    default: 100
  },
  maxHp: {
    type: Number,
    default: 100
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },

  // Streaks
  streak: {
    type: Number,
    default: 0
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  lastMessageDate: {
    type: Date,
    default: null
  },

  // Statistics
  totalMessages: {
    type: Number,
    default: 0
  },
  cleanMessages: {
    type: Number,
    default: 0
  },
  totalErrors: {
    type: Number,
    default: 0
  },
  errorsByType: {
    grammar: { type: Number, default: 0 },
    spelling: { type: Number, default: 0 },
    punctuation: { type: Number, default: 0 },
    capitalization: { type: Number, default: 0 },
    typography: { type: Number, default: 0 },
    style: { type: Number, default: 0 }
  },

  // Quality Bonuses
  qualityBonusesEarned: {
    type: Number,
    default: 0
  },
  qualityXpEarned: {
    type: Number,
    default: 0
  },
  qualityHistory: [{
    date: Date,
    bonusPoints: Number,
    bonusXp: Number,
    messageLength: Number
  }],

  // Shop & Cosmetics
  shopItems: [{
    itemId: String,
    name: String,
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  title: {
    type: String,
    default: null
  },
  activeTheme: {
    type: String,
    default: null
  },
  activeBadge: {
    type: String,
    default: null
  },

  // Achievements
  achievements: [{
    achievementId: String,
    name: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // PvP
  pvpWins: {
    type: Number,
    default: 0
  },
  pvpLosses: {
    type: Number,
    default: 0
  },
  pvpDraws: {
    type: Number,
    default: 0
  },

  // Daily Stats
  dailyStats: {
    date: String,
    messages: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    xp: { type: Number, default: 0 }
  },

  // Settings
  autoCheckEnabled: {
    type: Boolean,
    default: true
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

// Instance method: Add message result
userSchema.methods.addMessageResult = async function(hasErrors, errorCount, errorTypes = []) {
  this.totalMessages += 1;
  this.lastActive = new Date();

  if (hasErrors) {
    this.totalErrors += errorCount;

    // Track error types
    errorTypes.forEach(type => {
      if (this.errorsByType[type] !== undefined) {
        this.errorsByType[type] += 1;
      }
    });

    // Apply error penalty
    await this.applyErrorPenalty(errorCount);
  } else {
    this.cleanMessages += 1;
  }

  // Update daily stats
  await this.updateDailyStats('messages', 1);
  if (hasErrors) {
    await this.updateDailyStats('errors', errorCount);
  }

  await this.save();
};

// Instance method: Apply error penalty
userSchema.methods.applyErrorPenalty = async function(errorCount) {
  // HP reduction
  const hpLoss = Math.min(errorCount * 5, this.hp);
  this.hp = Math.max(0, this.hp - hpLoss);

  // Points penalty (mild)
  const pointsLoss = errorCount * 2;
  this.points = Math.max(0, this.points - pointsLoss);

  // Reset streak
  this.streak = 0;

  return { hpLoss, pointsLoss };
};

// Instance method: Award quality bonus
userSchema.methods.awardQualityBonus = async function(messageLength) {
  // Calculate bonus based on message length
  let bonusPoints = 0;
  let bonusXp = 0;

  if (messageLength >= 20 && messageLength < 50) {
    bonusPoints = 5;
    bonusXp = 2;
  } else if (messageLength >= 50 && messageLength < 100) {
    bonusPoints = 10;
    bonusXp = 5;
  } else if (messageLength >= 100) {
    bonusPoints = 20;
    bonusXp = 10;
  }

  if (bonusPoints > 0) {
    this.points += bonusPoints;
    this.xp += bonusXp;
    this.qualityBonusesEarned += 1;
    this.qualityXpEarned += bonusXp;

    // Add to history
    this.qualityHistory.push({
      date: new Date(),
      bonusPoints,
      bonusXp,
      messageLength
    });

    // Keep history limited to last 100
    if (this.qualityHistory.length > 100) {
      this.qualityHistory = this.qualityHistory.slice(-100);
    }

    // Update daily stats
    await this.updateDailyStats('points', bonusPoints);
    await this.updateDailyStats('xp', bonusXp);

    // Update streak
    await this.updateStreak();

    // Check for level up
    await this.checkLevelUp();

    await this.save();

    return { bonusPoints, bonusXp, newLevel: this.level };
  }

  return null;
};

// Instance method: Update streak
userSchema.methods.updateStreak = async function() {
  const today = new Date().toDateString();
  const lastDate = this.lastMessageDate ? new Date(this.lastMessageDate).toDateString() : null;

  if (lastDate !== today) {
    this.streak += 1;
    this.lastMessageDate = new Date();

    if (this.streak > this.bestStreak) {
      this.bestStreak = this.streak;
    }
  }
};

// Instance method: Check and perform level up
userSchema.methods.checkLevelUp = async function() {
  const xpNeeded = this.calculateXpForNextLevel();

  if (this.xp >= xpNeeded) {
    this.level += 1;
    this.xp -= xpNeeded;

    // Increase max HP
    this.maxHp += 10;
    this.hp = Math.min(this.hp + 20, this.maxHp); // Restore some HP on level up

    await this.save();

    return true;
  }

  return false;
};

// Instance method: Calculate XP needed for next level
userSchema.methods.calculateXpForNextLevel = function() {
  // Formula: 100 * level^1.5
  return Math.floor(100 * Math.pow(this.level, 1.5));
};

// Instance method: Heal HP
userSchema.methods.healHp = async function(amount) {
  const oldHp = this.hp;
  this.hp = Math.min(this.hp + amount, this.maxHp);
  await this.save();

  return this.hp - oldHp; // Return actual healed amount
};

// Instance method: Purchase shop item
userSchema.methods.purchaseItem = async function(itemId, itemName, cost) {
  if (this.points < cost) {
    throw new Error('Insufficient points');
  }

  // Check if already owned
  if (this.shopItems.some(item => item.itemId === itemId)) {
    throw new Error('Item already owned');
  }

  this.points -= cost;
  this.shopItems.push({
    itemId,
    name: itemName,
    purchasedAt: new Date()
  });

  await this.save();

  return {
    item: { itemId, name: itemName },
    remainingPoints: this.points
  };
};

// Instance method: Set active cosmetic
userSchema.methods.setActiveCosmetic = async function(type, itemId) {
  // Verify ownership
  if (!this.shopItems.some(item => item.itemId === itemId)) {
    throw new Error('Item not owned');
  }

  if (type === 'title') {
    this.title = itemId;
  } else if (type === 'theme') {
    this.activeTheme = itemId;
  } else if (type === 'badge') {
    this.activeBadge = itemId;
  }

  await this.save();
  return true;
};

// Instance method: Unlock achievement
userSchema.methods.unlockAchievement = async function(achievementId, achievementName) {
  // Check if already unlocked
  if (this.achievements.some(a => a.achievementId === achievementId)) {
    return false;
  }

  this.achievements.push({
    achievementId,
    name: achievementName,
    unlockedAt: new Date()
  });

  await this.save();

  return true;
};

// Instance method: Update daily stats
userSchema.methods.updateDailyStats = async function(stat, value) {
  const today = new Date().toISOString().split('T')[0];

  if (!this.dailyStats || this.dailyStats.date !== today) {
    // Reset daily stats for new day
    this.dailyStats = {
      date: today,
      messages: 0,
      errors: 0,
      points: 0,
      xp: 0
    };
  }

  this.dailyStats[stat] = (this.dailyStats[stat] || 0) + value;
};

// Instance method: Record PvP result
userSchema.methods.recordPvpResult = async function(result) {
  if (result === 'win') {
    this.pvpWins += 1;
    this.points += 50;
    this.xp += 25;
  } else if (result === 'loss') {
    this.pvpLosses += 1;
  } else if (result === 'draw') {
    this.pvpDraws += 1;
    this.points += 10;
  }

  await this.checkLevelUp();
  await this.save();
};

// Static method: Find or create user
userSchema.statics.findOrCreate = async function(userId, username) {
  let user = await this.findOne({ userId });

  if (!user) {
    user = await this.create({
      userId,
      username,
      points: 100,
      hp: 100,
      maxHp: 100,
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      totalMessages: 0,
      cleanMessages: 0,
      totalErrors: 0,
      shopItems: [],
      achievements: [],
      autoCheckEnabled: true
    });
    console.log(`✨ New user created: ${username}`);
  } else {
    // Update username if changed
    if (user.username !== username) {
      user.username = username;
      await user.save();
    }
  }

  return user;
};

// Static method: Get leaderboard
userSchema.statics.getLeaderboard = async function(type = 'points', limit = 10) {
  let sortField = {};

  if (type === 'points') {
    sortField = { points: -1 };
  } else if (type === 'level') {
    sortField = { level: -1, xp: -1 };
  } else if (type === 'accuracy') {
    sortField = { totalMessages: -1 }; // Sort by most messages first, then calculate accuracy
  } else if (type === 'streak') {
    sortField = { bestStreak: -1 };
  }

  let users = await this.find({}).sort(sortField).limit(limit * 2); // Get more for accuracy sorting

  if (type === 'accuracy') {
    // Filter users with at least 10 messages and sort by accuracy
    users = users
      .filter(u => u.totalMessages >= 10)
      .map(u => ({
        ...u.toObject(),
        accuracy: u.totalMessages > 0 ? ((u.cleanMessages / u.totalMessages) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))
      .slice(0, limit);
  }

  return users;
};

// Virtual: Accuracy percentage
userSchema.virtual('accuracy').get(function() {
  if (this.totalMessages === 0) return 0;
  return ((this.cleanMessages / this.totalMessages) * 100).toFixed(1);
});

// Virtual: PvP win rate
userSchema.virtual('pvpWinRate').get(function() {
  const totalGames = this.pvpWins + this.pvpLosses + this.pvpDraws;
  if (totalGames === 0) return 0;
  return ((this.pvpWins / totalGames) * 100).toFixed(1);
});

// Virtual: XP progress percentage
userSchema.virtual('xpProgress').get(function() {
  const xpNeeded = this.calculateXpForNextLevel();
  return ((this.xp / xpNeeded) * 100).toFixed(1);
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
