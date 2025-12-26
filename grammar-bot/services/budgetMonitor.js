const BudgetTracking = require('../database/models/BudgetTracking');

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

      const tracking = await BudgetTracking.getTodayTracking();

      await tracking.recordRequest(model, inputTokens, outputTokens, cost, !failed);

      return {
        cost,
        totalCost: tracking.totalCost,
        budgetExceeded: tracking.budgetExceeded,
        remainingBudget: tracking.getRemainingBudget()
      };

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
      const tracking = await BudgetTracking.getTodayTracking();

      return tracking.hasBudget();

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
    try {
      const tracking = await BudgetTracking.getTodayTracking();

      return {
        date: tracking.date,
        totalCost: tracking.totalCost,
        budgetLimit: tracking.budgetLimit,
        remainingBudget: tracking.getRemainingBudget(),
        usagePercentage: tracking.getUsagePercentage(),
        budgetExceeded: tracking.budgetExceeded,
        totalRequests: tracking.totalRequests,
        successfulRequests: tracking.successfulRequests,
        failedRequests: tracking.failedRequests,
        totalTokens: tracking.totalTokens,
        costPerRequest: tracking.costPerRequest,
        avgTokensPerRequest: tracking.avgTokensPerRequest
      };

    } catch (error) {
      console.error('Error getting budget status:', error);
      return null;
    }
  }

  /**
   * Get monthly budget status
   */
  async getMonthlyBudgetStatus() {
    try {
      const monthly = await BudgetTracking.getMonthlyTotal();

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
    console.log('📊 New day - budget reset');
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
      const tracking = await BudgetTracking.getTodayTracking();

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

    } catch (error) {
      console.error('Error getting hourly pattern:', error);
      return null;
    }
  }
}

module.exports = BudgetMonitor;
