# Reddit Filter Bot

A Discord bot that monitors Reddit subreddits and posts filtered content based on keywords to Discord channels.

Built with **Discobase** framework for seamless Discord bot development.

## Features

- Monitor multiple Reddit subreddits
- Filter posts by keywords (case-insensitive)
- Post filtered results to Discord channels
- Configurable check intervals
- Tracks already posted content to avoid duplicates
- Hot reloading (via Discobase)
- Structured error handling
- Activity tracking

## Setup

### Prerequisites

- Node.js 18+
- Reddit API credentials (create app at <https://www.reddit.com/prefs/apps>)
- Discord bot token (create bot at <https://discord.com/developers/applications>)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Configure your bot in `config.json`:

```json
{
  "subreddits": ["Python"],
  "keywords": ["tutorial", "how to", "best practice"],
  "check_interval": 300,
  "discord_channel_id": "YOUR_CHANNEL_ID"
}
```

4. Run the bot:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Configuration

### Environment Variables (.env)

- `REDDIT_CLIENT_ID`: Your Reddit app client ID
- `REDDIT_CLIENT_SECRET`: Your Reddit app client secret
- `REDDIT_USER_AGENT`: User agent string (e.g., "RedditFilterBot/1.0")
- `DISCORD_TOKEN`: Your Discord bot token

### Config File (config.json)

- `subreddits`: List of subreddit names to monitor (without r/)
- `keywords`: List of keywords to filter posts (case-insensitive)
- `check_interval`: How often to check for new posts (seconds)
- `discord_channel_id`: Discord channel ID to post to
- `post_limit`: Number of posts to check per subreddit (default: 25)
- `min_score`: Minimum post score to include (default: 0)

## Usage

The bot will:

1. Check each configured subreddit every `check_interval` seconds
2. Filter posts that contain any of the configured keywords
3. Post matching posts to the configured Discord channel
4. Track posted content to avoid duplicates

## Example

Monitor `/r/Python` for posts containing "tutorial", "how to", or "best practice":

```json
{
  "subreddits": ["Python"],
  "keywords": ["tutorial", "how to", "best practice"],
  "check_interval": 300
}
```
