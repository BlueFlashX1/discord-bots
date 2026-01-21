const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

class YouTubeMonitor {
  constructor(discordClient, youtubeService, channelManager, quotaManager) {
    this.client = discordClient;
    this.youtubeService = youtubeService;
    this.channelManager = channelManager;
    this.quotaManager = quotaManager;
    this.cronJob = null;
    this.checkInterval = process.env.CHECK_INTERVAL || '*/15 * * * *'; // Every 15 minutes by default
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('YouTube monitor is already running');
      return;
    }

    // Check quota reset on startup
    this.quotaManager.checkAndReset();

    // Schedule quota reset check (every hour)
    setInterval(() => {
      if (this.quotaManager.checkAndReset()) {
        console.log('✅ API quota reset for new day');
      }
    }, 60 * 60 * 1000); // Every hour

    // Start monitoring cron job
    this.cronJob = cron.schedule(this.checkInterval, async () => {
      await this.checkChannels();
    });

    this.isRunning = true;
    console.log(`✅ YouTube monitor started (checking every ${this.checkInterval})`);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('⏹️ YouTube monitor stopped');
  }

  async checkChannels() {
    // Check if paused
    if (this.quotaManager.isPaused()) {
      console.log('⏸️ YouTube monitor is paused, skipping check');
      return;
    }

    // Check quota
    if (!this.quotaManager.canMakeRequest(1)) {
      console.log('⚠️ API quota exceeded or paused, skipping check');
      return;
    }

    const channels = this.channelManager.getChannels();
    if (channels.length === 0) {
      return;
    }

    console.log(`\n[${new Date().toISOString()}] Checking ${channels.length} YouTube channel(s)...`);

    for (const channel of channels) {
      try {
        await this.checkChannel(channel);
      } catch (error) {
        console.error(`Error checking channel ${channel.title}:`, error.message);
        this.channelManager.updateChannelHealth(channel.id, 'error', error);
      }
    }
  }

  async checkChannel(channel) {
    try {
      const videos = await this.youtubeService.getLatestVideos(channel.id, 5);

      if (!videos || videos.length === 0) {
        this.channelManager.updateChannelHealth(channel.id, 'healthy');
        return;
      }

      // Sort by published date (newest first)
      videos.sort((a, b) => {
        return new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt);
      });

      let newVideos = 0;

      for (const video of videos) {
        const videoId = video.id;

        // Skip if already posted
        if (this.channelManager.isVideoPosted(videoId)) {
          continue;
        }

        // Check if this is newer than last known video
        if (channel.lastVideoId && videoId === channel.lastVideoId) {
          break; // We've reached videos we've already seen
        }

        // Post the video
        await this.postVideo(video, channel);
        this.channelManager.markVideoPosted(videoId);
        newVideos++;

        // Update last video ID
        if (newVideos === 1) {
          this.channelManager.updateChannelLastVideo(channel.id, videoId);
        }
      }

      if (newVideos > 0) {
        console.log(`📹 Posted ${newVideos} new video(s) from ${channel.title}`);
      }

      // Update health
      this.channelManager.updateChannelHealth(channel.id, 'healthy');
    } catch (error) {
      this.channelManager.updateChannelHealth(channel.id, 'error', error);
      throw error;
    }
  }

  async postVideo(video, channelConfig) {
    const discordChannel = await this.client.channels.fetch(channelConfig.discordChannelId);
    if (!discordChannel) {
      throw new Error(`Discord channel ${channelConfig.discordChannelId} not found`);
    }

    const embed = new EmbedBuilder()
      .setTitle(video.snippet.title)
      .setURL(`https://www.youtube.com/watch?v=${video.id}`)
      .setDescription(video.snippet.description.substring(0, 500) + (video.snippet.description.length > 500 ? '...' : ''))
      .setThumbnail(video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url)
      .setImage(video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url)
      .addFields(
        {
          name: '👁️ Views',
          value: parseInt(video.statistics.viewCount || 0).toLocaleString(),
          inline: true,
        },
        {
          name: '👍 Likes',
          value: parseInt(video.statistics.likeCount || 0).toLocaleString(),
          inline: true,
        },
        {
          name: '📅 Published',
          value: new Date(video.snippet.publishedAt).toLocaleDateString(),
          inline: true,
        }
      )
      .setColor(0xff0000)
      .setFooter({
        text: channelConfig.title,
        iconURL: channelConfig.thumbnail,
      })
      .setTimestamp(new Date(video.snippet.publishedAt));

    const message = await discordChannel.send({ embeds: [embed] });

    // If notify is enabled, ping or send notification
    if (channelConfig.notify) {
      await discordChannel.send(`🔔 **New video from ${channelConfig.title}!**`);
    }

    return message;
  }
}

module.exports = YouTubeMonitor;
