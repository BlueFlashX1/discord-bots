# YouTube Monitor Bot

Discord bot that monitors YouTube channels and automatically posts new videos to Discord channels.

## Features

- ✅ **Add Channels** - Monitor any YouTube channel by URL, ID, handle, or username
- 🎯 **Enhanced URL Support** - Supports @handles, /c/ custom URLs (free API!), /user/, /channel/
- 📹 **Auto-Post Videos** - Automatically detects and posts new videos (no notifications)
- 🔔 **Optional Notifications** - Get notified when specific channels post
- 🗑️ **Remove Channels** - Remove channels from monitoring
- 📊 **API Quota Dashboard** - Track API usage and auto-stop when quota exceeded
- ⏸️ **Pause/Resume** - Pause posting without stopping the bot
- 🏥 **Health Dashboard** - Monitor health status of all channels
- ⚡ **Free API Usage** - /c/ custom URLs use free Operational API (no quota cost!)

## Setup

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
YOUTUBE_API_KEY=your_youtube_api_key
CHECK_INTERVAL=*/15 * * * *  # Check every 15 minutes (cron format)
```

### 4. Deploy Commands

```bash
npm run deploy
```

### 5. Start Bot

```bash
npm start
```

## Commands

- `/add [channel] [discord_channel] [notify]` - Add a YouTube channel to monitor
- `/remove [channel]` - Remove a channel from monitoring
- `/list` - List all monitored channels
- `/notify [channel]` - Toggle notifications for a channel
- `/dashboard` - View API quota usage and bot status
- `/pause` - Pause posting (keeps bot active)
- `/resume` - Resume posting
- `/health` - View health status of all channels

## How It Works

1. **Add Channel**: Use `/add` with YouTube channel URL, ID, or username
2. **Auto-Detection**: Bot checks for new videos every 15 minutes (configurable)
3. **Auto-Post**: New videos are automatically posted to the configured Discord channel
4. **Quota Management**: Bot tracks API usage and auto-stops if quota exceeded
5. **Health Monitoring**: Track which channels are working correctly

## API Quota Management

- **Daily Limit**: 10,000 units (YouTube API default)
- **Auto-Reset**: Quota resets at midnight UTC
- **Auto-Stop**: Bot automatically stops posting when quota exceeded
- **Auto-Resume**: Bot automatically resumes when quota resets

### Quota Costs

- Search: 100 units
- Channels: 1 unit
- PlaylistItems: 1 unit
- Videos: 1 unit

**Typical check**: ~3-5 units per channel per check

## Pause/Resume

- **Pause**: Stops posting but keeps bot active (monitoring continues)
- **Resume**: Starts posting again
- **Auto-Resume**: Automatically resumes when quota resets

## Health Monitoring

Each channel tracks:

- ✅ Status (healthy/error)
- 📅 Last check time
- ❌ Error count
- ⚠️ Last error message

Use `/health` to view all channel health statuses.

## Configuration

### Check Interval

Set `CHECK_INTERVAL` in `.env` (cron format):

- `*/15 * * * *` - Every 15 minutes (default)
- `*/10 * * * *` - Every 10 minutes
- `*/5 * * * *` - Every 5 minutes (uses more quota)

**Note**: More frequent checks = more API quota usage

## Troubleshooting

**Bot doesn't post videos:**

- Check bot has permission to post in Discord channel
- Verify channel is added correctly
- Check `/health` for channel status
- Check `/dashboard` for quota status

**API quota exceeded:**

- Bot auto-stops when quota exceeded
- Wait for daily reset (midnight UTC)
- Or reduce check frequency
- Or reduce number of monitored channels

**Channel not found:**

- Verify channel URL/ID is correct
- Try using full YouTube channel URL
- Check channel is public

## Data Storage

- `data/channels.json` - Monitored channels
- `data/posted_videos.json` - Posted video IDs (prevents duplicates)
- `data/quota.json` - API quota tracking

## Notes

- Bot checks for new videos every 15 minutes by default
- Videos are only posted once (tracked by video ID)
- Quota resets daily at midnight UTC
- Bot automatically handles quota exceeded errors
