const axios = require('axios');

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_OAUTH_BASE = 'https://oauth.reddit.com';

class RedditClient {
  constructor(config) {
    this.config = config;
    this.token = null;
    this.tokenExpiry = 0;
  }

  async initReddit() {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    this.userAgent = process.env.REDDIT_USER_AGENT || 'RedditFilterBot/1.0';

    if (!clientId || !clientSecret) {
      throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env');
    }

    this.auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    this.username = username;
    this.password = password;
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiry - 60000) {
      return this.token;
    }
    if (!this.auth) await this.initReddit();

    const params = new URLSearchParams({
      grant_type: 'password',
      username: this.username,
      password: this.password,
    });

    const { data } = await axios.post(REDDIT_TOKEN_URL, params, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return this.token;
  }

  async request(method, path, params = {}) {
    const token = await this.getToken();
    const url = `${REDDIT_OAUTH_BASE}${path}`;
    const { data } = await axios({
      method,
      url,
      params,
      headers: {
        Authorization: `bearer ${token}`,
        'User-Agent': this.userAgent,
      },
      validateStatus: (s) => s < 500,
    });
    return data;
  }

  async verifySubreddit(subredditName) {
    try {
      await this.initReddit();
      const clean = subredditName.replace(/^r\//, '').toLowerCase();
      const data = await this.request('GET', `/r/${clean}/about`);

      if (data.error === 404 || (data.message && data.message.toLowerCase().includes('not found'))) {
        return { valid: false, error: 'Subreddit not found' };
      }
      if (data.error === 403 || (data.message && data.message.toLowerCase().includes('private'))) {
        return { valid: false, error: 'Subreddit is private' };
      }
      if (data.error) {
        return { valid: false, error: data.message || data.error };
      }

      const info = data.data || data;
      return {
        valid: true,
        name: info.display_name || clean,
        title: info.title || '',
        subscribers: info.subscribers ?? 0,
        description: (info.public_description || '').substring(0, 200),
        nsfw: !!info.over18,
      };
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || '';
      if (status === 404 || String(msg).includes('404')) {
        return { valid: false, error: 'Subreddit not found' };
      }
      if (status === 403 || String(msg).toLowerCase().includes('private')) {
        return { valid: false, error: 'Subreddit is private' };
      }
      return { valid: false, error: msg || 'Unknown error' };
    }
  }

  async getNewPosts(subredditName, limit = 25) {
    try {
      await this.initReddit();
      const clean = subredditName.replace(/^r\//, '').toLowerCase();
      const data = await this.request('GET', `/r/${clean}/new`, { limit });

      if (data.error || !data.data?.children) {
        return [];
      }

      return data.data.children.map(({ data: post }) => ({
        id: post.id,
        title: post.title,
        selftext: post.selftext || '',
        url: post.url,
        permalink: post.permalink,
        score: post.score ?? 0,
        num_comments: post.num_comments ?? 0,
        created_utc: post.created_utc,
        author: post.author || 'Unknown',
        subreddit: {
          display_name: (post.subreddit || post.subreddit_name_prefixed || '').replace(/^r\//, '') || clean,
        },
        thumbnail: post.thumbnail || '',
      }));
    } catch (err) {
      console.error(`Error fetching posts from r/${subredditName}:`, err.message);
      return [];
    }
  }
}

module.exports = { RedditClient };
