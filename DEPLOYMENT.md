# MoltBot VPS Deployment Scripts

## 🚀 Quick Deploy

### Step 1: Update VPS IP
Edit the deployment script and set your VPS IP:
```bash
nano /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/deploy-moltbot.sh
# Replace YOUR_VPS_IP with your actual VPS IP address
```

### Step 2: Deploy from Local
```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots
./deploy-moltbot.sh
```

### Step 3: SSH & Setup on VPS
```bash
# Edit the SSH script with your VPS IP
nano /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/vps-ssh-setup.sh

# Run one-command setup
./vps-ssh-setup.sh
```

## 📋 Scripts Overview

| Script | Purpose | Where to Run |
|--------|---------|--------------|
| `deploy-moltbot.sh` | Sync files to VPS & basic setup | Local (macOS) |
| `vps-setup-moltbot.sh` | Full VPS configuration | VPS (Linux) |
| `vps-ssh-setup.sh` | SSH + auto-run setup | Local (macOS) |

## 🔧 Manual VPS Commands

If scripts fail, run these commands manually on VPS:

```bash
# 1. Navigate to moltbot
cd /root/discord-bots/moltbot

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
nano .env  # Add your credentials

# 4. Setup directories
mkdir -p logs automations/output

# 5. Set permissions
chmod +x automations/scripts/*.sh

# 6. Update ecosystem config
# Add moltbot entry to /root/discord-bots/ecosystem.config.js

# 7. Start with PM2
pm2 start /root/discord-bots/ecosystem.config.js --only moltbot

# 8. Check status
pm2 status
pm2 logs moltbot
```

## 📝 Ecosystem Config Entry

Add this to `/root/discord-bots/ecosystem.config.js`:

```javascript
{
  name: 'moltbot',
  script: 'src/index.js',
  cwd: '/root/discord-bots/moltbot',
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  max_memory_restart: '512M',
  env_file: '/root/discord-bots/moltbot/.env',
  env: {
    NODE_ENV: 'production',
  },
  error_file: '/root/discord-bots/logs/moltbot-error.log',
  out_file: '/root/discord-bots/logs/moltbot-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
},
```

## 🔐 Required Environment Variables

Edit `/root/discord-bots/moltbot/.env`:

```bash
DISCORD_TOKEN=your_actual_discord_bot_token
ANTHROPIC_API_KEY=your_actual_anthropic_api_key
ALLOWED_USER_IDS=your_discord_user_id_number
```

## 🚨 Important Notes

- **NEVER** commit `.env` files
- **ALWAYS** use SSH keys for VPS access
- **KEEP** credentials separate between local and VPS
- **MONITOR** with `pm2 logs moltbot`
- **TEST** sandbox restrictions before production use

## 🔍 Troubleshooting

If MoltBot won't start:

1. Check .env file: `cat .env`
2. Verify dependencies: `npm ls`
3. Check PM2 status: `pm2 status`
4. View error logs: `pm2 logs moltbot --err`
5. Test manually: `node src/index.js`