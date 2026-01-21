# Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- Discord Bot Token
- YouTube Data API v3 Key
- Discord Bot Client ID and Guild ID

## Step 1: Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

## Step 2: Install Dependencies

```bash
cd youtube-monitor-bot
npm install
```

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
YOUTUBE_API_KEY=your_youtube_api_key
CHECK_INTERVAL=*/15 * * * *  # Optional: check every 15 minutes
```

## Step 4: Deploy Commands

```bash
npm run deploy
```

## Step 5: Start Bot

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Testing

1. Add a channel: `/add channel:https://youtube.com/@channelname`
2. Wait for new video (or test with a channel that posts frequently)
3. Check dashboard: `/dashboard`
4. Check health: `/health`

## Troubleshooting

**Bot doesn't respond:**
- Check bot has proper permissions
- Verify token is correct
- Check bot is online

**Commands not showing:**
- Run `npm run deploy` again
- Wait a few minutes for Discord to update

**API quota exceeded:**
- Check `/dashboard` for quota status
- Bot auto-stops when quota exceeded
- Wait for daily reset (midnight UTC)
- Or reduce check frequency

**Channel not found:**
- Try full YouTube URL
- Or use channel ID (starts with UC)
- Or use exact channel username

## Configuration Options

### Check Interval

Edit `CHECK_INTERVAL` in `.env` (cron format):

- `*/15 * * * *` - Every 15 minutes (default, recommended)
- `*/10 * * * *` - Every 10 minutes (uses more quota)
- `*/5 * * * *` - Every 5 minutes (uses a lot of quota)

**Note**: More frequent = more API quota usage

## Next Steps

- See `README.md` for full documentation
- Use `/add` to start monitoring channels
- Use `/dashboard` to track API usage
- Use `/health` to monitor channel status
