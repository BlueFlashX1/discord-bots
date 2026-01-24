const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { retryDiscordAPI } = require('../../utils/retry');

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

      // Get problem
      const problem = await this.problemService.getRandomProblem(difficulty, source === 'random' ? null : source);

      if (!problem) {
        this.logger.error(`Failed to fetch problem for user ${userId}`);
        return;
      }

      // Set as current problem
      this.problemService.setCurrentProblem(userId, problem);

      // Mark as attempted
      this.progressService.markAttempted(userId, problem.id);

      // Create embed
      const difficultyEmoji = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴',
      };

      const embed = new EmbedBuilder()
        .setTitle(`${difficultyEmoji[problem.difficulty] || '📝'} ${problem.title}`)
        .setDescription(
          `**Difficulty:** ${problem.difficulty.toUpperCase()}\n` +
            `**Source:** ${problem.source.toUpperCase()}\n` +
            (problem.rank ? `**Rank:** ${problem.rank.name} (${problem.rank.color})\n` : '') +
            `**Tags:** ${problem.tags?.join(', ') || 'N/A'}\n` +
            (problem.category ? `**Category:** ${problem.category}\n` : '') +
            `\n[View Problem](${problem.url})\n\n` +
            `**How to submit:**\n` +
            `1. Type your solution in a code block: \`\`\`python\n# your code\n\`\`\`\n` +
            `2. Or attach a .py file\n` +
            `3. Use /submit to validate your solution`
        )
        .setColor(problem.difficulty === 'easy' ? 0x00ff00 : problem.difficulty === 'medium' ? 0xffaa00 : 0xff0000)
        .setFooter({ text: `Problem ID: ${problem.id} | Auto-posted` })
        .setTimestamp();

      // Add Codewars-specific stats if available
      if (problem.stats && problem.source === 'codewars') {
        embed.addFields({
          name: '📊 Codewars Stats',
          value:
            `**Completed:** ${problem.stats.totalCompleted.toLocaleString()}\n` +
            `**Attempts:** ${problem.stats.totalAttempts.toLocaleString()}\n` +
            `**Stars:** ${problem.stats.totalStars || 0}`,
          inline: true,
        });
      }

      if (problem.description) {
        // Clean up markdown for Discord
        let cleanDescription = problem.description;
        
        // Remove Codewars conditional blocks (keep only Python-compatible content)
        // Pattern: ~+if[-not]:[languages]\n[content]\n~
        if (problem.source === 'codewars') {
          // Remove all conditional blocks (they're language-specific and cause strikethrough)
          // Match: ~+if[-not]:condition\ncontent\n~
          cleanDescription = cleanDescription
            // Remove conditional blocks: ~if[-not]:condition\ncontent\n~
            .replace(/~+if[^~\n]*\n[\s\S]*?\n~/g, '')
            // Remove any remaining standalone tildes that cause strikethrough
            .replace(/^~+|~+$/gm, '') // Remove leading/trailing tildes on lines
            .replace(/\n~+\n/g, '\n') // Remove lines with only tildes
            .replace(/~+/g, '') // Remove any remaining tildes
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n');
        }
        
        // Remove code blocks (replace with placeholder)
        cleanDescription = cleanDescription.replace(/```[\s\S]*?```/g, '[Code Block]');
        
        // Remove inline code backticks that might break formatting
        cleanDescription = cleanDescription.replace(/`([^`]+)`/g, '$1');
        
        // Trim and limit length
        cleanDescription = cleanDescription.trim();
        const originalLength = cleanDescription.length;
        cleanDescription = cleanDescription.substring(0, 1000);
        if (originalLength > 1000) {
          cleanDescription += '...';
        }
        
        embed.addFields({
          name: '📝 Description',
          value: cleanDescription || 'No description available',
        });
      }

      await retryDiscordAPI(
        () => channel.send({ embeds: [embed] }),
        {
          operationName: 'Auto-post problem',
          logger: this.logger,
        }
      );
      this.logger.info(`Auto-posted problem ${problem.id} to channel ${channelId} for user ${userId}`);
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

    this.logger.info(`Starting problem auto-poster (interval: ${intervalHours} hours, cron: ${cronExpression})`);

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
