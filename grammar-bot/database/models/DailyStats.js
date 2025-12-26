const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true,
    index: true
  },

  // Message statistics
  totalMessages: {
    type: Number,
    default: 0
  },
  messagesChecked: {
    type: Number,
    default: 0
  },
  uniqueUsers: {
    type: Set,
    default: () => new Set()
  },

  // Error statistics
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

  // Quality statistics
  cleanMessages: {
    type: Number,
    default: 0
  },
  messagesWithErrors: {
    type: Number,
    default: 0
  },
  qualityBonusesAwarded: {
    type: Number,
    default: 0
  },

  // Gamification
  totalPointsAwarded: {
    type: Number,
    default: 0
  },
  totalXpAwarded: {
    type: Number,
    default: 0
  },
  levelUps: {
    type: Number,
    default: 0
  },

  // Shop activity
  itemsPurchased: {
    type: Number,
    default: 0
  },
  pointsSpent: {
    type: Number,
    default: 0
  },

  // Achievements
  achievementsUnlocked: {
    type: Number,
    default: 0
  },

  // PvP
  pvpBattles: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Instance method: Record message check
dailyStatsSchema.methods.recordMessageCheck = async function(userId, hasErrors, errorCount, errorTypes = []) {
  this.totalMessages += 1;
  this.messagesChecked += 1;
  this.uniqueUsers.add(userId);

  if (hasErrors) {
    this.messagesWithErrors += 1;
    this.totalErrors += errorCount;

    // Track error types
    errorTypes.forEach(type => {
      if (this.errorsByType[type] !== undefined) {
        this.errorsByType[type] += 1;
      }
    });
  } else {
    this.cleanMessages += 1;
  }

  this.updatedAt = new Date();
  await this.save();
};

// Instance method: Record quality bonus
dailyStatsSchema.methods.recordQualityBonus = async function(points, xp) {
  this.qualityBonusesAwarded += 1;
  this.totalPointsAwarded += points;
  this.totalXpAwarded += xp;

  this.updatedAt = new Date();
  await this.save();
};

// Instance method: Record level up
dailyStatsSchema.methods.recordLevelUp = async function() {
  this.levelUps += 1;
  this.updatedAt = new Date();
  await this.save();
};

// Instance method: Record shop purchase
dailyStatsSchema.methods.recordPurchase = async function(cost) {
  this.itemsPurchased += 1;
  this.pointsSpent += cost;

  this.updatedAt = new Date();
  await this.save();
};

// Instance method: Record achievement unlock
dailyStatsSchema.methods.recordAchievement = async function() {
  this.achievementsUnlocked += 1;
  this.updatedAt = new Date();
  await this.save();
};

// Instance method: Record PvP battle
dailyStatsSchema.methods.recordPvpBattle = async function() {
  this.pvpBattles += 1;
  this.updatedAt = new Date();
  await this.save();
};

// Static method: Get or create today's stats
dailyStatsSchema.statics.getTodayStats = async function() {
  const today = new Date().toISOString().split('T')[0];

  let stats = await this.findOne({ date: today });

  if (!stats) {
    stats = await this.create({
      date: today,
      totalMessages: 0,
      messagesChecked: 0,
      uniqueUsers: new Set(),
      totalErrors: 0,
      cleanMessages: 0,
      messagesWithErrors: 0
    });
  }

  return stats;
};

// Static method: Get weekly summary
dailyStatsSchema.statics.getWeeklySummary = async function() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const weeklyDocs = await this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });

  const summary = {
    totalMessages: 0,
    totalErrors: 0,
    cleanMessages: 0,
    uniqueUsers: new Set(),
    totalPointsAwarded: 0,
    totalXpAwarded: 0,
    levelUps: 0,
    itemsPurchased: 0,
    achievementsUnlocked: 0,
    days: weeklyDocs.length
  };

  weeklyDocs.forEach(doc => {
    summary.totalMessages += doc.totalMessages;
    summary.totalErrors += doc.totalErrors;
    summary.cleanMessages += doc.cleanMessages;
    doc.uniqueUsers.forEach(userId => summary.uniqueUsers.add(userId));
    summary.totalPointsAwarded += doc.totalPointsAwarded;
    summary.totalXpAwarded += doc.totalXpAwarded;
    summary.levelUps += doc.levelUps;
    summary.itemsPurchased += doc.itemsPurchased;
    summary.achievementsUnlocked += doc.achievementsUnlocked;
  });

  summary.uniqueUsersCount = summary.uniqueUsers.size;
  summary.accuracy = summary.totalMessages > 0
    ? ((summary.cleanMessages / summary.totalMessages) * 100).toFixed(1)
    : 0;

  return summary;
};

// Static method: Get monthly summary
dailyStatsSchema.statics.getMonthlySummary = async function() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`;

  const monthlyDocs = await this.find({
    date: { $regex: `^${monthPrefix}` }
  }).sort({ date: 1 });

  const summary = {
    month: monthPrefix,
    totalMessages: 0,
    totalErrors: 0,
    cleanMessages: 0,
    uniqueUsers: new Set(),
    totalPointsAwarded: 0,
    totalXpAwarded: 0,
    levelUps: 0,
    itemsPurchased: 0,
    achievementsUnlocked: 0,
    pvpBattles: 0,
    days: monthlyDocs.length
  };

  monthlyDocs.forEach(doc => {
    summary.totalMessages += doc.totalMessages;
    summary.totalErrors += doc.totalErrors;
    summary.cleanMessages += doc.cleanMessages;
    doc.uniqueUsers.forEach(userId => summary.uniqueUsers.add(userId));
    summary.totalPointsAwarded += doc.totalPointsAwarded;
    summary.totalXpAwarded += doc.totalXpAwarded;
    summary.levelUps += doc.levelUps;
    summary.itemsPurchased += doc.itemsPurchased;
    summary.achievementsUnlocked += doc.achievementsUnlocked;
    summary.pvpBattles += doc.pvpBattles;
  });

  summary.uniqueUsersCount = summary.uniqueUsers.size;
  summary.accuracy = summary.totalMessages > 0
    ? ((summary.cleanMessages / summary.totalMessages) * 100).toFixed(1)
    : 0;

  return summary;
};

// Virtual: Accuracy percentage
dailyStatsSchema.virtual('accuracy').get(function() {
  if (this.totalMessages === 0) return 0;
  return ((this.cleanMessages / this.totalMessages) * 100).toFixed(1);
});

// Virtual: Error rate
dailyStatsSchema.virtual('errorRate').get(function() {
  if (this.totalMessages === 0) return 0;
  return ((this.messagesWithErrors / this.totalMessages) * 100).toFixed(1);
});

// Virtual: Average errors per message
dailyStatsSchema.virtual('avgErrorsPerMessage').get(function() {
  if (this.messagesWithErrors === 0) return 0;
  return (this.totalErrors / this.messagesWithErrors).toFixed(1);
});

// Virtual: Unique users count
dailyStatsSchema.virtual('uniqueUsersCount').get(function() {
  return this.uniqueUsers.size;
});

// Ensure virtuals are included
dailyStatsSchema.set('toJSON', { virtuals: true });
dailyStatsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.DailyStats || mongoose.model('DailyStats', dailyStatsSchema);
