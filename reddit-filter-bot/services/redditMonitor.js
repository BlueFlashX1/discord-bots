const { RedditClient } = require('./redditClient');
const { DiscordPoster } = require('./discordPoster');
const configManager = require('./configManager');
const cron = require('node-cron');

class RedditMonitor {
  constructor(config, discordClient) {
    this.config = config;
    this.discordClient = discordClient;
    this.redditClient = new RedditClient(config);
    this.discordPoster = new DiscordPoster(config, discordClient);
    this.postedIds = new Set();
    this.loadPostedIds();
    this.cronJob = null;
  }

  loadPostedIds() {
    const fs = require('fs');
    const path = require('path');
    const postedFile = path.join(__dirname, '../posted_ids.json');
    if (fs.existsSync(postedFile)) {
      const data = fs.readFileSync(postedFile, 'utf8');
      this.postedIds = new Set(JSON.parse(data));
    }
  }

  savePostedIds() {
    const fs = require('fs');
    const path = require('path');
    const postedFile = path.join(__dirname, '../posted_ids.json');
    // Keep only last 10000 IDs to prevent file from growing too large
    const ids = Array.from(this.postedIds).slice(-10000);
    fs.writeFileSync(postedFile, JSON.stringify(ids, null, 2));
  }

  // Optimize memory: Limit Set size in memory as well
  trimPostedIds() {
    const MAX_SIZE = 10000;
    if (this.postedIds.size > MAX_SIZE) {
      const ids = Array.from(this.postedIds).slice(-MAX_SIZE);
      this.postedIds = new Set(ids);
    }
  }

  matchesKeywords(text, keywords) {
    // If no keywords, match all posts
    if (!keywords || keywords.length === 0) return true;
    if (!text) return false;

    const textLower = text.toLowerCase();
    return keywords.some(
      keyword => textLower.includes(keyword.toLowerCase())
    );
  }

  async checkSubreddits() {
    if (configManager.getPaused()) {
      console.log('Reddit monitor is paused, skipping check');
      return;
    }

    const currentConfig = configManager.getConfig();
    const subredditNames = configManager.getSubreddits();
    const now = new Date();

    console.log(`\n[${now.toISOString()}] Checking ${subredditNames.length} subreddit(s)...`);

    for (const subredditName of subredditNames) {
      const subConfig = configManager.getSubredditConfig(subredditName);

      // Skip disabled subreddits
      if (!subConfig.enabled) {
        console.log(`Skipping r/${subredditName} (disabled)`);
        continue;
      }

      try {
        console.log(`Checking r/${subredditName}...`);
        const posts = await this.redditClient.getNewPosts(subredditName, currentConfig.post_limit || 25);

        let newPosts = 0;
        for (const post of posts) {
          // Skip already posted
          if (this.postedIds.has(post.id)) {
            continue;
          }

          // Check min score for this subreddit
          if (post.score < (subConfig.min_score || 0)) {
            continue;
          }

          // Check keywords for this subreddit
          const titleMatch = this.matchesKeywords(post.title, subConfig.keywords);
          const selftextMatch = this.matchesKeywords(post.selftext || '', subConfig.keywords);

          if (titleMatch || selftextMatch) {
            // Post to the subreddit's configured channel
            await this.discordPoster.postSubmission(post, subConfig.channel_id);
            this.postedIds.add(post.id);
            newPosts++;
            console.log(`Posted: ${post.title.substring(0, 50)}... (r/${subredditName} -> #${subConfig.channel_id})`);
            
            // Rate limit: Delay between posts to prevent Discord API spam
            // Discord allows 5 messages per 5 seconds per channel
            await new Promise((resolve) => setTimeout(resolve, 1200)); // 1.2s delay = ~5 per 6s (safe)
            
            // Trim memory periodically
            if (this.postedIds.size > 10000) {
              this.trimPostedIds();
            }
          }
        }

        if (newPosts > 0) {
          console.log(`Found ${newPosts} new matching post(s) in r/${subredditName}`);
        }
      } catch (error) {
        console.error(`Error checking r/${subredditName}:`, error.message);
      }
    }

    // Trim memory before saving
    this.trimPostedIds();
    this.savePostedIds();
  }

  async start() {
    const checkInterval = this.config.check_interval || 300;
    const minutes = Math.max(1, Math.floor(checkInterval / 60));
    const cronExpression = `*/${minutes} * * * *`;

    console.log(`Starting Reddit monitor (checking every ${checkInterval} seconds)`);

    await this.checkSubreddits();

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.checkSubreddits();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
  }

  async stop() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    this.savePostedIds();
    console.log('Reddit monitor stopped');
  }
}

module.exports = { RedditMonitor };
