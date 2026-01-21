# Quick Setup Guide

## Required Credentials

### 1. Discord Bot Token (REQUIRED)

**Option A: Reuse existing bot**

- If you have a Discord bot token from another bot (like grammar-bot), you can reuse it
- Just copy the `DISCORD_TOKEN` from that bot's `.env` file

**Option B: Create new bot**

1. Go to <https://discord.com/developers/applications>
2. Click "New Application"
3. Name it "Reddit Filter Bot"
4. Go to "Bot" section → "Add Bot"
5. Copy the token
6. Enable "Message Content Intent" under "Privileged Gateway Intents"
7. Invite bot to your server with permissions: Send Messages, Embed Links

### 2. Reddit API Credentials (REQUIRED)

1. Go to <https://www.reddit.com/prefs/apps>
2. Click "create another app..." or "create app"
3. Fill in:
   - **Name**: RedditFilterBot
   - **Type**: script
   - **Description**: Discord bot for filtering Reddit posts
   - **Redirect URI**: <http://localhost:8080>
4. Click "create app"
5. Copy your **client ID** (under app name) and **client secret**

### 3. Discord Channel ID (REQUIRED)

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click the channel where you want posts → "Copy ID"
3. Paste this ID into `config.json` → `discord_channel_id`

## Setup Steps

1. **Edit `.env` file:**

```bash
# Copy from grammar-bot if reusing Discord bot, or get new token
DISCORD_TOKEN=your_token_here

# Get from Reddit (see above)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=RedditFilterBot/1.0 by YourRedditUsername
```

2. **Edit `config.json`:**

```json
{
  "discord_channel_id": "YOUR_CHANNEL_ID_HERE"
}
```

3. **Start the bot:**

```bash
npm start
```

## Quick Copy from Grammar Bot

If you want to reuse the Discord bot from grammar-bot:

```bash
# Copy Discord token (if you want to reuse the same bot)
cd ../grammar-bot
grep DISCORD_TOKEN .env
# Copy that value to reddit-filter-bot/.env
```
