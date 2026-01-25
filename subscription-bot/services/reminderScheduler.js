const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class ReminderScheduler {
  constructor({ client, subscriptionManager, logger }) {
    this.client = client;
    this.subscriptionManager = subscriptionManager;
    this.logger = logger;
    this.intervals = new Map();
    this.activeReminders = new Map(); // Track active reminder embeds
  }

  start() {
    this.logger.info('Starting reminder scheduler...');
    this.scheduleAllReminders();
    // Check every hour for new reminders
    setInterval(() => {
      this.scheduleAllReminders();
    }, 60 * 60 * 1000);
  }

  scheduleAllReminders() {
    // Clear existing intervals
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();

    const activeSubs = this.subscriptionManager.getAllActiveSubscriptions();
    this.logger.debug(`Scheduling reminders for ${activeSubs.length} subscriptions`);

    activeSubs.forEach((sub) => {
      this.scheduleReminder(sub);
    });
  }

  scheduleReminder(subscription) {
    const nextChargeDate = this.subscriptionManager.calculateNextChargeDate(
      subscription.lastCharged,
      subscription.recurring
    );
    const reminderDate = this.subscriptionManager.calculateReminderDate(
      nextChargeDate,
      subscription.reminderDays
    );

    const now = new Date();
    const timeUntilReminder = reminderDate.getTime() - now.getTime();

    if (timeUntilReminder <= 0) {
      // Reminder is overdue, send immediately
      this.sendReminder(subscription, nextChargeDate);
    } else {
      // Schedule reminder
      const timeout = setTimeout(() => {
        this.sendReminder(subscription, nextChargeDate);
      }, timeUntilReminder);

      this.intervals.set(subscription.id, timeout);
      this.logger.debug(
        `Scheduled reminder for ${subscription.name} in ${Math.round(timeUntilReminder / (1000 * 60 * 60))} hours`
      );
    }
  }

  async sendReminder(subscription, nextChargeDate) {
    try {
      const user = await this.client.users.fetch(subscription.userId);
      if (!user) {
        this.logger.warn(`User ${subscription.userId} not found`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🔔 Subscription Reminder')
        .setDescription(`**${subscription.name}** is due soon!`)
        .setColor(0xff9900)
        .addFields(
          {
            name: '💰 Amount',
            value: `$${subscription.amount.toFixed(2)}`,
            inline: true,
          },
          {
            name: '📅 Next Charge',
            value: `<t:${Math.floor(nextChargeDate.getTime() / 1000)}:F>`,
            inline: true,
          },
          {
            name: '🔄 Recurring',
            value: subscription.recurring.charAt(0).toUpperCase() + subscription.recurring.slice(1),
            inline: true,
          },
          {
            name: '🔗 Source Link',
            value: subscription.sourceLink,
          }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sub_continue_${subscription.id}`)
          .setLabel('✅ Continue')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sub_cancel_${subscription.id}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const message = await user.send({
        embeds: [embed],
        components: [row],
      });

      // Store reminder info
      this.activeReminders.set(subscription.id, {
        messageId: message.id,
        nextChargeDate: nextChargeDate.toISOString(),
      });

      this.logger.info(`Sent reminder for ${subscription.name} to ${user.tag}`);
    } catch (error) {
      this.logger.error(`Error sending reminder for ${subscription.id}`, error);
    }
  }

  async handleContinue(subscriptionId, userId) {
    const reminder = this.activeReminders.get(subscriptionId);
    if (!reminder) {
      return;
    }

    const subscription = this.subscriptionManager.getSubscription(subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      return;
    }

    const nextChargeDate = new Date(reminder.nextChargeDate);
    const oneDayBefore = new Date(nextChargeDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    const now = new Date();
    const timeUntilOneDayBefore = oneDayBefore.getTime() - now.getTime();

    if (timeUntilOneDayBefore <= 0) {
      // Already past 1-day reminder, confirm and reschedule
      await this.confirmAndReschedule(subscription, nextChargeDate);
    } else {
      // Schedule 1-day confirmation reminder
      setTimeout(async () => {
        await this.sendOneDayConfirmation(subscription, nextChargeDate);
      }, timeUntilOneDayBefore);
    }

    this.activeReminders.delete(subscriptionId);
  }

  async sendOneDayConfirmation(subscription, nextChargeDate) {
    try {
      const user = await this.client.users.fetch(subscription.userId);
      if (!user) {
        this.logger.warn(`User ${subscription.userId} not found for 1-day confirmation`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('⏰ Final Confirmation')
        .setDescription(`**${subscription.name}** will be charged tomorrow!`)
        .setColor(0xff9900)
        .addFields(
          {
            name: '💰 Amount',
            value: `$${subscription.amount.toFixed(2)}`,
            inline: true,
          },
          {
            name: '📅 Charge Date',
            value: `<t:${Math.floor(nextChargeDate.getTime() / 1000)}:F>`,
            inline: true,
          },
          {
            name: '🔗 Source',
            value: subscription.sourceLink,
          }
        )
        .setFooter({ text: 'Please confirm if you want to continue or cancel' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sub_confirm_${subscription.id}`)
          .setLabel('✅ Confirm Continue')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sub_cancel_${subscription.id}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      const message = await user.send({
        embeds: [embed],
        components: [row],
      });

      // Store confirmation reminder
      this.activeReminders.set(`${subscription.id}_confirm`, {
        messageId: message.id,
        nextChargeDate: nextChargeDate.toISOString(),
      });

      this.logger.info(`Sent 1-day confirmation for ${subscription.name} to ${user.tag}`);
    } catch (error) {
      this.logger.error(`Error sending 1-day confirmation for ${subscription.id}`, error);
    }
  }

  async confirmAndReschedule(subscription, chargeDate) {
    try {
      const user = await this.client.users.fetch(subscription.userId);
      if (!user) {
        this.logger.warn(`User ${subscription.userId} not found for confirmation`);
        return;
      }

      // Update last charged date to the charge date
      const updatedSubscription = this.subscriptionManager.updateSubscription(subscription.id, {
        lastCharged: chargeDate.toISOString(),
      });

      // Clear any active reminders
      this.activeReminders.delete(subscription.id);
      this.activeReminders.delete(`${subscription.id}_confirm`);
      if (this.intervals.has(`${subscription.id}_confirm`)) {
        clearTimeout(this.intervals.get(`${subscription.id}_confirm`));
        this.intervals.delete(`${subscription.id}_confirm`);
      }

      // Reschedule for next cycle
      this.scheduleReminder(updatedSubscription);

      const nextCharge = this.subscriptionManager.calculateNextChargeDate(
        chargeDate.toISOString(),
        updatedSubscription.recurring
      );
      const nextReminder = this.subscriptionManager.calculateReminderDate(
        nextCharge,
        updatedSubscription.reminderDays
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Subscription Continued')
        .setDescription(`**${updatedSubscription.name}** has been confirmed and rescheduled.`)
        .setColor(0x00ff00)
        .addFields(
          {
            name: '📅 Next Charge',
            value: `<t:${Math.floor(nextCharge.getTime() / 1000)}:F>`,
            inline: true,
          },
          {
            name: '🔔 Next Reminder',
            value: `<t:${Math.floor(nextReminder.getTime() / 1000)}:F>`,
            inline: true,
          }
        )
        .setTimestamp();

      await user.send({ embeds: [embed] });
      this.logger.info(`Confirmed and rescheduled ${updatedSubscription.name}`);
    } catch (error) {
      this.logger.error(`Error confirming subscription ${subscription.id}`, error);
    }
  }

  async handleCancel(subscriptionId, userId) {
    const subscription = this.subscriptionManager.getSubscription(subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      return;
    }

    try {
      const user = await this.client.users.fetch(subscription.userId);
      if (!user) return;

      // Deactivate subscription
      this.subscriptionManager.deactivateSubscription(subscriptionId);
      this.activeReminders.delete(subscriptionId);

      // Clear any scheduled reminders
      if (this.intervals.has(subscriptionId)) {
        clearTimeout(this.intervals.get(subscriptionId));
        this.intervals.delete(subscriptionId);
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Subscription Cancelled')
        .setDescription(`**${subscription.name}** has been marked as inactive.`)
        .setColor(0xff0000)
        .addFields({
          name: '🔗 Cancel Link',
          value: subscription.sourceLink,
        })
        .setFooter({ text: 'Use the link above to complete cancellation on the provider website' })
        .setTimestamp();

      await user.send({ embeds: [embed] });
      this.logger.info(`Cancelled subscription ${subscription.name}`);
    } catch (error) {
      this.logger.error(`Error cancelling subscription ${subscription.id}`, error);
    }
  }

  stop() {
    this.intervals.forEach((interval) => clearTimeout(interval));
    this.intervals.clear();
    this.activeReminders.clear();
    this.logger.info('Reminder scheduler stopped');
  }
}

module.exports = ReminderScheduler;
