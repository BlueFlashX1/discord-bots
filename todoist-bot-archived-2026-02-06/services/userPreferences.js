const fs = require('fs');
const path = require('path');

class UserPreferences {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.preferencesFile = path.join(this.dataDir, 'userPreferences.json');
    this.ensureDataDir();
    this.preferences = this.loadPreferences();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadPreferences() {
    if (fs.existsSync(this.preferencesFile)) {
      try {
        const data = fs.readFileSync(this.preferencesFile, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error loading preferences:', error);
        return {};
      }
    }
    return {};
  }

  savePreferences() {
    try {
      fs.writeFileSync(this.preferencesFile, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  getUserPreferences(userId) {
    return (
      this.preferences[userId] || {
        dailyOverviewChannelId: null,
      }
    );
  }

  setDailyOverviewChannel(userId, channelId) {
    if (!this.preferences[userId]) {
      this.preferences[userId] = {};
    }
    this.preferences[userId].dailyOverviewChannelId = channelId;
    this.savePreferences();
  }

  getDailyOverviewChannel(userId) {
    const prefs = this.getUserPreferences(userId);
    return prefs.dailyOverviewChannelId || null;
  }
}

module.exports = new UserPreferences();
