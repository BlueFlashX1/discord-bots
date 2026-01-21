const axios = require('axios');

class YouTubeService {
  constructor(apiKey, quotaManager) {
    this.apiKey = apiKey;
    this.quotaManager = quotaManager;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  async makeRequest(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = {
      ...params,
      key: this.apiKey,
    };

    // Track API usage
    const quotaCost = this.estimateQuotaCost(endpoint, params);
    if (!this.quotaManager.canMakeRequest(quotaCost)) {
      throw new Error('API quota exceeded. Please wait for reset.');
    }

    try {
      const response = await axios.get(url, {
        params: queryParams,
        timeout: 10000, // 10 second timeout (improvement from Übersicht)
      });
      this.quotaManager.recordRequest(quotaCost);
      return response.data;
    } catch (error) {
      // Handle quota exceeded
      if (
        error.response?.status === 403 &&
        error.response?.data?.error?.message?.includes('quota')
      ) {
        this.quotaManager.recordQuotaExceeded();
        throw new Error('YouTube API quota exceeded');
      }
      // Handle timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - YouTube API did not respond in time');
      }
      // Handle 404 (channel not found)
      if (error.response?.status === 404) {
        throw new Error('Channel not found - please check the URL or channel ID');
      }
      // Handle 400 (bad request - often invalid handle/username)
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request';
        throw new Error(`Invalid channel identifier: ${errorMessage}`);
      }
      throw error;
    }
  }

  estimateQuotaCost(endpoint, params) {
    // YouTube API quota costs:
    // Search: 100 units
    // Channels: 1 unit
    // PlaylistItems: 1 unit
    // Videos: 1 unit

    if (endpoint.includes('/search')) return 100;
    if (endpoint.includes('/channels')) return 1;
    if (endpoint.includes('/playlistItems')) return 1;
    if (endpoint.includes('/videos')) return 1;

    return 1; // Default
  }

  async getChannelByUsername(username) {
    return this.makeRequest('/channels', {
      part: 'snippet,contentDetails,statistics',
      forUsername: username,
    });
  }

  /**
   * Get channel by @handle using forHandle parameter
   * According to YouTube API docs, @handles require forHandle, not forUsername
   */
  async getChannelByHandle(handle) {
    // Remove @ if present
    const cleanHandle = handle.replace(/^@/, '');
    return this.makeRequest('/channels', {
      part: 'snippet,contentDetails,statistics',
      forHandle: cleanHandle,
    });
  }

  /**
   * Get channel by /c/ custom URL using free YouTube Operational API
   * This doesn't consume quota as it uses the free Operational API
   */
  async getChannelByCustomUrl(customName) {
    try {
      const response = await axios.get('https://yt.lemnoslife.com/channels', {
        params: {
          cId: customName,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data?.items && response.data.items.length > 0) {
        const channelId = response.data.items[0].id;
        // Get full channel details using our API
        return this.getChannelById(channelId);
      }
      throw new Error('Channel not found');
    } catch (error) {
      console.error('Error fetching channel by custom URL:', error.message);
      throw new Error(`Could not resolve custom URL: ${customName}`);
    }
  }

  async getChannelById(channelId) {
    return this.makeRequest('/channels', {
      part: 'snippet,contentDetails,statistics',
      id: channelId,
    });
  }

  /**
   * Get channel by URL - supports multiple YouTube URL formats
   * Enhanced with improvements from Übersicht widget:
   * - @handle support using forHandle parameter
   * - /c/ custom URLs using free Operational API
   * - Better error handling and timeout support
   */
  async getChannelByUrl(url) {
    // Clean URL
    url = url.trim();

    // Extract channel ID, username, handle, or custom URL from various formats
    let channelId = null;
    let username = null;
    let handle = null;
    let customName = null;

    // Direct channel ID URL: youtube.com/channel/UC...
    const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
    if (channelMatch) {
      channelId = channelMatch[1];
    }
    // @handle format: youtube.com/@handle
    else if (url.includes('youtube.com/@') || url.match(/@[\w-]+/)) {
      const handleMatch = url.match(/@([\w-]+)/) || url.match(/youtube\.com\/@([\w-]+)/);
      if (handleMatch) {
        handle = handleMatch[1];
      }
    }
    // /c/ custom URL: youtube.com/c/ChannelName
    else if (url.includes('/c/')) {
      const customMatch = url.match(/youtube\.com\/c\/([\w-]+)/);
      if (customMatch) {
        customName = customMatch[1];
      }
    }
    // /user/ username: youtube.com/user/Username
    else if (url.includes('/user/')) {
      const userMatch = url.match(/youtube\.com\/user\/([\w-]+)/);
      if (userMatch) {
        username = userMatch[1];
      }
    }
    // Standalone channel ID (starts with UC)
    else if (url.match(/^UC[\w-]+$/)) {
      channelId = url;
    }
    // Standalone handle (starts with @)
    else if (url.match(/^@?[\w-]+$/)) {
      // Check if it looks like a handle (no spaces, typical handle format)
      if (!url.includes('/') && !url.includes(' ')) {
        handle = url.replace(/^@/, '');
      }
    }

    // Resolve based on what we found
    if (channelId) {
      // Direct channel ID - fastest method
      return this.getChannelById(channelId);
    } else if (handle) {
      // @handle format - use forHandle parameter
      return this.getChannelByHandle(handle);
    } else if (customName) {
      // /c/ custom URL - use free Operational API (no quota cost!)
      return this.getChannelByCustomUrl(customName);
    } else if (username) {
      // /user/ username - use forUsername parameter
      return this.getChannelByUsername(username);
    }

    throw new Error(
      'Could not extract channel identifier from URL. Supported formats:\n' +
        '- youtube.com/channel/UC... (Channel ID)\n' +
        '- youtube.com/@handle (@handle)\n' +
        '- youtube.com/c/ChannelName (custom URL)\n' +
        '- youtube.com/user/Username (username)\n' +
        '- Direct channel ID: UC...\n' +
        '- Direct handle: @handle'
    );
  }

  async getChannelUploadsPlaylistId(channelId) {
    const data = await this.getChannelById(channelId);
    if (data.items && data.items.length > 0) {
      return data.items[0].contentDetails.relatedPlaylists.uploads;
    }
    throw new Error('Channel not found');
  }

  async getLatestVideos(channelId, maxResults = 5) {
    // Get uploads playlist ID
    const uploadsPlaylistId = await this.getChannelUploadsPlaylistId(channelId);

    // Get latest videos from uploads playlist
    const playlistData = await this.makeRequest('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: maxResults,
      order: 'date',
    });

    if (!playlistData.items || playlistData.items.length === 0) {
      return [];
    }

    // Get video details
    const videoIds = playlistData.items.map((item) => item.contentDetails.videoId).join(',');
    const videosData = await this.makeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    });

    return videosData.items || [];
  }

  async searchChannel(query) {
    const searchData = await this.makeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'channel',
      maxResults: 5,
    });

    return searchData.items || [];
  }
}

module.exports = YouTubeService;
