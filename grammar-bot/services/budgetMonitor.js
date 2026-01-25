const fs = require('fs');
const path = require('path');

// Conditional loading - only if MongoDB is available and connected
let BudgetTracking = null;
let jsonModeForced = false; // Track if we've forced JSON mode due to connection issues

function getBudgetTracking() {
  // If we've already forced JSON mode, don't try MongoDB again
  if (jsonModeForced) {
    return null;
  }
  
  if (BudgetTracking !== null) {
    // Double-check connection is still valid before returning
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // Connection lost, force JSON mode
        BudgetTracking = null;
        jsonModeForced = true;
        console.log('[BudgetMonitor] MongoDB connection lost, forcing JSON mode');
        return null;
      }
      return BudgetTracking;
    } catch (error) {
      // Mongoose not available, force JSON mode
      BudgetTracking = null;
      jsonModeForced = true;
      return null;
    }
  }
  
  // Check if database is using JSON mode (MongoDB not connected)
  try {
    const db = require('../database/db');
    if (db.isUsingJSON && db.isUsingJSON()) {
      jsonModeForced = true;
      return null; // Force JSON mode
    }
  } catch (error) {
    // db module might not be available, continue to try loading model
  }
  
  // Check if MONGODB_URI is set - if not, use JSON mode
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
    console.log('[BudgetMonitor] No MONGODB_URI set, using JSON mode');
    jsonModeForced = true;
    return null;
  }
  
  // Only try to load MongoDB model if we're not in JSON mode
  try {
    const mongoose = require('mongoose');
    
    // Check connection state: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) {
      // Not connected (0, 2, or 3) - use JSON mode
      console.log(`[BudgetMonitor] MongoDB not connected (readyState: ${readyState}), using JSON mode`);
      jsonModeForced = true;
      return null;
    }
    
    // Connection is ready, try to load model
    BudgetTracking = require('../database/models/BudgetTracking');
    return BudgetTracking;
  } catch (error) {
    console.log('[BudgetMonitor] Error loading MongoDB model, using JSON mode:', error.message);
    jsonModeForced = true;
    return null; // Will use JSON storage
  }
}

// JSON storage for budget tracking
const DATA_DIR = path.join(__dirname, '../data');
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');

function initBudgetJSON() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BUDGET_FILE)) {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({}, null, 2));
  }
}

