# Environment Variables Setup Guide

**CRITICAL:** All `.env` files are excluded from git. Never commit tokens or secrets.

## How It Works

PM2 loads environment variables from `.env` files using the `env_file` option in `ecosystem.config.js`. Each bot has its own `.env` file in its directory.

## Setup on VPS

### Quick Setup Script

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to bots directory
cd /root/discord-bots

# For each bot, copy .env.example to .env and edit
for bot in coding-practice-bot grammar-bot github-bot reminder-bot starboard-bot exercism-bot "todoist bot" reddit-filter-bot youtube-monitor-bot command-control-bot subscription-bot vps-monitoring-bot; do
  if [ -d "$bot" ] && [ -f "$bot/.env.example" ]; then
    echo "Setting up $bot..."
    cp "$bot/.env.example" "$bot/.env"
    echo "✅ Created $bot/.env - edit with: nano $bot/.env"
  fi
done
```

---

## Complete Environment Variables by Bot

### 1. Grammar Bot
**Location:** `/root/discord-bots/grammar-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_bot_client_id_here
GUILD_ID=your_test_guild_id_here_optional

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Budget Limits (USD)
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00

# Database
MONGODB_URI=mongodb://localhost:27017/grammar_bot

# Bot Settings
NODE_ENV=production
MIN_MESSAGE_LENGTH=10
AUTO_CHECK_COOLDOWN=30000
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `OPENAI_API_KEY` - OpenAI API key (get from https://platform.openai.com/api-keys)

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - For faster command syncing
- `MONGODB_URI` - Uses JSON storage if not set

---

### 2. Coding Practice Bot
**Location:** `/root/discord-bots/coding-practice-bot/.env`

```bash
# Discord Bot Token
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Codewars API (Optional - API v1 is public, no key required)
# Get from: https://www.codewars.com/users/edit (Settings > API)
CODEFORCES_API_KEY=optional_codewars_api_key

# Auto-Post Configuration
# Interval in hours between automatic problem posts (default: 24 = once per day)
AUTO_POST_INTERVAL_HOURS=24
```

**Required:**
- `DISCORD_BOT_TOKEN` - Discord bot token

**Optional:**
- `CODEFORCES_API_KEY` - Codewars API key for better rate limits
- `AUTO_POST_INTERVAL_HOURS` - Default: 24

---

### 3. Todoist Bot
**Location:** `/root/discord-bots/todoist bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing

# Todoist API Configuration
TODOIST_API_TOKEN=your_todoist_api_token  # Get from https://todoist.com/app/settings/integrations

# Optional Configuration
SYNC_INTERVAL_SECONDS=30  # Sync interval in seconds (default: 30)
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `TODOIST_API_TOKEN` - Todoist API token

**Optional:**
- `DISCORD_CLIENT_ID` - For command registration
- `DISCORD_GUILD_ID` - For faster command syncing
- `SYNC_INTERVAL_SECONDS` - Default: 30

---

### 4. Reminder Bot
**Location:** `/root/discord-bots/reminder-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - For faster command syncing

---

### 5. Starboard Bot
**Location:** `/root/discord-bots/starboard-bot/.env`

```bash
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - Server ID

---

### 6. GitHub Bot
**Location:** `/root/discord-bots/github-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing

# GitHub API Configuration
GITHUB_TOKEN=your_github_token  # Optional but recommended for higher rate limits
# Get token from: https://github.com/settings/tokens
# Required scopes: public_repo, read:user
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - For faster command syncing
- `GITHUB_TOKEN` - GitHub personal access token (recommended for higher rate limits)

---

### 7. Exercism Bot
**Location:** `/root/discord-bots/exercism-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing

# Exercism CLI Configuration
# Note: This bot requires Exercism CLI to be installed and configured
# Run: exercism configure --token=YOUR_EXERCISM_API_TOKEN
# Get token from: https://exercism.org/settings/api_cli
# 
# Optional: Set custom workspace location (defaults to ~/exercism)
# EXERCISM_WORKSPACE=~/exercism
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- Exercism CLI must be installed and configured separately

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - For faster command syncing
- `EXERCISM_WORKSPACE` - Custom workspace location

---

### 8. Command Control Bot
**Location:** `/root/discord-bots/command-control-bot/.env`

```bash
# Discord Bot Token
DISCORD_TOKEN=your_discord_bot_token_here

# Discord Application Client ID (for command registration)
CLIENT_ID=your_discord_application_id_here

# Guild ID - For instant slash command registration (optional)
# If set, commands register to this server instantly
# If not set, commands register globally (can take up to 1 hour)
GUILD_ID=your_discord_server_id_here

# Admin Configuration
# Comma-separated list of Discord User IDs that can use the bot
# Right-click your profile > Copy User ID (enable Developer Mode in settings)
ADMIN_USER_IDS=your_user_id_here

# Scheduler Configuration (Optional)
# Channel ID where scheduled command notifications are sent
# Leave empty to disable scheduler notifications
SCHEDULER_CHANNEL_ID=your_notification_channel_id_here
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - For command registration
- `ADMIN_USER_IDS` - Comma-separated list of user IDs allowed to use the bot

**Optional:**
- `GUILD_ID` - For instant command registration
- `SCHEDULER_CHANNEL_ID` - For scheduled command notifications

---

### 9. Reddit Filter Bot
**Location:** `/root/discord-bots/reddit-filter-bot/.env`

```bash
# Discord Bot Token
DISCORD_TOKEN=your_discord_bot_token_here

# Discord Application Client ID (for command registration)
CLIENT_ID=your_discord_application_id_here

# Guild ID - For instant slash command registration (optional)
# If set, commands register to this server instantly
# If not set, commands register globally (can take up to 1 hour)
GUILD_ID=your_discord_server_id_here

# Reddit Posts Output Channel
# Channel ID where Reddit posts will be sent
# Can also be changed via /reddit-config channel command
REDDIT_CHANNEL_ID=your_channel_id_here

# Reddit API Credentials
# Get from: https://www.reddit.com/prefs/apps
# Create a "script" type application
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT=discord:reddit-filter-bot:v1.0.0 (by /u/your_username)
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - For command registration
- `REDDIT_CLIENT_ID` - Reddit API client ID
- `REDDIT_CLIENT_SECRET` - Reddit API client secret
- `REDDIT_USERNAME` - Reddit username
- `REDDIT_PASSWORD` - Reddit password
- `REDDIT_USER_AGENT` - Reddit user agent string

**Optional:**
- `GUILD_ID` - For instant command registration
- `REDDIT_CHANNEL_ID` - Can be set via command

---

### 10. YouTube Monitor Bot
**Location:** `/root/discord-bots/youtube-monitor-bot/.env`

```bash
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

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - For command registration
- `YOUTUBE_API_KEY` - YouTube Data API v3 key

**Optional:**
- `GUILD_ID` - Server ID
- `CHECK_INTERVAL` - Cron format, default: `*/15 * * * *` (every 15 minutes)

**Getting YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable **YouTube Data API v3** (APIs & Services > Library)
4. Create API Key (APIs & Services > Credentials > Create Credentials > API Key)

---

### 11. Subscription Bot
**Location:** `/root/discord-bots/subscription-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application client ID (required for command deployment)

---

### 12. VPS Monitoring Bot
**Location:** `/root/discord-bots/vps-monitoring-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# VPS Connection Configuration
VPS_HOST=root@64.23.179.177
VPS_SSH_KEY=~/.ssh/id_rsa_deploy
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application client ID
- `VPS_HOST` - VPS host in format `user@host` (e.g., `root@64.23.179.177`)
- `VPS_SSH_KEY` - Path to SSH private key for VPS access

**Note:** On VPS, SSH key path should be: `/root/.ssh/id_rsa_deploy`
Set permissions: `chmod 600 ~/.ssh/id_rsa_deploy`

---

### 13. Spelling Bee Bot
**Location:** `/root/discord-bots/spelling-bee-bot/.env`

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_test_guild_id_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (optional - uses JSON if not set)
MONGODB_URI=mongodb://localhost:27017/spelling-bee-bot

# Environment
NODE_ENV=development
```

**Required:**
- `DISCORD_TOKEN` - Discord bot token
- `OPENAI_API_KEY` - OpenAI API key

**Optional:**
- `CLIENT_ID` - For command registration
- `GUILD_ID` - Server ID
- `MONGODB_URI` - Uses JSON storage if not set
- `NODE_ENV` - Set to `production` for production

---

### 14. MonitoRSS (News Bots)
**Location:** `/root/discord-bots/news-bots/MonitoRSS/.env`

**Note:** MonitoRSS uses a single `.env` file for all services. All services share the same bot token but use different variable names.

```bash
# Bot Presence Service
BOT_PRESENCE_DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
BOT_PRESENCE_STATUS="online"
BOT_PRESENCE_ACTIVITY_TYPE=""
BOT_PRESENCE_ACTIVITY_NAME=""

# Backend API Service
BACKEND_API_MONGODB_URI=mongodb://localhost:27017/rss
BACKEND_API_DEFAULT_REFRESH_RATE_MINUTES=10
BACKEND_API_DEFAULT_MAX_USER_FEEDS=10000
BACKEND_API_MAX_DAILY_ARTICLES_DEFAULT=100000
BACKEND_API_DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"  # Same token as above
BACKEND_API_DISCORD_CLIENT_ID="YOUR_CLIENT_ID_HERE"
BACKEND_API_DISCORD_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
BACKEND_API_SESSION_SECRET="GENERATE_64_CHAR_HEX_STRING"  # Generate: openssl rand -hex 32
BACKEND_API_SESSION_SALT="GENERATE_16_CHAR_HEX_STRING"    # Generate: openssl rand -hex 8
BACKEND_API_LOGIN_REDIRECT_URI=http://your-vps-ip:8000
BACKEND_API_DISCORD_REDIRECT_URI=http://your-vps-ip:8000/api/v1/discord/callback-v2
BACKEND_API_ALLOW_LEGACY_REVERSION=true

# User Feeds Service
USER_FEEDS_DISCORD_CLIENT_ID="YOUR_CLIENT_ID_HERE"  # Same as above
USER_FEEDS_DISCORD_API_TOKEN="YOUR_BOT_TOKEN_HERE"  # Same token as above
USER_FEEDS_DELIVERY_RECORD_PERSISTENCE_MONTHS=1
USER_FEEDS_ARTICLE_PERSISTENCE_MONTHS=12

# Discord REST Listener Service
DISCORD_REST_LISTENER_MONGO_URI=mongodb://localhost:27017/rss?replicaSet=dbrs&directConnection=true
DISCORD_REST_LISTENER_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"  # Same token as above
DISCORD_REST_LISTENER_BOT_CLIENT_ID="YOUR_CLIENT_ID_HERE"  # Same as above

# Feed Requests Service
FEED_REQUESTS_FEEDS_MONGODB_URI=mongodb://localhost:27017/rss?replicaSet=dbrs&directConnection=true
FEED_REQUESTS_FEED_REQUEST_DEFAULT_USER_AGENT="MonitoRSS [Self-Hosted]/1.0 your.email@example.com"
FEED_REQUESTS_HISTORY_PERSISTENCE_MONTHS=1
FEED_REQUESTS_MAX_FAIL_ATTEMPTS=11
FEED_REQUESTS_REQUEST_TIMEOUT_MS=15000
```

**Required Variables:**

1. **Bot Token** (used in 4 places - all use the SAME token):
   - `BOT_PRESENCE_DISCORD_BOT_TOKEN`
   - `BACKEND_API_DISCORD_BOT_TOKEN`
   - `DISCORD_REST_LISTENER_BOT_TOKEN`
   - `USER_FEEDS_DISCORD_API_TOKEN`

2. **Client ID** (used in 3 places - all use the SAME ID):
   - `BACKEND_API_DISCORD_CLIENT_ID`
   - `USER_FEEDS_DISCORD_CLIENT_ID`
   - `DISCORD_REST_LISTENER_BOT_CLIENT_ID`

3. **Client Secret**:
   - `BACKEND_API_DISCORD_CLIENT_SECRET`

4. **Session Secret** (generate new):
   ```bash
   openssl rand -hex 32
   ```
   - `BACKEND_API_SESSION_SECRET`

5. **Session Salt** (generate new):
   ```bash
   openssl rand -hex 8
   ```
   - `BACKEND_API_SESSION_SALT`

6. **Redirect URIs** (update with your VPS IP):
   - `BACKEND_API_DISCORD_REDIRECT_URI=http://your-vps-ip:8000/api/v1/discord/callback-v2`
   - `BACKEND_API_LOGIN_REDIRECT_URI=http://your-vps-ip:8000`

**Getting Credentials from Discord Developer Portal:**

- **Bot Token**: Discord Dev Portal → Your Application → Bot tab → Token section
- **Client ID**: Discord Dev Portal → Your Application → OAuth2 → General → Client ID
- **Client Secret**: Discord Dev Portal → Your Application → OAuth2 → General → Client Secret

**Quick Setup Commands:**

```bash
# Generate session secret
SESSION_SECRET=$(openssl rand -hex 32)
echo "BACKEND_API_SESSION_SECRET=\"$SESSION_SECRET\""

# Generate session salt
SESSION_SALT=$(openssl rand -hex 8)
echo "BACKEND_API_SESSION_SALT=\"$SESSION_SALT\""
```

---

## Get New Tokens (After Security Incident)

Discord reset your tokens. Get new ones from:

- **MonitoRSS**: https://discord.com/developers/applications/1462279038491033721/bot
- **Mr. Hall**: https://discord.com/developers/applications/1429281302183673886/bot
- **Other bots**: Check your Discord Developer Portal → Applications → [Your Bot] → Bot tab

---

## Restart Bots After Updating .env

```bash
# Restart all bots to load new environment variables
pm2 restart all

# Or restart specific bot
pm2 restart grammar-bot

# Check if environment variables loaded correctly
pm2 env grammar-bot
```

---

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use `.env.example` files** - These are safe to commit (no real tokens)
3. **Rotate tokens regularly** - Especially after exposure
4. **Use strong session secrets** - Generate with: `openssl rand -hex 32`
5. **Restrict file permissions** - On VPS: `chmod 600 .env`
6. **Never share tokens** - Keep them secret, only in `.env` files

---

## File Locations on VPS

```
/root/discord-bots/
├── coding-practice-bot/.env
├── grammar-bot/.env
├── github-bot/.env
├── reminder-bot/.env
├── starboard-bot/.env
├── exercism-bot/.env
├── todoist bot/.env
├── reddit-filter-bot/.env
├── youtube-monitor-bot/.env
├── command-control-bot/.env
├── subscription-bot/.env
├── vps-monitoring-bot/.env
├── spelling-bee-bot/.env
└── news-bots/MonitoRSS/.env  # Single file for all MonitoRSS services
```

---

## How PM2 Loads Environment Variables

PM2's `env_file` option automatically loads variables from the specified `.env` file and makes them available to the process as `process.env.VARIABLE_NAME` (Node.js) or `os.getenv("VARIABLE_NAME")` (Python).

**Example:**
```javascript
// ecosystem.config.js
{
  name: 'grammar-bot',
  env_file: '/root/discord-bots/grammar-bot/.env',  // PM2 loads this
  // Bot code can access: process.env.DISCORD_TOKEN
}
```

---

## Troubleshooting

**Bot not starting?**
- Check `.env` file exists: `ls -la /root/discord-bots/bot-name/.env`
- Verify token is set: `grep DISCORD_TOKEN /root/discord-bots/bot-name/.env`
- Check PM2 logs: `pm2 logs bot-name`
- Verify environment variables loaded: `pm2 env bot-name`

**Environment variables not loading?**
- Ensure `env_file` path in `ecosystem.config.js` is correct
- Restart PM2: `pm2 restart all`
- Verify file permissions: `chmod 600 .env`
- Check for typos in variable names (case-sensitive)

**MonitoRSS services not working?**
- Verify all 4 bot token variables use the SAME token
- Verify all 3 client ID variables use the SAME ID
- Check MongoDB is running: `systemctl status mongod`
- Verify redirect URIs match your VPS IP address

---

## Quick Reference: Where to Get Each Credential

| Credential | Where to Get |
|------------|--------------|
| **Discord Bot Token** | Discord Dev Portal → Applications → [Your Bot] → Bot tab → Token |
| **Discord Client ID** | Discord Dev Portal → Applications → [Your Bot] → OAuth2 → General → Client ID |
| **Discord Client Secret** | Discord Dev Portal → Applications → [Your Bot] → OAuth2 → General → Client Secret |
| **OpenAI API Key** | https://platform.openai.com/api-keys |
| **GitHub Token** | https://github.com/settings/tokens (scopes: public_repo, read:user) |
| **YouTube API Key** | Google Cloud Console → APIs & Services → Credentials → Create API Key |
| **Todoist API Token** | https://todoist.com/app/settings/integrations |
| **Reddit API Credentials** | https://www.reddit.com/prefs/apps (create "script" type app) |
| **Exercism Token** | https://exercism.org/settings/api_cli |
| **Session Secret** | Generate: `openssl rand -hex 32` |
| **Session Salt** | Generate: `openssl rand -hex 8` |
