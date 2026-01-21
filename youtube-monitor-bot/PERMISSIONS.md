# YouTube Monitor Bot - Permissions Guide

## Discord Bot Permissions

### Required Permissions

Your Discord bot needs the following permissions to function properly:

#### Application Commands (Slash Commands)
- ✅ **Use Application Commands** - Required for all slash commands
- ✅ **Send Messages** - Required to respond to commands and post videos
- ✅ **Embed Links** - Required to display video embeds
- ✅ **Read Message History** - Required for command context
- ✅ **Attach Files** - Required for rich video embeds with images

#### Optional but Recommended
- ✅ **Use External Emojis** - For better visual feedback
- ✅ **Mention Everyone** - Only if you want notifications to ping @everyone (not recommended)
- ✅ **Add Reactions** - For interactive features (future use)

### How to Set Up Permissions

#### Method 1: Discord Developer Portal (Recommended)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** > **URL Generator**
4. Select **Scopes**:
   - ✅ `bot`
   - ✅ `applications.commands`
5. Select **Bot Permissions**:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Attach Files
   - ✅ Use External Emojis
6. Copy the generated URL
7. Open the URL in your browser
8. Select your server and authorize

#### Method 2: Manual Permission Setup

1. Go to your Discord server
2. Go to **Server Settings** > **Integrations** > **Bots**
3. Find your bot and click **Manage**
4. Enable the required permissions listed above

### Permission Integer

If you need the permission integer for programmatic setup:

```
Required: 101376
Full (with optional): 101376
```

Breakdown:
- Send Messages: 2048
- Embed Links: 16384
- Read Message History: 65536
- Attach Files: 32768
- Use External Emojis: 262144 (optional)

### Channel-Specific Permissions

For each channel where you want videos posted:

- ✅ **View Channel** - Bot must see the channel
- ✅ **Send Messages** - Bot must post video embeds
- ✅ **Embed Links** - Required for video embeds
- ✅ **Attach Files** - Required for video thumbnails/images

**Important**: When using `/add`, make sure the bot has permissions in the target Discord channel!

### Server Permissions

The bot does NOT need:
- ❌ Administrator permission
- ❌ Manage Server
- ❌ Manage Channels
- ❌ Manage Roles
- ❌ Kick/Ban Members
- ❌ Any moderation permissions

### Troubleshooting

**Bot doesn't respond to commands:**
- Check bot has "Use Application Commands" permission
- Verify bot is in the server
- Check bot is online

**Bot can't post videos:**
- Check "Send Messages" permission is enabled
- Verify target channel permissions allow bot to send messages
- Check "Embed Links" permission is enabled
- Verify "Attach Files" permission (for thumbnails)

**Video embeds not showing:**
- Enable "Embed Links" permission
- Check channel allows embeds
- Verify bot has permission in the specific channel

**Commands work but videos don't post:**
- Check channel permissions for the target Discord channel
- Verify bot can see and send messages in that channel
- Check `/health` command for channel status

## YouTube API Permissions

### Required Setup

1. **Google Cloud Console Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create account or sign in

2. **Create or Select Project**
   - Create new project or use existing
   - Note your project ID

3. **Enable YouTube Data API v3**
   - Go to **APIs & Services** > **Library**
   - Search for "YouTube Data API v3"
   - Click **Enable**

4. **Create API Key**
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy your API key
   - (Optional) Restrict key to YouTube Data API v3 for security

### API Key Restrictions (Recommended)

For better security, restrict your API key:

1. Go to **APIs & Services** > **Credentials**
2. Click on your API key
3. Under **API restrictions**, select **Restrict key**
4. Choose **YouTube Data API v3**
5. Save

### API Quota

- **Default Daily Limit**: 10,000 units
- **Quota Costs**:
  - Search: 100 units
  - Channels: 1 unit
  - PlaylistItems: 1 unit
  - Videos: 1 unit

**Typical Usage**:
- Each channel check: ~3-5 units
- With 10 channels, checking every 15 minutes: ~288-480 units/day
- Well within the 10,000 unit limit

### API Key Security

**Important**: Never share your API key publicly!

- ✅ Keep `.env` file private (already in `.gitignore`)
- ✅ Don't commit API keys to git
- ✅ Restrict API key to specific APIs
- ✅ Monitor usage in Google Cloud Console

### Requesting Quota Increase

If you need more than 10,000 units/day:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** > **Dashboard**
3. Find **YouTube Data API v3**
4. Click **Quotas**
5. Request increase (may require approval)

## Environment Variables

### Required

- `DISCORD_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your bot's client ID
- `GUILD_ID` - Your Discord server ID
- `YOUTUBE_API_KEY` - Your YouTube Data API v3 key

### Optional

- `CHECK_INTERVAL` - Cron expression for check frequency (default: `*/15 * * * *`)

## System Permissions

The bot needs:

- ✅ **Read/Write access** to `data/` directory
- ✅ **Network access** - To call YouTube API
- ✅ **File system access** - To store channel data and quota tracking

### Data Files Created

The bot creates these files (auto-created):
- `data/channels.json` - Monitored channels
- `data/posted_videos.json` - Posted video IDs
- `data/quota.json` - API quota tracking

Make sure the bot has write permissions in the project directory.

## Quick Permission Checklist

Before running the bot, verify:

### Discord
- [ ] Bot has "Use Application Commands" permission
- [ ] Bot has "Send Messages" permission
- [ ] Bot has "Embed Links" permission
- [ ] Bot has "Read Message History" permission
- [ ] Bot has "Attach Files" permission
- [ ] Bot has permissions in target Discord channels
- [ ] Bot token is valid and bot is online
- [ ] Commands are deployed (`npm run deploy`)

### YouTube API
- [ ] Google Cloud account created
- [ ] Project created/selected
- [ ] YouTube Data API v3 enabled
- [ ] API key created
- [ ] API key added to `.env` file
- [ ] API key tested (try `/add` command)

### System
- [ ] Node.js 18+ installed
- [ ] Write permissions in project directory
- [ ] Network access for API calls

## Testing Permissions

Test if bot has correct permissions:

1. **Discord Permissions**:
   - Use `/add` command - Should add channel successfully
   - Use `/dashboard` - Should show quota info
   - Check if bot can post in target channel

2. **YouTube API**:
   - Use `/add channel:https://youtube.com/@channelname`
   - Should successfully fetch channel info
   - Check `/dashboard` for API usage

3. **Full Workflow**:
   - Add a channel
   - Wait for check interval (or manually trigger)
   - Verify video posts to Discord channel
   - Check `/health` for channel status

## Common Permission Issues

**"Missing Permissions" error:**
- Bot doesn't have required permissions in server
- Re-authorize bot with correct permissions

**"Cannot send messages in this channel":**
- Bot lacks permissions in specific channel
- Check channel-specific permissions
- Verify bot role has access

**"YouTube API quota exceeded":**
- Daily quota limit reached
- Wait for reset (midnight UTC)
- Or reduce check frequency
- Or reduce number of channels

**"Channel not found":**
- API key may be invalid
- API key may not have YouTube Data API enabled
- Check API key in Google Cloud Console

## Security Best Practices

1. **API Key Security**:
   - Never commit `.env` to git
   - Restrict API key to YouTube Data API only
   - Monitor API usage regularly
   - Rotate keys if compromised

2. **Discord Bot Security**:
   - Use minimum required permissions
   - Don't grant Administrator unless necessary
   - Monitor bot activity
   - Use bot token securely

3. **Data Security**:
   - `data/` directory contains sensitive info
   - Keep data files private
   - Backup data regularly
   - Don't share data files publicly