function readBudgetJSON() {
  try {
    initBudgetJSON();
    if (!fs.existsSync(BUDGET_FILE)) {
      console.warn('[BudgetMonitor] Budget file does not exist, creating new one');
      writeBudgetJSON({});
      return {};
    }
    const data = fs.readFileSync(BUDGET_FILE, 'utf8');
    if (!data || data.trim() === '') {
      console.warn('[BudgetMonitor] Budget file is empty, initializing with empty object');
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('[BudgetMonitor] Error reading budget JSON:', error.message);
    // Return empty object on error - will be initialized on first write
    return {};
  }
}

function writeBudgetJSON(data) {
  try {
    initBudgetJSON();
    // Write to a temporary file first, then rename (atomic write)
    const tempFile = BUDGET_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, BUDGET_FILE);
  } catch (error) {
    console.error('[BudgetMonitor] Error writing budget JSON:', error.message);
    console.error('[BudgetMonitor] Error stack:', error.stack);
    // Don't throw - log and continue, data will be lost but system won't crash
    // Caller should handle gracefully
    console.warn('[BudgetMonitor] Budget data write failed, but continuing operation');
  }
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTodayTrackingJSON(budgetLimit) {
  try {
    const data = readBudgetJSON();
    const today = getTodayDate();

    if (!data[today]) {
      const newTracking = {
        date: today,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        budgetLimit: budgetLimit,
        budgetExceeded: false,
        modelUsage: {},
        hourlyStats: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data[today] = newTracking;
      try {
        writeBudgetJSON(data);
      } catch (writeError) {
        console.error('Error writing budget JSON during initialization:', writeError);
        // Continue anyway - we'll return the in-memory object
      }
    }

    const tracking = data[today];
    if (!tracking) {
      console.error('Error: Failed to create or retrieve tracking for today:', today);
      // Return a minimal valid tracking object instead of null
      return {
        date: today,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        budgetLimit: budgetLimit,
        budgetExceeded: false,
        modelUsage: {},
        hourlyStats: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return tracking;
  } catch (error) {
    console.error('Error in getTodayTrackingJSON:', error);
    console.error('Error stack:', error.stack);
    // Return a minimal valid tracking object instead of null
    const today = getTodayDate();
    return {
      date: today,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      budgetLimit: budgetLimit,
      budgetExceeded: false,
      modelUsage: {},
      hourlyStats: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

function saveTodayTrackingJSON(tracking) {
  const data = readBudgetJSON();
  data[tracking.date] = tracking;
  writeBudgetJSON(data);
}

class BudgetMonitor {
  constructor() {
    this.dailyLimit = parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00');
    this.monthlyLimit = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '100.00');

    // Pricing per 1M tokens (as of 2025)
    this.pricing = {
      'gpt-4o-mini': {
        input: 0.150,   // $0.150 per 1M input tokens
        output: 0.600   // $0.600 per 1M output tokens
      },
      'gpt-4o': {
        input: 2.50,
        output: 10.00
      },
      'gpt-4-turbo': {
        input: 10.00,
        output: 30.00
      }
    };
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(inputTokens, outputTokens, model = 'gpt-4o-mini') {
    const modelPricing = this.pricing[model] || this.pricing['gpt-4o-mini'];

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Track an API request
   */
  async trackRequest(model, inputTokens, outputTokens, failed = false) {
    try {
      const cost = this.calculateCost(inputTokens, outputTokens, model);
      const BudgetTrackingModel = getBudgetTracking();

      if (BudgetTrackingModel) {
        // MongoDB mode
        const tracking = await BudgetTrackingModel.getTodayTracking();
        await tracking.recordRequest(model, inputTokens, outputTokens, cost, !failed);

        return {
          cost,
          totalCost: tracking.totalCost,
          budgetExceeded: tracking.budgetExceeded,
          remainingBudget: tracking.getRemainingBudget()
        };
      } else {
        // JSON mode
        const tracking = getTodayTrackingJSON(this.dailyLimit);
        const currentHour = new Date().getHours();

        tracking.totalRequests += 1;
        if (failed) {
          tracking.failedRequests += 1;
        } else {
          tracking.successfulRequests += 1;
        }

        tracking.totalInputTokens += inputTokens;
        tracking.totalOutputTokens += outputTokens;
        tracking.totalTokens += (inputTokens + outputTokens);
        tracking.totalCost += cost;

        // Update model usage
        const modelKey = model || 'gpt-4o-mini';
        if (!tracking.modelUsage[modelKey]) {
          tracking.modelUsage[modelKey] = {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            cost: 0
          };
        }
        tracking.modelUsage[modelKey].requests += 1;
        tracking.modelUsage[modelKey].inputTokens += inputTokens;
        tracking.modelUsage[modelKey].outputTokens += outputTokens;
        tracking.modelUsage[modelKey].cost += cost;

        // Update hourly stats
        let hourStat = tracking.hourlyStats.find(h => h.hour === currentHour);
        if (!hourStat) {
          hourStat = { hour: currentHour, requests: 0, tokens: 0, cost: 0 };
          tracking.hourlyStats.push(hourStat);
        }
        hourStat.requests += 1;
        hourStat.tokens += (inputTokens + outputTokens);
        hourStat.cost += cost;

        // Check budget
        if (tracking.totalCost >= tracking.budgetLimit) {
          tracking.budgetExceeded = true;
        }

        tracking.updatedAt = new Date().toISOString();
        saveTodayTrackingJSON(tracking);

        return {
          cost,
          totalCost: tracking.totalCost,
          budgetExceeded: tracking.budgetExceeded,
          remainingBudget: Math.max(0, tracking.budgetLimit - tracking.totalCost)
        };
      }

    } catch (error) {
      console.error('Error tracking request:', error);
      return null;
    }
  }

  /**
   * Check if budget is available
   */
  async checkBudget() {
    try {
      const BudgetTrackingModel = getBudgetTracking();
      if (BudgetTrackingModel) {
        // MongoDB mode
        const tracking = await BudgetTrackingModel.getTodayTracking();
        return tracking.hasBudget();
      } else {
        // JSON mode
        const tracking = getTodayTrackingJSON(this.dailyLimit);
        return !tracking.budgetExceeded && tracking.totalCost < tracking.budgetLimit;
      }

    } catch (error) {
      console.error('Error checking budget:', error);
      // Allow requests if we can't check budget
      return true;
    }
  }

  /**
   * Get budget status
   */
  async getBudgetStatus() {
    // Default fallback status to return on any error
    const getDefaultStatus = () => ({
      date: getTodayDate(),
      totalCost: 0,
      budgetLimit: this.dailyLimit,
      remainingBudget: this.dailyLimit,
      usagePercentage: 0,
      budgetExceeded: false,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      costPerRequest: 0,
      avgTokensPerRequest: 0
    });

    try {
      console.log('[BudgetMonitor] getBudgetStatus() called');
      const BudgetTrackingModel = getBudgetTracking();
      console.log('[BudgetMonitor] BudgetTrackingModel:', BudgetTrackingModel ? 'MongoDB' : 'JSON');
      if (BudgetTrackingModel) {
        // MongoDB mode
        try {
          const tracking = await BudgetTrackingModel.getTodayTracking();
          if (!tracking) {
            console.error('Error getting budget status: MongoDB tracking is null');
            return getDefaultStatus();
          }
          return {
            date: tracking.date,
            totalCost: tracking.totalCost || 0,
            budgetLimit: tracking.budgetLimit || this.dailyLimit,
            remainingBudget: tracking.getRemainingBudget ? tracking.getRemainingBudget() : Math.max(0, (tracking.budgetLimit || this.dailyLimit) - (tracking.totalCost || 0)),
            usagePercentage: tracking.getUsagePercentage ? parseFloat(tracking.getUsagePercentage()) : (tracking.budgetLimit > 0 ? parseFloat((((tracking.totalCost || 0) / tracking.budgetLimit) * 100).toFixed(1)) : 0),
            budgetExceeded: tracking.budgetExceeded || false,
            totalRequests: tracking.totalRequests || 0,
            successfulRequests: tracking.successfulRequests || 0,
            failedRequests: tracking.failedRequests || 0,
            totalTokens: tracking.totalTokens || 0,
            costPerRequest: tracking.costPerRequest || 0,
            avgTokensPerRequest: tracking.avgTokensPerRequest || 0
          };
        } catch (mongoError) {
          console.error('Error in MongoDB mode:', mongoError.message);
          // If MongoDB times out or fails, force JSON mode for future calls
          if (mongoError.name === 'MongooseError' || mongoError.message.includes('buffering timed out') || mongoError.message.includes('timeout')) {
            console.error('[BudgetMonitor] MongoDB timeout detected, forcing JSON mode');
            jsonModeForced = true;
            BudgetTracking = null;
            // Fall through to JSON mode
            console.log('[BudgetMonitor] Falling back to JSON mode...');
            const tracking = getTodayTrackingJSON(this.dailyLimit);
            if (!tracking) {
              return getDefaultStatus();
            }
            const costPerRequest = tracking.totalRequests > 0
              ? parseFloat((tracking.totalCost / tracking.totalRequests).toFixed(4))
              : 0;
            const avgTokensPerRequest = tracking.totalRequests > 0
              ? Math.round(tracking.totalTokens / tracking.totalRequests)
              : 0;
            const usagePercentage = tracking.budgetLimit > 0
              ? parseFloat(((tracking.totalCost / tracking.budgetLimit) * 100).toFixed(1))
              : 0;

            return {
              date: tracking.date,
              totalCost: tracking.totalCost || 0,
              budgetLimit: tracking.budgetLimit || this.dailyLimit,
              remainingBudget: Math.max(0, (tracking.budgetLimit || this.dailyLimit) - (tracking.totalCost || 0)),
              usagePercentage: usagePercentage,
              budgetExceeded: tracking.budgetExceeded || false,
              totalRequests: tracking.totalRequests || 0,
              successfulRequests: tracking.successfulRequests || 0,
              failedRequests: tracking.failedRequests || 0,
              totalTokens: tracking.totalTokens || 0,
              costPerRequest: costPerRequest,
              avgTokensPerRequest: avgTokensPerRequest
            };
          }
          return getDefaultStatus();
        }
      } else {
        // JSON mode
        console.log('[BudgetMonitor] Using JSON mode, calling getTodayTrackingJSON()');
        try {
          const tracking = getTodayTrackingJSON(this.dailyLimit);
          console.log('[BudgetMonitor] Tracking result:', tracking ? 'Success' : 'Failed');
          if (!tracking) {
            console.error('Error getting budget status: JSON tracking is null or failed to create');
            return getDefaultStatus();
          }
          const costPerRequest = tracking.totalRequests > 0
            ? parseFloat((tracking.totalCost / tracking.totalRequests).toFixed(4))
            : 0;
          const avgTokensPerRequest = tracking.totalRequests > 0
            ? Math.round(tracking.totalTokens / tracking.totalRequests)
            : 0;
          const usagePercentage = tracking.budgetLimit > 0
            ? parseFloat(((tracking.totalCost / tracking.budgetLimit) * 100).toFixed(1))
            : 0;

          return {
            date: tracking.date,
            totalCost: tracking.totalCost || 0,
            budgetLimit: tracking.budgetLimit || this.dailyLimit,
            remainingBudget: Math.max(0, (tracking.budgetLimit || this.dailyLimit) - (tracking.totalCost || 0)),
            usagePercentage: usagePercentage,
            budgetExceeded: tracking.budgetExceeded || false,
            totalRequests: tracking.totalRequests || 0,
            successfulRequests: tracking.successfulRequests || 0,
            failedRequests: tracking.failedRequests || 0,
            totalTokens: tracking.totalTokens || 0,
            costPerRequest: costPerRequest,
            avgTokensPerRequest: avgTokensPerRequest
          };
        } catch (jsonError) {
          console.error('Error in JSON mode:', jsonError);
          console.error('JSON error stack:', jsonError.stack);
          return getDefaultStatus();
        }
      }

    } catch (error) {
      console.error('Error getting budget status:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      // Always return a default status instead of null
      return getDefaultStatus();
    }
  }

  /**
   * Get monthly budget status
   */
  async getMonthlyBudgetStatus() {
    try {
      const BudgetTrackingModel = getBudgetTracking();
      if (BudgetTrackingModel) {
        // MongoDB mode
        const monthly = await BudgetTrackingModel.getMonthlyTotal();
        return {
          month: monthly.month,
          totalCost: monthly.totalCost,
          budgetLimit: this.monthlyLimit,
          remainingBudget: Math.max(0, this.monthlyLimit - monthly.totalCost),
          usagePercentage: ((monthly.totalCost / this.monthlyLimit) * 100).toFixed(1),
          budgetExceeded: monthly.totalCost >= this.monthlyLimit,
          totalRequests: monthly.totalRequests,
          totalTokens: monthly.totalTokens,
          daysTracked: monthly.daysTracked,
          avgCostPerDay: (monthly.totalCost / monthly.daysTracked).toFixed(2)
        };
      } else {
        // JSON mode
        const data = readBudgetJSON();
        const monthPrefix = getCurrentMonth();
        const monthlyEntries = Object.entries(data).filter(([date]) => date.startsWith(monthPrefix));

        const monthly = monthlyEntries.reduce(
          (acc, [_, entry]) => {
            acc.totalCost += entry.totalCost || 0;
            acc.totalRequests += entry.totalRequests || 0;
            acc.totalTokens += entry.totalTokens || 0;
            return acc;
          },
          { totalCost: 0, totalRequests: 0, totalTokens: 0 }
        );

        const daysTracked = monthlyEntries.length || 1;
        const usagePercentage = this.monthlyLimit > 0
          ? ((monthly.totalCost / this.monthlyLimit) * 100).toFixed(1)
          : '0.0';

        return {
          month: monthPrefix,
          totalCost: monthly.totalCost,
          budgetLimit: this.monthlyLimit,
          remainingBudget: Math.max(0, this.monthlyLimit - monthly.totalCost),
          usagePercentage: usagePercentage,
          budgetExceeded: monthly.totalCost >= this.monthlyLimit,
          totalRequests: monthly.totalRequests,
          totalTokens: monthly.totalTokens,
          daysTracked: daysTracked,
          avgCostPerDay: (monthly.totalCost / daysTracked).toFixed(2)
        };
      }

    } catch (error) {
      console.error('Error getting monthly budget status:', error);
      return null;
    }
  }

  /**
   * Get detailed tracking report
   */
  async getDetailedReport(days = 7) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const start = startDate.toISOString().split('T')[0];

      const stats = await BudgetTracking.getDateRangeStats(start, endDate);

      return {
        period: `${start} to ${endDate}`,
        total: stats.total,
        byDay: stats.byDay,
        dailyAverage: {
          cost: (stats.total.totalCost / stats.total.days).toFixed(4),
          requests: Math.round(stats.total.totalRequests / stats.total.days),
          tokens: Math.round(stats.total.totalTokens / stats.total.days)
        }
      };

    } catch (error) {
      console.error('Error getting detailed report:', error);
      return null;
    }
  }

  /**
   * Reset daily budget (called automatically by system)
   */
  async resetDailyBudget() {
    // This happens automatically when a new day starts
    // getTodayTracking() creates new record for new day
    console.log('New day - budget reset');
  }

  /**
   * Get cost savings suggestions
   */
  async getSuggestions() {
    const status = await this.getBudgetStatus();

    if (!status) return [];

    const suggestions = [];

    if (status.usagePercentage > 80) {
      suggestions.push({
        type: 'warning',
        message: `Budget usage at ${status.usagePercentage}% - approaching daily limit`
      });
    }

    if (status.costPerRequest > 0.01) {
      suggestions.push({
        type: 'optimization',
        message: 'Consider shortening messages or using batch checking to reduce costs'
      });
    }

    if (status.failedRequests > 5) {
      suggestions.push({
        type: 'error',
        message: `${status.failedRequests} failed requests today - check API connectivity`
      });
    }

    if (status.budgetExceeded) {
      suggestions.push({
        type: 'critical',
        message: 'Daily budget exceeded - grammar checking disabled until tomorrow'
      });
    }

    return suggestions;
  }

  /**
   * Format cost for display
   */
  formatCost(cost) {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)}¢`;
    }
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Get hourly usage pattern
   */
  async getHourlyPattern() {
    try {
      const BudgetTrackingModel = getBudgetTracking();
      if (BudgetTrackingModel) {
        // MongoDB mode
        const tracking = await BudgetTrackingModel.getTodayTracking();
        const hourlyData = new Array(24).fill(0).map((_, hour) => {
          const stat = tracking.hourlyStats.find(h => h.hour === hour);
          return {
            hour,
            requests: stat ? stat.requests : 0,
            cost: stat ? stat.cost : 0,
            tokens: stat ? stat.tokens : 0
          };
        });
        return hourlyData;
      } else {
        // JSON mode
        const tracking = getTodayTrackingJSON(this.dailyLimit);
        const hourlyData = new Array(24).fill(0).map((_, hour) => {
          const stat = tracking.hourlyStats.find(h => h.hour === hour);
          return {
            hour,
            requests: stat ? stat.requests : 0,
            cost: stat ? stat.cost : 0,
            tokens: stat ? stat.tokens : 0
          };
        });
        return hourlyData;
      }

    } catch (error) {
      console.error('Error getting hourly pattern:', error);
      return null;
    }
  }
}

module.exports = BudgetMonitor;
