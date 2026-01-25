# VPS Deployment Guide

## Prerequisites

- VPS access (64.23.179.177)
- SSH key configured (`~/.ssh/id_rsa_deploy` or `~/.ssh/vps_key`)
- PM2 installed on VPS
- Python 3 installed on VPS

## Initial Setup

### 1. Configure Environment

Edit `.env` file with your bot credentials:

```bash
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here
```

### 2. Deploy to VPS

Run the deployment script:

```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

The script will:
- Create bot directory on VPS
- Copy all files
- Install Python dependencies
- Deploy Discord commands
- Start/restart bot with PM2

## Manual Deployment

If you prefer manual deployment:

### 1. Create Directory Structure

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "mkdir -p /root/discord-bots/starboard-bot/{data,config,services,utils,commands}"
```

### 2. Copy Files

```bash
# Main files
scp -i ~/.ssh/id_rsa_deploy bot.py root@64.23.179.177:/root/discord-bots/starboard-bot/
scp -i ~/.ssh/id_rsa_deploy deploy-commands.py root@64.23.179.177:/root/discord-bots/starboard-bot/
scp -i ~/.ssh/id_rsa_deploy requirements.txt root@64.23.179.177:/root/discord-bots/starboard-bot/
scp -i ~/.ssh/id_rsa_deploy .env root@64.23.179.177:/root/discord-bots/starboard-bot/

# Directories
scp -i ~/.ssh/id_rsa_deploy -r services/* root@64.23.179.177:/root/discord-bots/starboard-bot/services/
scp -i ~/.ssh/id_rsa_deploy -r utils/* root@64.23.179.177:/root/discord-bots/starboard-bot/utils/
scp -i ~/.ssh/id_rsa_deploy -r commands/* root@64.23.179.177:/root/discord-bots/starboard-bot/commands/
scp -i ~/.ssh/id_rsa_deploy -r config/* root@64.23.179.177:/root/discord-bots/starboard-bot/config/
```

### 3. Install Dependencies

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots/starboard-bot && python3 -m pip install -r requirements.txt"
```

### 4. Deploy Commands

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots/starboard-bot && python3 deploy-commands.py"
```

### 5. Start with PM2

**Option A: Add to ecosystem.config.js**

Add the starboard-bot entry to `/root/discord-bots/ecosystem.config.js`:

```javascript
{
  name: 'starboard-bot',
  script: 'bot.py',
  interpreter: 'python3',
  cwd: '/root/discord-bots/starboard-bot',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '300M',
  env: {
    NODE_ENV: 'production',
  },
  error_file: '/root/discord-bots/logs/starboard-bot-error.log',
  out_file: '/root/discord-bots/logs/starboard-bot-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
}
```

Then reload PM2:

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots && pm2 reload ecosystem.config.js"
```

**Option B: Start Standalone**

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots/starboard-bot && pm2 start bot.py --name starboard-bot --interpreter python3"
```

## Updating the Bot

### Quick Update (Using Script)

```bash
./deploy-vps.sh
```

### Manual Update

1. Make changes locally
2. Copy updated files to VPS
3. Restart bot:

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 restart starboard-bot"
```

## PM2 Commands

### Check Status

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 list | grep starboard-bot"
```

### View Logs

```bash
# Last 50 lines
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 logs starboard-bot --lines 50"

# Follow logs
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 logs starboard-bot --follow"
```

### Restart Bot

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 restart starboard-bot"
```

### Stop Bot

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 stop starboard-bot"
```

### Delete Bot from PM2

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 delete starboard-bot"
```

## Troubleshooting

### Bot Not Starting

1. Check logs:
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 logs starboard-bot --lines 100"
   ```

2. Check if .env file exists and has correct values:
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cat /root/discord-bots/starboard-bot/.env"
   ```

3. Check Python dependencies:
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots/starboard-bot && python3 -m pip list | grep discord"
   ```

### Bot Not Responding

1. Check if bot is online in Discord
2. Verify bot has required permissions
3. Check if forum channel is set correctly
4. Verify forum channel has tags created

### Commands Not Appearing

1. Redeploy commands:
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots/starboard-bot && python3 deploy-commands.py"
   ```

2. Wait a few minutes for Discord to sync commands globally

## File Structure on VPS

```
/root/discord-bots/starboard-bot/
├── bot.py
├── deploy-commands.py
├── requirements.txt
├── .env
├── .gitignore
├── ecosystem.config.js
├── data/
│   ├── starboard.json
│   └── config.json
├── config/
│   └── tags.json
├── services/
│   ├── __init__.py
│   ├── starboard_service.py
│   └── tag_classifier.py
├── utils/
│   ├── __init__.py
│   ├── data_manager.py
│   └── embeds.py
└── commands/
    ├── __init__.py
    └── config.py
```

## Logs Location

- **PM2 Logs**: `/root/discord-bots/logs/starboard-bot-*.log`
- **Error Log**: `/root/discord-bots/logs/starboard-bot-error.log`
- **Output Log**: `/root/discord-bots/logs/starboard-bot-out.log`
