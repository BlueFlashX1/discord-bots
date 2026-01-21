const fs = require('fs');
const path = require('path');

class ApiQuotaManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/quota.json');
    this.dailyLimit = 10000; // YouTube API default daily quota
    this.quota = this.loadQuota();
    this.paused = false;
  }

  loadQuota() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        const quota = JSON.parse(data);

        // Check if we need to reset (new day)
        const today = new Date().toDateString();
        if (quota.date !== today) {
          // Reset for new day
          return {
            date: today,
            used: 0,
            exceeded: false,
            lastReset: new Date().toISOString(),
          };
        }

        return quota;
      }
    } catch (error) {
      console.error('Error loading quota:', error);
    }

    return {
      date: new Date().toDateString(),
      used: 0,
      exceeded: false,
      lastReset: new Date().toISOString(),
    };
  }

  saveQuota() {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.quota, null, 2));
    } catch (error) {
      console.error('Error saving quota:', error);
    }
  }

  canMakeRequest(cost) {
    if (this.paused) {
      return false;
    }

    if (this.quota.exceeded) {
      return false;
    }

    return this.quota.used + cost <= this.dailyLimit;
  }

  recordRequest(cost) {
    this.quota.used += cost;
    this.saveQuota();
  }

  recordQuotaExceeded() {
    this.quota.exceeded = true;
    this.saveQuota();
  }

  resetQuota() {
    this.quota = {
      date: new Date().toDateString(),
      used: 0,
      exceeded: false,
      lastReset: new Date().toISOString(),
    };
    this.saveQuota();
  }

  getQuotaInfo() {
    const remaining = this.dailyLimit - this.quota.used;
    const percentage = (this.quota.used / this.dailyLimit) * 100;

    return {
      used: this.quota.used,
      limit: this.dailyLimit,
      remaining: remaining,
      percentage: percentage.toFixed(2),
      exceeded: this.quota.exceeded,
      paused: this.paused,
      lastReset: this.quota.lastReset,
      date: this.quota.date,
    };
  }

  pause() {
    this.paused = true;
    this.saveQuota();
  }

  resume() {
    this.paused = false;
    this.saveQuota();
  }

  isPaused() {
    return this.paused;
  }

  // Auto-reset check (should be called periodically)
  checkAndReset() {
    const today = new Date().toDateString();
    if (this.quota.date !== today) {
      this.resetQuota();
      return true;
    }
    return false;
  }
}

module.exports = ApiQuotaManager;
