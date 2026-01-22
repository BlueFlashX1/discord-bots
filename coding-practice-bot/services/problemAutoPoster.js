const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

class ProblemAutoPoster {
  constructor(client, problemService, progressService, userPreferences, codewarsProgress) {
    this.client = client;
    this.problemService = problemService;
    this.progressService = progressService;
    this.userPreferences = userPreferences;
    this.codewarsProgress = codewarsProgress;
    this.cronJob = null;
    this.isRunning = false;
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
        console.error(`Channel ${channelId} not found for user ${userId}`);
        return;
      }

      // Get problem
      const problem = await this.problemService.getRandomProblem(difficulty, source === 'random' ? null : source);

      if (!problem) {
        console.error(`Failed to fetch problem for user ${userId}`);
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
            `1. Type your solution in a code block: \\`\\`\\`python\n# your code\n\\`\\`\\`\n` +
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
        let cleanDescription = problem.description
          .replace(/```[\s\S]*?```/g, '[Code Block]')
          .substring(0, 1000);
        if (problem.description.length > 1000) {
          cleanDescription += '...';
        }
        embed.addFields({
          name: '📝 Description',
          value: cleanDescription,
        });
      }

      await channel.send({ embeds: [embed] });
      console.log(`Auto-posted problem ${problem.id} to channel ${channelId} for user ${userId}`);
    } catch (error) {
      console.error(`Error auto-posting problem for user ${userId}:`, error.message);
    }
  }

  /**
   * Check and post problems for all users with auto-post enabled
   */
  async checkAndPost() {
    if (this.isRunning) {
      console.log('Auto-poster is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const autoPostUsers = this.userPreferences.getAllAutoPostUsers();

    if (autoPostUsers.length === 0) {
      console.log('No users with auto-post enabled');
      this.isRunning = false;
      return;
    }

    console.log(`Auto-posting problems for ${autoPostUsers.length} user(s)...`);

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
              console.log(
                `User ${user.userId}: Recommended difficulty ${user.difficulty} (${mastery.recommendation.reason})`
              );
            }
          } catch (error) {
            console.error(`Error checking mastery for user ${user.userId}:`, error.message);
            // Continue with user's preferred difficulty
          }
        }

        await this.postProblem(user.userId, user.channelId, user.difficulty, user.source);

        // Rate limit: Delay between posts to prevent Discord API spam
        // Discord allows 5 messages per 5 seconds per channel
        await new Promise((resolve) => setTimeout(resolve, 1200)); // 1.2s delay = ~5 per 6s (safe)
      } catch (error) {
        console.error(`Error processing auto-post for user ${user.userId}:`, error.message);
      }
    }

    this.isRunning = false;
  }

  /**
   * Start auto-posting (runs daily at configured time)
   */
  start(intervalHours = 24) {
    if (this.cronJob) {
      console.log('Auto-poster is already running');
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
      console.warn(`Invalid interval ${intervalHours}, defaulting to 24 hours`);
      cronExpression = '0 9 * * *';
    }

    console.log(`Starting problem auto-poster (interval: ${intervalHours} hours, cron: ${cronExpression})`);

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
      console.log('Problem auto-poster stopped');
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
