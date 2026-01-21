const cron = require('node-cron');
const logger = require('./logger');
const processManager = require('./processManager');
const configManager = require('./configManager');

class Scheduler {
  constructor() {
    this.scheduledJobs = new Map(); // jobId -> { task, config, lastRun, nextRun }
    this.discordClient = null;
    this.notificationChannelId = null;
    logger.debug('Scheduler initialized');
  }

  setDiscordClient(client, channelId) {
    this.discordClient = client;
    this.notificationChannelId = channelId;
    logger.debug('Discord client set for scheduler notifications', { channelId });
  }

  generateJobId(commandId, schedule) {
    return `${commandId}_${schedule.replace(/\s+/g, '_')}`;
  }

  validateCron(expression) {
    return cron.validate(expression);
  }

  async scheduleCommand(commandId, cronExpression, options = {}) {
    const commandConfig = configManager.getCommand(commandId);
    if (!commandConfig) {
      throw new Error(`Command "${commandId}" not found in configuration`);
    }

    if (!this.validateCron(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const jobId = this.generateJobId(commandId, cronExpression);

    if (this.scheduledJobs.has(jobId)) {
      throw new Error(`Schedule already exists for "${commandId}" with this cron expression`);
    }

    const jobConfig = {
      commandId,
      cronExpression,
      enabled: options.enabled !== false,
      notifyOnComplete: options.notifyOnComplete !== false,
      notifyOnError: options.notifyOnError !== false,
      createdAt: Date.now(),
      lastRun: null,
      lastStatus: null,
    };

    const task = cron.schedule(cronExpression, async () => {
      await this.executeScheduledCommand(jobId);
    }, {
      scheduled: jobConfig.enabled,
      timezone: options.timezone || 'UTC',
    });

    this.scheduledJobs.set(jobId, {
      task,
      config: jobConfig,
    });

    logger.info('Command scheduled', {
      jobId,
      commandId,
      cronExpression,
      enabled: jobConfig.enabled,
    });

    return { jobId, config: jobConfig };
  }

  async executeScheduledCommand(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      logger.warn('Scheduled job not found', { jobId });
      return;
    }

    const { config: jobConfig } = job;
    const commandConfig = configManager.getCommand(jobConfig.commandId);

    if (!commandConfig) {
      logger.error('Command config not found for scheduled job', { jobId, commandId: jobConfig.commandId });
      return;
    }

    logger.info('Executing scheduled command', { jobId, commandId: jobConfig.commandId });

    jobConfig.lastRun = Date.now();

    try {
      const processId = await processManager.startProcess(
        commandConfig,
        null, // No Discord message for scheduled runs
        'scheduler', // Virtual user ID for scheduler
        ['scheduler'] // Scheduler has admin access
      );

      // Wait for process to complete (with timeout)
      const maxWait = commandConfig.timeout || 300000; // 5 min default
      const startTime = Date.now();

      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const processData = processManager.getProcess(processId);
          if (!processData || processData.status !== 'running' || Date.now() - startTime > maxWait) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });

      const processData = processManager.getProcess(processId);
      jobConfig.lastStatus = processData?.status || 'unknown';

      if (jobConfig.notifyOnComplete && this.discordClient && this.notificationChannelId) {
        await this.sendNotification(jobId, jobConfig, processData);
      }

      // Schedule cleanup
      processManager.scheduleCleanup(processId);

      logger.info('Scheduled command completed', {
        jobId,
        commandId: jobConfig.commandId,
        status: jobConfig.lastStatus,
      });
    } catch (error) {
      jobConfig.lastStatus = 'error';
      logger.logError(error, { jobId, commandId: jobConfig.commandId, phase: 'scheduled_execution' });

      if (jobConfig.notifyOnError && this.discordClient && this.notificationChannelId) {
        await this.sendErrorNotification(jobId, jobConfig, error);
      }
    }
  }

  async sendNotification(jobId, jobConfig, processData) {
    try {
      const channel = this.discordClient.channels.cache.get(this.notificationChannelId);
      if (!channel) return;

      const statusEmoji = processData?.status === 'completed' ? '✅' :
                          processData?.status === 'error' ? '❌' : '⚠️';

      const commandConfig = configManager.getCommand(jobConfig.commandId);

      await channel.send({
        embeds: [{
          title: `${statusEmoji} Scheduled Task: ${commandConfig?.label || jobConfig.commandId}`,
          description: `Cron: \`${jobConfig.cronExpression}\``,
          color: processData?.status === 'completed' ? 0x2ecc71 :
                 processData?.status === 'error' ? 0xe74c3c : 0xf1c40f,
          fields: [
            { name: 'Status', value: processData?.status || 'unknown', inline: true },
            { name: 'Exit Code', value: String(processData?.exitCode ?? 'N/A'), inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (error) {
      logger.error('Failed to send scheduler notification', { error: error.message });
    }
  }

  async sendErrorNotification(jobId, jobConfig, error) {
    try {
      const channel = this.discordClient.channels.cache.get(this.notificationChannelId);
      if (!channel) return;

      const commandConfig = configManager.getCommand(jobConfig.commandId);

      await channel.send({
        embeds: [{
          title: `❌ Scheduled Task Failed: ${commandConfig?.label || jobConfig.commandId}`,
          description: `\`\`\`${error.message}\`\`\``,
          color: 0xe74c3c,
          fields: [
            { name: 'Cron', value: `\`${jobConfig.cronExpression}\``, inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (err) {
      logger.error('Failed to send error notification', { error: err.message });
    }
  }

  unscheduleCommand(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`Scheduled job "${jobId}" not found`);
    }

    job.task.stop();
    this.scheduledJobs.delete(jobId);

    logger.info('Command unscheduled', { jobId });
    return true;
  }

  toggleJob(jobId, enabled) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error(`Scheduled job "${jobId}" not found`);
    }

    if (enabled) {
      job.task.start();
    } else {
      job.task.stop();
    }

    job.config.enabled = enabled;
    logger.info('Job toggled', { jobId, enabled });
    return true;
  }

  getScheduledJobs() {
    const jobs = [];
    this.scheduledJobs.forEach((job, jobId) => {
      jobs.push({
        jobId,
        ...job.config,
      });
    });
    return jobs;
  }

  getJob(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (!job) return null;
    return { jobId, ...job.config };
  }

  stopAll() {
    this.scheduledJobs.forEach((job, jobId) => {
      job.task.stop();
      logger.debug('Stopped scheduled job', { jobId });
    });
    logger.info('All scheduled jobs stopped', { count: this.scheduledJobs.size });
  }
}

module.exports = new Scheduler();
