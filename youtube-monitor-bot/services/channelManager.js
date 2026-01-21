const fs = require('fs');
const path = require('path');

class ChannelManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/channels.json');
    this.channels = this.loadChannels();
    this.postedVideos = this.loadPostedVideos();
  }

  loadChannels() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
    return [];
  }

  saveChannels() {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.channels, null, 2));
    } catch (error) {
      console.error('Error saving channels:', error);
    }
  }

  loadPostedVideos() {
    try {
      const postedPath = path.join(__dirname, '../data/posted_videos.json');
      if (fs.existsSync(postedPath)) {
        const data = fs.readFileSync(postedPath, 'utf8');
        return new Set(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading posted videos:', error);
    }
    return new Set();
  }

  savePostedVideos() {
    try {
      const postedPath = path.join(__dirname, '../data/posted_videos.json');
      const dir = path.dirname(postedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Keep only last 10000 to prevent file from growing too large
      const ids = Array.from(this.postedVideos).slice(-10000);
      fs.writeFileSync(postedPath, JSON.stringify(ids, null, 2));
    } catch (error) {
      console.error('Error saving posted videos:', error);
    }
  }

  addChannel(channelData, discordChannelId, notify = false) {
    const channel = {
      id: channelData.id,
      title: channelData.snippet.title,
      description: channelData.snippet.description,
      thumbnail: channelData.snippet.thumbnails.default.url,
      subscriberCount: channelData.statistics?.subscriberCount || 'Unknown',
      videoCount: channelData.statistics?.videoCount || 'Unknown',
      discordChannelId: discordChannelId,
      notify: notify,
      enabled: true,
      addedAt: new Date().toISOString(),
      lastChecked: null,
      lastVideoId: null,
      health: {
        status: 'healthy',
        lastError: null,
        errorCount: 0,
        lastSuccess: null,
      },
    };

    // Check if already exists
    const existing = this.channels.findIndex((c) => c.id === channel.id);
    if (existing >= 0) {
      // Update existing
      this.channels[existing] = { ...this.channels[existing], ...channel };
    } else {
      this.channels.push(channel);
    }

    this.saveChannels();
    return channel;
  }

  removeChannel(channelId) {
    const index = this.channels.findIndex((c) => c.id === channelId);
    if (index >= 0) {
      this.channels.splice(index, 1);
      this.saveChannels();
      return true;
    }
    return false;
  }

  getChannels() {
    return this.channels.filter((c) => c.enabled);
  }

  getAllChannels() {
    return this.channels;
  }

  getChannel(channelId) {
    return this.channels.find((c) => c.id === channelId);
  }

  markVideoPosted(videoId) {
    this.postedVideos.add(videoId);
    this.savePostedVideos();
  }

  isVideoPosted(videoId) {
    return this.postedVideos.has(videoId);
  }

  updateChannelHealth(channelId, status, error = null) {
    const channel = this.getChannel(channelId);
    if (channel) {
      if (error) {
        channel.health.errorCount = (channel.health.errorCount || 0) + 1;
        channel.health.lastError = {
          message: error.message || error,
          timestamp: new Date().toISOString(),
        };
        channel.health.status = 'error';
      } else {
        channel.health.errorCount = 0;
        channel.health.lastError = null;
        channel.health.lastSuccess = new Date().toISOString();
        channel.health.status = 'healthy';
      }
      channel.lastChecked = new Date().toISOString();
      this.saveChannels();
    }
  }

  updateChannelLastVideo(channelId, videoId) {
    const channel = this.getChannel(channelId);
    if (channel) {
      channel.lastVideoId = videoId;
      this.saveChannels();
    }
  }

  toggleChannelNotify(channelId) {
    const channel = this.getChannel(channelId);
    if (channel) {
      channel.notify = !channel.notify;
      this.saveChannels();
      return channel.notify;
    }
    return null;
  }
}

module.exports = ChannelManager;
