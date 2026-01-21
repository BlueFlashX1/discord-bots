const fs = require('fs');
const path = require('path');
const logger = require('./logger');

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
        logger.error('Error loading preferences:', error);
        return {};
      }
    }
    return {};
  }

  savePreferences() {
    try {
      fs.writeFileSync(this.preferencesFile, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      logger.error('Error saving preferences:', error);
    }
  }

  getNotificationChannel() {
    return this.preferences.notificationChannelId || null;
  }

  setNotificationChannel(channelId) {
    this.preferences.notificationChannelId = channelId;
    this.savePreferences();
    logger.info('Notification channel updated', { channelId });
  }
}

module.exports = new UserPreferences();
