# Environment Variables Setup Guide

**CRITICAL:** All `.env` files are excluded from git. Never commit tokens or secrets.

## How It Works

PM2 loads environment variables from `.env` files using the `env_file` option in `ecosystem.config.js`. Each bot has its own `.env` file in its directory.

## Setup on VPS

### 1. Create `.env` Files for Each Bot

SSH into your VPS and create `.env` files in each bot directory:

```bash
# Node.js bots
cd /root/discord-bots/coding-practice-bot
cp .env.example .env
nano .env  # Edit with your actual token

cd /root/discord-bots/grammar-bot
cp .env.example .env
nano .env

# Python bots
cd /root/discord-bots/github-bot
cp .env.example .env
nano .env

# Repeat for all bots...
```

### 2. Required Environment Variables

#### Node.js Bots (coding-practice-bot, grammar-bot, etc.)
```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here  # Optional for some bots
```

#### Python Bots (github-bot, reminder-bot, etc.)
```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here  # Optional
GITHUB_TOKEN=your_github_token  # For github-bot only
```

#### MonitoRSS (Complex - uses single .env file)
Location: `/root/discord-bots/news-bots/MonitoRSS/.env`

Required variables:
```bash
BACKEND_API_DISCORD_BOT_TOKEN=your_bot_token
BACKEND_API_DISCORD_CLIENT_ID=your_client_id
BACKEND_API_DISCORD_CLIENT_SECRET=your_client_secret
BACKEND_API_DISCORD_REDIRECT_URI=http://your-vps-ip:8000/api/v1/discord/callback-v2
BACKEND_API_LOGIN_REDIRECT_URI=http://your-vps-ip:8000
BACKEND_API_MONGODB_URI=mongodb://localhost:27017/rss
BACKEND_API_SESSION_SECRET=generate_random_hex_string
BACKEND_API_SESSION_SALT=generate_random_hex_string
```

### 3. Get New Tokens (After Security Incident)

Discord reset your tokens. Get new ones from:

- **MonitoRSS**: https://discord.com/developers/applications/1462279038491033721/bot
- **Mr. Hall**: https://discord.com/developers/applications/1429281302183673886/bot
- Other bots: Check your Discord Developer Portal

### 4. Restart Bots After Updating .env

```bash
# Restart all bots to load new environment variables
pm2 restart all

# Or restart specific bot
pm2 restart grammar-bot
```

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use `.env.example` files** - These are safe to commit (no real tokens)
3. **Rotate tokens regularly** - Especially after exposure
4. **Use strong session secrets** - Generate with: `openssl rand -hex 32`
5. **Restrict file permissions** - On VPS: `chmod 600 .env`

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
└── news-bots/MonitoRSS/.env  # Single file for all MonitoRSS services
```

## How PM2 Loads Environment Variables

PM2's `env_file` option automatically loads variables from the specified `.env` file and makes them available to the process as `process.env.VARIABLE_NAME`.

**Example:**
```javascript
// ecosystem.config.js
{
  name: 'grammar-bot',
  env_file: '/root/discord-bots/grammar-bot/.env',  // PM2 loads this
  // Bot code can access: process.env.DISCORD_TOKEN
}
```

## Troubleshooting

**Bot not starting?**
- Check `.env` file exists: `ls -la /root/discord-bots/bot-name/.env`
- Verify token is set: `grep DISCORD_TOKEN /root/discord-bots/bot-name/.env`
- Check PM2 logs: `pm2 logs bot-name`

**Environment variables not loading?**
- Ensure `env_file` path in `ecosystem.config.js` is correct
- Restart PM2: `pm2 restart all`
- Verify file permissions: `chmod 600 .env`
