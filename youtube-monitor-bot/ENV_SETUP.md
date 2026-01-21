# YouTube Bot - Environment Setup

## .env File Format (from Übersicht)

Create a `.env` file in the `youtube-monitor-bot` directory with:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here

# YouTube API Key (from Google Cloud Console)
# Get from: https://console.cloud.google.com/apis/credentials
# Enable YouTube Data API v3 first!
YOUTUBE_API_KEY=your_api_key_here

# Check Interval (cron format)
# Default: Check every 15 minutes
CHECK_INTERVAL=*/15 * * * *
```

## Getting Your YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**:
   - Go to **APIs & Services** > **Library**
   - Search for "YouTube Data API v3"
   - Click **Enable**
4. Create API Key:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy your API key
5. Add to `.env`:
   ```
   YOUTUBE_API_KEY=AIzaSy...
   ```

## Getting Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **Bot** tab
4. Click **Reset Token** or **Copy** existing token
5. Add to `.env`:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

## Getting Client ID and Guild ID

### Client ID
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **General Information**
4. Copy **Application ID** (this is your Client ID)
5. Add to `.env`:
   ```
   CLIENT_ID=your_application_id_here
   ```

### Guild ID (Server ID)
1. Enable Developer Mode in Discord:
   - User Settings > Advanced > Developer Mode
2. Right-click your server
3. Click **Copy Server ID**
4. Add to `.env`:
   ```
   GUILD_ID=your_server_id_here
   ```

## Example .env File

```env
# Discord Bot Configuration
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.Xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_ID=123456789012345678
GUILD_ID=987654321098765432

# YouTube API Key
YOUTUBE_API_KEY=AIzaSyC1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Check Interval (cron format)
CHECK_INTERVAL=*/15 * * * *
```

## Security Notes

⚠️ **Never commit `.env` to git!**

- `.env` is already in `.gitignore`
- Keep your API keys and tokens private
- Don't share `.env` files publicly

## Testing Your Setup

After creating `.env`, test:

1. **Check environment variables are loaded**:
   ```bash
   cd youtube-monitor-bot
   node -e "require('dotenv').config(); console.log('Token:', process.env.DISCORD_TOKEN ? 'Set' : 'Missing'); console.log('API Key:', process.env.YOUTUBE_API_KEY ? 'Set' : 'Missing');"
   ```

2. **Start the bot**:
   ```bash
   npm start
   ```

3. **Test commands**:
   - `/add channel:https://youtube.com/@channelname`
   - `/dashboard`

## Troubleshooting

**"DISCORD_TOKEN not found"**:
- Check `.env` file exists in `youtube-monitor-bot` directory
- Verify token is on one line (no line breaks)
- Check for typos in variable name

**"YOUTUBE_API_KEY not found"**:
- Check `.env` file exists
- Verify API key is correct format (starts with `AIzaSy`)
- Make sure YouTube Data API v3 is enabled

**"Invalid token"**:
- Verify token is correct (copy from Discord Developer Portal)
- Check token hasn't been reset
- Make sure bot is enabled in Developer Portal
