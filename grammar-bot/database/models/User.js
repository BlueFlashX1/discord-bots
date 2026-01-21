// Conditional mongoose loading - only load if actually needed
let mongoose = null;
let UserModel = null;

function loadMongoose() {
  if (mongoose) return mongoose;
  try {
    mongoose = require('mongoose');
    return mongoose;
  } catch (error) {
    console.warn('Mongoose not available (using JSON storage):', error.message);
    return null;
  }
}

function getUserModel() {
  if (UserModel) return UserModel;

  const mongooseInstance = loadMongoose();
  if (!mongooseInstance) {
    return null;
  }

  // Only define schema if mongoose is available
  const userSchema = new mongooseInstance.Schema({
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },

    // Core Gamification
    points: {
      type: Number,
      default: 100,
    },
    hp: {
      type: Number,
      default: 100,
    },
    maxHp: {
      type: Number,
      default: 100,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },

    // Message tracking
    totalMessages: {
      type: Number,
      default: 0,
    },
    cleanMessages: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
    },

    // PvP
    pvpWins: {
      type: Number,
      default: 0,
    },
    pvpLosses: {
      type: Number,
      default: 0,
    },
    pvpDraws: {
      type: Number,
      default: 0,
    },

    // Shop & Cosmetics
    inventory: [
      {
        itemId: String,
        itemName: String,
        purchasedAt: Date,
      },
    ],
    activeCosmetics: {
      title: String,
      theme: String,
      badge: String,
    },

    // Achievements
    achievements: [
      {
        achievementId: String,
        achievementName: String,
        unlockedAt: Date,
      },
    ],

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  });

  // Instance methods
  userSchema.methods.addMessageResult = async function (hasErrors, errorCount, errorTypes = []) {
    this.totalMessages += 1;
    if (!hasErrors) {
      this.cleanMessages += 1;
    }
    await this.updateStreak(hasErrors);
    this.updatedAt = new Date();
    await this.save();
  };

  userSchema.methods.applyErrorPenalty = async function (errorCount) {
    const penalty = errorCount * 5;
    this.points = Math.max(0, this.points - penalty);
    this.hp = Math.max(0, this.hp - errorCount * 2);
    this.updatedAt = new Date();
    await this.save();
    return this.points;
  };

  userSchema.methods.awardQualityBonus = async function (messageLength) {
    const bonus = Math.min(Math.floor(messageLength / 10), 20);
    this.points += bonus;
    this.xp += Math.floor(bonus / 2);
    this.updatedAt = new Date();
    await this.checkLevelUp();
    await this.save();
    return this.points;
  };

  userSchema.methods.updateStreak = async function (hasErrors) {
    if (hasErrors) {
      this.streak = 0;
    } else {
      this.streak += 1;
      if (this.streak > this.bestStreak) {
        this.bestStreak = this.streak;
      }
    }
    this.updatedAt = new Date();
    await this.save();
  };

  userSchema.methods.checkLevelUp = async function () {
    const newLevel = Math.floor(1 + Math.sqrt(this.xp / 100));
    if (newLevel > this.level) {
      const oldLevel = this.level;
      this.level = newLevel;
      this.points += 50;
      this.maxHp += 10;
      this.hp = this.maxHp;
      this.updatedAt = new Date();
      await this.save();
      return { leveledUp: true, oldLevel, newLevel };
    }
    return { leveledUp: false };
  };

  userSchema.methods.calculateXpForNextLevel = function () {
    const nextLevel = this.level + 1;
    return Math.floor(100 * Math.pow(nextLevel, 1.5));
  };

  userSchema.methods.healHp = async function (amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updatedAt = new Date();
    await this.save();
    return this.hp;
  };

  userSchema.methods.purchaseItem = async function (itemId, itemName, cost) {
    if (this.points < cost) {
      throw new Error('Insufficient points');
    }
    this.points -= cost;
    this.inventory.push({
      itemId,
      itemName,
      purchasedAt: new Date(),
    });
    this.updatedAt = new Date();
    await this.save();
    return { remainingPoints: this.points, item: { id: itemId, name: itemName } };
  };

  userSchema.methods.setActiveCosmetic = async function (type, itemId) {
    if (!this.activeCosmetics) {
      this.activeCosmetics = {};
    }
    this.activeCosmetics[type] = itemId;
    this.updatedAt = new Date();
    await this.save();
  };

  userSchema.methods.unlockAchievement = async function (achievementId, achievementName) {
    if (!this.achievements.some((a) => a.achievementId === achievementId)) {
      this.achievements.push({
        achievementId,
        achievementName,
        unlockedAt: new Date(),
      });
      this.points += 100;
      this.xp += 50;
      this.updatedAt = new Date();
      await this.checkLevelUp();
      await this.save();
      return true;
    }
    return false;
  };

  userSchema.methods.updateDailyStats = async function (stat, value) {
    // This would integrate with DailyStats model if needed
    this.updatedAt = new Date();
    await this.save();
  };

  userSchema.methods.recordPvpResult = async function (result) {
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

  // Static methods
  userSchema.statics.findOrCreate = async function (userId, username) {
    let user = await this.findOne({ userId });
    if (!user) {
      user = new this({
        userId,
        username,
        points: 100,
        hp: 100,
        maxHp: 100,
        xp: 0,
        level: 1,
      });
      await user.save();
    } else if (user.username !== username) {
      user.username = username;
      await user.save();
    }
    return user;
  };

  userSchema.statics.getLeaderboard = async function (type = 'points', limit = 10) {
    const sortOptions = {
      points: { points: -1 },
      level: { level: -1, xp: -1 },
      streak: { bestStreak: -1 },
      pvp: { pvpWins: -1, pvpLosses: 1 },
    };
    return await this.find()
      .sort(sortOptions[type] || sortOptions.points)
      .limit(limit);
  };

  // Virtuals
  userSchema.virtual('accuracy').get(function () {
    if (this.totalMessages === 0) return 0;
    return ((this.cleanMessages / this.totalMessages) * 100).toFixed(1);
  });

  userSchema.virtual('pvpWinRate').get(function () {
    const totalGames = this.pvpWins + this.pvpLosses + this.pvpDraws;
    if (totalGames === 0) return '0.0';
    return ((this.pvpWins / totalGames) * 100).toFixed(1);
  });

  userSchema.virtual('xpProgress').get(function () {
    const xpNeeded = this.calculateXpForNextLevel();
    return ((this.xp / xpNeeded) * 100).toFixed(1);
  });

  // Ensure virtuals are included in JSON
  userSchema.set('toJSON', { virtuals: true });
  userSchema.set('toObject', { virtuals: true });

  UserModel = mongooseInstance.models.User || mongooseInstance.model('User', userSchema);
  return UserModel;
}

// Export - returns null if mongoose unavailable (JSON mode)
module.exports = getUserModel();
