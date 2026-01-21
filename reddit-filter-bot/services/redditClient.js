const Snoowrap = require('snoowrap');

class RedditClient {
  constructor(config) {
    this.config = config;
    this.reddit = this.initReddit();
  }

  initReddit() {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    const userAgent = process.env.REDDIT_USER_AGENT || 'RedditFilterBot/1.0';

    if (!clientId || !clientSecret) {
      throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env');
    }

    return new Snoowrap({
      userAgent,
      clientId,
      clientSecret,
      username,
      password,
    });
  }

  async verifySubreddit(subredditName) {
    try {
      const subreddit = this.reddit.getSubreddit(subredditName);
      const info = await subreddit.fetch();
      return {
        valid: true,
        name: info.display_name,
        title: info.title,
        subscribers: info.subscribers,
        description: info.public_description?.substring(0, 200) || '',
        nsfw: info.over18,
      };
    } catch (error) {
      if (error.statusCode === 404 || error.message?.includes('404')) {
        return { valid: false, error: 'Subreddit not found' };
      }
      if (error.statusCode === 403 || error.message?.includes('private')) {
        return { valid: false, error: 'Subreddit is private' };
      }
      return { valid: false, error: error.message || 'Unknown error' };
    }
  }

  async getNewPosts(subredditName, limit = 25) {
    try {
      const subreddit = this.reddit.getSubreddit(subredditName);
      const posts = await subreddit.getNew({ limit });

      return posts.map((post) => ({
        id: post.id,
        title: post.title,
        selftext: post.selftext,
        url: post.url,
        permalink: post.permalink,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        author: post.author ? post.author.name : 'Unknown',
        subreddit: {
          display_name: post.subreddit_name_prefixed?.replace('r/', '') || subredditName,
        },
        thumbnail: post.thumbnail,
      }));
    } catch (error) {
      console.error(`Error fetching posts from r/${subredditName}:`, error);
      return [];
    }
  }
}

module.exports = { RedditClient };
