const fs = require('fs');
const path = require('path');

class UserPreferences {
  constructor() {
    this.preferencesPath = path.join(__dirname, '../data/preferences.json');
    this.preferences = this.loadPreferences();
  }

  loadPreferences() {
    try {
      if (fs.existsSync(this.preferencesPath)) {
        const data = fs.readFileSync(this.preferencesPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return {};
  }

  savePreferences() {
    try {
      const dir = path.dirname(this.preferencesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.preferencesPath, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  getUserPreferences(userId) {
    if (!this.preferences[userId]) {
      this.preferences[userId] = {
        autoPost: false,
        autoPostChannel: null,
        preferredDifficulty: 'medium',
        preferredSource: 'random',
        codewarsUsername: null,
        masteryTracking: true,
      };
    }
    return this.preferences[userId];
  }

  setAutoPost(userId, enabled, channelId = null) {
    const userPrefs = this.getUserPreferences(userId);
    userPrefs.autoPost = enabled;
    if (channelId) {
      userPrefs.autoPostChannel = channelId;
    }
    this.savePreferences();
  }

  setDifficulty(userId, difficulty) {
    const userPrefs = this.getUserPreferences(userId);
    userPrefs.preferredDifficulty = difficulty;
    this.savePreferences();
  }

  setSource(userId, source) {
    const userPrefs = this.getUserPreferences(userId);
    userPrefs.preferredSource = source;
    this.savePreferences();
  }

  setCodewarsUsername(userId, username) {
    const userPrefs = this.getUserPreferences(userId);
    userPrefs.codewarsUsername = username;
    this.savePreferences();
  }

  setMasteryTracking(userId, enabled) {
    const userPrefs = this.getUserPreferences(userId);
    userPrefs.masteryTracking = enabled;
    this.savePreferences();
  }

  getAllAutoPostUsers() {
    return Object.entries(this.preferences)
      .filter(([userId, prefs]) => prefs.autoPost && prefs.autoPostChannel)
      .map(([userId, prefs]) => ({
        userId,
        channelId: prefs.autoPostChannel,
        difficulty: prefs.preferredDifficulty,
        source: prefs.preferredSource,
        codewarsUsername: prefs.codewarsUsername,
      }));
  }
}

module.exports = UserPreferences;
