const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SubscriptionManager {
  constructor({ dataPath, logger }) {
    this.dataPath = dataPath;
    this.logger = logger;
    this.ensureDataDirectory();
    this.loadSubscriptions();
  }

  ensureDataDirectory() {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dataPath)) {
      this.saveSubscriptions({ subscriptions: [] });
    }
  }

  loadSubscriptions() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      this.data = JSON.parse(data);
      this.logger.debug(`Loaded ${this.data.subscriptions?.length || 0} subscriptions`);
    } catch (error) {
      this.logger.error('Error loading subscriptions', error);
      this.data = { subscriptions: [] };
      this.saveSubscriptions(this.data);
    }
  }

  saveSubscriptions(data = this.data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
      this.data = data;
      this.logger.debug('Subscriptions saved');
    } catch (error) {
      this.logger.error('Error saving subscriptions', error);
      throw error;
    }
  }

  addSubscription({ name, amount, recurring, sourceLink, reminderDays, userId, lastCharged }) {
    const subscription = {
      id: uuidv4(),
      name,
      amount: parseFloat(amount),
      recurring: recurring.toLowerCase(), // 'monthly' or 'yearly'
      sourceLink,
      reminderDays: parseInt(reminderDays), // 1, 3, or 7
      userId,
      lastCharged: lastCharged || new Date().toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.data.subscriptions.push(subscription);
    this.saveSubscriptions();
    this.logger.info(`Added subscription: ${name} (${recurring})`);
    return subscription;
  }

  getSubscription(id) {
    return this.data.subscriptions.find((s) => s.id === id);
  }

  getUserSubscriptions(userId, activeOnly = false) {
    let subs = this.data.subscriptions.filter((s) => s.userId === userId);
    if (activeOnly) {
      subs = subs.filter((s) => s.active);
    }
    return subs;
  }

  getAllActiveSubscriptions() {
    return this.data.subscriptions.filter((s) => s.active);
  }

  updateSubscription(id, updates) {
    const index = this.data.subscriptions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Subscription not found');
    }

    this.data.subscriptions[index] = {
      ...this.data.subscriptions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveSubscriptions();
    this.logger.info(`Updated subscription: ${id}`);
    return this.data.subscriptions[index];
  }

  deactivateSubscription(id) {
    return this.updateSubscription(id, { active: false });
  }

  reactivateSubscription(id) {
    return this.updateSubscription(id, { active: true });
  }

  deleteSubscription(id) {
    const index = this.data.subscriptions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Subscription not found');
    }

    const deleted = this.data.subscriptions.splice(index, 1)[0];
    this.saveSubscriptions();
    this.logger.info(`Deleted subscription: ${id}`);
    return deleted;
  }

  calculateNextChargeDate(lastCharged, recurring) {
    const date = new Date(lastCharged);
    if (recurring === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (recurring === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  calculateReminderDate(nextChargeDate, reminderDays) {
    const date = new Date(nextChargeDate);
    date.setDate(date.getDate() - reminderDays);
    return date;
  }
}

module.exports = SubscriptionManager;
