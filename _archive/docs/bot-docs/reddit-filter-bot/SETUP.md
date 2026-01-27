# Reddit Filter Bot Setup Guide

This bot uses **Discobase** framework for seamless Discord bot development with hot reloading and error handling.

## Step 1: Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..." or "create app"
3. Fill in:
   - **Name**: RedditFilterBot (or any name)
   - **Type**: script
   - **Description**: Discord bot for filtering Reddit posts
   - **Redirect URI**: http://localhost:8080 (not used, but required)
4. Click "create app"
5. Note your **client ID** (under the app name) and **client secret**

## Step 2: Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Reddit Filter Bot"
4. Go to "Bot" section
5. Click "Add Bot"
6. Under "Token", click "Reset Token" and copy it
7. Enable "Message Content Intent" under "Privileged Gateway Intents"
8. Go to "OAuth2" > "URL Generator"
9. Select scopes: `bot`
10. Select bot permissions: `Send Messages`, `Embed Links`, `Read Message History`
11. Copy the generated URL and open it to invite the bot to your server
12. Get the channel ID where you want posts:

- Enable Developer Mode in Discord (User Settings > Advanced)
- Right-click the channel > "Copy ID"

## Step 3: Bot Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:

```
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=RedditFilterBot/1.0 by YourRedditUsername
DISCORD_TOKEN=your_discord_bot_token_here
```

3. Edit `config.json`:

```json
{
  "subreddits": ["Python"],
  "keywords": ["tutorial", "how to", "best practice"],
  "check_interval": 300,
  "discord_channel_id": "YOUR_CHANNEL_ID_HERE",
  "post_limit": 25,
  "min_score": 0
}
```

## Step 4: Installation

1. Install dependencies:

```bash
npm install
```

## Step 5: Run the Bot

Production:

```bash
npm start
```

Development (with auto-reload):

```bash
npm run dev
```

The bot will:

- Check each subreddit every 5 minutes (300 seconds)
- Filter posts containing any of the keywords
- Post matching posts to your Discord channel
- Track posted content to avoid duplicates

## Configuration Options

### config.json

- `subreddits`: List of subreddit names (without "r/")
- `keywords`: List of keywords to filter (case-insensitive)
- `check_interval`: Seconds between checks (default: 300 = 5 minutes)
- `discord_channel_id`: Discord channel ID to post to
- `post_limit`: Number of posts to check per subreddit (default: 25)
- `min_score`: Minimum post score to include (default: 0)

### Example: Multiple Subreddits

```json
{
  "subreddits": ["Python", "learnpython", "programming"],
  "keywords": ["tutorial", "how to", "best practice", "guide"],
  "check_interval": 180
}
```

## Troubleshooting

### "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set"

- Make sure `.env` file exists and contains the correct values
- Check that you copied from `.env.example` correctly

### "Channel not found"

- Verify the channel ID is correct
- Make sure the bot has access to the channel
- Check that the bot is in the server

### "Rate limit" errors

- Reddit API has rate limits (60 requests per minute)
- Increase `check_interval` if you're monitoring many subreddits
- The bot automatically handles rate limits, but may slow down

### Posts not appearing

- Check that keywords match (case-insensitive)
- Verify posts meet `min_score` requirement
- Check bot logs for errors
- Make sure bot has permission to send messages in the channel
