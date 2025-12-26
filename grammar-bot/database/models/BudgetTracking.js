const mongoose = require('mongoose');

const budgetTrackingSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true,
    index: true
  },

  // Request tracking
  totalRequests: {
    type: Number,
    default: 0
  },
  successfulRequests: {
    type: Number,
    default: 0
  },
  failedRequests: {
    type: Number,
    default: 0
  },

  // Token usage
  totalInputTokens: {
    type: Number,
    default: 0
  },
  totalOutputTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },

  // Cost tracking (in USD)
  totalCost: {
    type: Number,
    default: 0
  },

  // Model usage
  modelUsage: {
    type: Map,
    of: {
      requests: Number,
      inputTokens: Number,
      outputTokens: Number,
      cost: Number
    },
    default: {}
  },

  // Hourly breakdown
  hourlyStats: [{
    hour: Number, // 0-23
    requests: Number,
    tokens: Number,
    cost: Number
  }],

  // Budget status
  budgetExceeded: {
    type: Boolean,
    default: false
  },
  budgetLimit: {
    type: Number,
    default: 5.00 // $5/day default
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Instance method: Record API request
budgetTrackingSchema.methods.recordRequest = async function(model, inputTokens, outputTokens, cost, success = true) {
  this.totalRequests += 1;

  if (success) {
    this.successfulRequests += 1;
  } else {
    this.failedRequests += 1;
  }

  this.totalInputTokens += inputTokens;
  this.totalOutputTokens += outputTokens;
  this.totalTokens += (inputTokens + outputTokens);
  this.totalCost += cost;

  // Update model usage
  const modelKey = model || 'gpt-4o-mini';
  const currentUsage = this.modelUsage.get(modelKey) || {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cost: 0
  };

  currentUsage.requests += 1;
  currentUsage.inputTokens += inputTokens;
  currentUsage.outputTokens += outputTokens;
  currentUsage.cost += cost;

  this.modelUsage.set(modelKey, currentUsage);

  // Update hourly stats
  const currentHour = new Date().getHours();
  let hourStat = this.hourlyStats.find(h => h.hour === currentHour);

  if (!hourStat) {
    hourStat = {
      hour: currentHour,
      requests: 0,
      tokens: 0,
      cost: 0
    };
    this.hourlyStats.push(hourStat);
  }

  hourStat.requests += 1;
  hourStat.tokens += (inputTokens + outputTokens);
  hourStat.cost += cost;

  // Check budget
  if (this.totalCost >= this.budgetLimit) {
    this.budgetExceeded = true;
  }

  this.updatedAt = new Date();
  await this.save();

  return {
    totalCost: this.totalCost,
    budgetLimit: this.budgetLimit,
    budgetExceeded: this.budgetExceeded,
    remainingBudget: Math.max(0, this.budgetLimit - this.totalCost)
  };
};

// Instance method: Check if budget available
budgetTrackingSchema.methods.hasBudget = function() {
  return !this.budgetExceeded && this.totalCost < this.budgetLimit;
};

// Instance method: Get remaining budget
budgetTrackingSchema.methods.getRemainingBudget = function() {
  return Math.max(0, this.budgetLimit - this.totalCost);
};

// Instance method: Get usage percentage
budgetTrackingSchema.methods.getUsagePercentage = function() {
  return ((this.totalCost / this.budgetLimit) * 100).toFixed(1);
};

// Static method: Get or create today's tracking
budgetTrackingSchema.statics.getTodayTracking = async function() {
  const today = new Date().toISOString().split('T')[0];

  let tracking = await this.findOne({ date: today });

  if (!tracking) {
    tracking = await this.create({
      date: today,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      budgetLimit: parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00'),
      hourlyStats: []
    });
  }

  return tracking;
};

// Static method: Get monthly total
budgetTrackingSchema.statics.getMonthlyTotal = async function() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`;

  const monthlyDocs = await this.find({
    date: { $regex: `^${monthPrefix}` }
  });

  const total = monthlyDocs.reduce((sum, doc) => sum + doc.totalCost, 0);
  const requests = monthlyDocs.reduce((sum, doc) => sum + doc.totalRequests, 0);
  const tokens = monthlyDocs.reduce((sum, doc) => sum + doc.totalTokens, 0);

  return {
    month: monthPrefix,
    totalCost: total,
    totalRequests: requests,
    totalTokens: tokens,
    daysTracked: monthlyDocs.length
  };
};

// Static method: Get date range statistics
budgetTrackingSchema.statics.getDateRangeStats = async function(startDate, endDate) {
  const docs = await this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });

  const total = {
    totalCost: 0,
    totalRequests: 0,
    totalTokens: 0,
    days: docs.length
  };

  const byDay = docs.map(doc => ({
    date: doc.date,
    cost: doc.totalCost,
    requests: doc.totalRequests,
    tokens: doc.totalTokens,
    budgetExceeded: doc.budgetExceeded
  }));

  docs.forEach(doc => {
    total.totalCost += doc.totalCost;
    total.totalRequests += doc.totalRequests;
    total.totalTokens += doc.totalTokens;
  });

  return { total, byDay };
};

// Virtual: Cost per request
budgetTrackingSchema.virtual('costPerRequest').get(function() {
  if (this.totalRequests === 0) return 0;
  return (this.totalCost / this.totalRequests).toFixed(4);
});

// Virtual: Average tokens per request
budgetTrackingSchema.virtual('avgTokensPerRequest').get(function() {
  if (this.totalRequests === 0) return 0;
  return Math.round(this.totalTokens / this.totalRequests);
});

// Ensure virtuals are included
budgetTrackingSchema.set('toJSON', { virtuals: true });
budgetTrackingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.BudgetTracking || mongoose.model('BudgetTracking', budgetTrackingSchema);
