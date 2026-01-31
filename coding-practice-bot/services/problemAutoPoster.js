const cron = require('node-cron');
const {
  createProblemEmbed,
  createCodewarsLinksEmbed,
} = require('../utils/embedBuilder');
const Logger = require('../../utils/logger');
const { retryDiscordAPI } = require('../../utils/retry');

const RECENTLY_POSTED_MAX = 30;

class ProblemAutoPoster {
  constructor(client, problemService, progressService, userPreferences, codewarsProgress) {
    this.client = client;
    this.problemService = problemService;
    this.progressService = progressService;
    this.userPreferences = userPreferences;
    this.codewarsProgress = codewarsProgress;
    this.cronJob = null;
    this.isRunning = false;
    this.logger = new Logger('problem-auto-poster');
    this.recentlyPostedByChannel = new Map();
  }

  /**
   * Post a problem to a user's configured channel
   */
  async postProblem(userId, channelId, difficulty, source) {
    try {
      // Use cache first to avoid unnecessary API calls
      let channel = this.client.channels.cache.get(channelId);
      if (!channel) {
        channel = await this.client.channels.fetch(channelId);
      }
      if (!channel) {
        this.logger.error(`Channel ${channelId} not found for user ${userId}`);
        return;
      }

      if (source === 'codewars') {
        const embed = createCodewarsLinksEmbed({ footerSuffix: 'Auto-posted' });
        await retryDiscordAPI(() => channel.send({ embeds: [embed] }), {
          operationName: 'Auto-post Codewars links',
          logger: this.logger,
        });
        this.logger.info(
          `Auto-posted Codewars links to channel ${channelId} for user ${userId}`
        );
        return;
      }

      const excludeIds = this.recentlyPostedByChannel.get(channelId) || [];
      const problem = await this.problemService.getRandomProblem(
        difficulty,
        source === 'random' ? null : source,
        excludeIds
      );

      if (!problem) {
        this.logger.error(`Failed to fetch problem for user ${userId}`);
        return;
      }

      const recent = this.recentlyPostedByChannel.get(channelId) || [];
      recent.push(problem.id);
      if (recent.length > RECENTLY_POSTED_MAX) {
        recent.splice(0, recent.length - RECENTLY_POSTED_MAX);
      }
      this.recentlyPostedByChannel.set(channelId, recent);

      this.problemService.setCurrentProblem(userId, problem);
      this.progressService.markAttempted(userId, problem.id);

      const embed = createProblemEmbed(problem, { footerSuffix: 'Auto-posted' });

      await retryDiscordAPI(() => channel.send({ embeds: [embed] }), {
        operationName: 'Auto-post problem',
        logger: this.logger,
      });
      this.logger.info(
        `Auto-posted problem ${problem.id} to channel ${channelId} for user ${userId}`
      );
    } catch (error) {
      this.logger.error(`Error auto-posting problem for user ${userId}`, error, {
        channelId,
        difficulty,
        source,
      });
    }
  }

  /**
   * Check and post problems for all users with auto-post enabled
   */
  async checkAndPost() {
    if (this.isRunning) {
      this.logger.debug('Auto-poster is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const autoPostUsers = this.userPreferences.getAllAutoPostUsers();

    if (autoPostUsers.length === 0) {
      this.logger.debug('No users with auto-post enabled');
      this.isRunning = false;
      return;
    }

    this.logger.info(`Auto-posting problems for ${autoPostUsers.length} user(s)...`);

    for (const user of autoPostUsers) {
      try {
        // Check if user has Codewars username and mastery tracking enabled
        const prefs = this.userPreferences.getUserPreferences(user.userId);
        if (prefs.codewarsUsername && prefs.masteryTracking) {
          try {
            const mastery = await this.codewarsProgress.analyzeMastery(prefs.codewarsUsername);
            // Use recommended difficulty if available
            if (mastery.recommendation) {
              user.difficulty = mastery.recommendation.recommended;
              this.logger.debug(
                `User ${user.userId}: Recommended difficulty ${user.difficulty} (${mastery.recommendation.reason})`
              );
            }
          } catch (error) {
            this.logger.warn(`Error checking mastery for user ${user.userId}`, error);
            // Continue with user's preferred difficulty
          }
        }

        await this.postProblem(user.userId, user.channelId, user.difficulty, user.source);

        // Rate limit: Delay between posts to prevent Discord API spam
        // Discord allows 5 messages per 5 seconds per channel
        await new Promise((resolve) => setTimeout(resolve, 1200)); // 1.2s delay = ~5 per 6s (safe)
      } catch (error) {
        this.logger.error(`Error processing auto-post for user ${user.userId}`, error);
      }
    }

    this.isRunning = false;
  }

  /**
   * Start auto-posting (runs daily at configured time)
   */
  start(intervalHours = 24) {
    if (this.cronJob) {
      this.logger.warn('Auto-poster is already running');
      return;
    }

    // Default: Post once per day at 9 AM UTC
    // For other intervals, calculate cron expression
    let cronExpression;
    if (intervalHours === 24) {
      cronExpression = '0 9 * * *'; // 9 AM UTC daily
    } else if (intervalHours >= 1 && intervalHours <= 23) {
      // Post every N hours
      cronExpression = `0 */${intervalHours} * * *`;
    } else {
      this.logger.warn(`Invalid interval ${intervalHours}, defaulting to 24 hours`);
      cronExpression = '0 9 * * *';
    }

    this.logger.info(
      `Starting problem auto-poster (interval: ${intervalHours} hours, cron: ${cronExpression})`
    );

    // Don't post immediately - wait for first scheduled time
    // Schedule recurring posts
    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        await this.checkAndPost();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );
  }

  /**
   * Stop auto-posting
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.logger.info('Problem auto-poster stopped');
    }
  }

  /**
   * Check if auto-poster is running
   */
  isActive() {
    return this.cronJob !== null;
  }
}

module.exports = ProblemAutoPoster;
