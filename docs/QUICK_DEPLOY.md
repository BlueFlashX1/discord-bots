# Quick Deployment Guide - Get Bots Online 24/7

## 🚀 One-Time Setup (5 Minutes)

### Step 1: SSH to VPS

```bash
ssh root@64.23.179.177
```

### Step 2: Clone Repository (if not already)

```bash
mkdir -p /root/discord-bots
cd /root/discord-bots
git clone https://github.com/BlueFlashX1/discord-bots.git .
```

### Step 3: Run Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

This script:
- ✅ Installs Node.js, PM2, Git
- ✅ Installs all bot dependencies
- ✅ Starts all bots with PM2
- ✅ **Sets up auto-start on reboot** (keeps bots online 24/7!)

### Step 4: Create .env Files

For each bot, create `.env` file with tokens:

```bash
# Example for coding-practice-bot
cd /root/discord-bots/coding-practice-bot
nano .env
# Add: DISCORD_TOKEN=your_token_here
# Save: Ctrl+X, Y, Enter

# Repeat for each bot that needs .env
```

### Step 5: Restart Bots (to load .env)

```bash
cd /root/discord-bots
pm2 restart all
pm2 save
```

### Step 6: Verify

```bash
pm2 list
# Should show all bots as "online" (green)
```

## ✅ Done!

Your bots are now:
- ✅ Running 24/7
- ✅ Auto-restart on crashes
- ✅ Auto-start on server reboot
- ✅ Auto-deploy on `git push`

## 🔄 After Initial Setup

**You never need to SSH again!** Just:

1. Edit code locally
2. `git push`
3. GitHub Actions handles everything automatically

## 🔍 Quick Status Check

```bash
ssh root@64.23.179.177
pm2 list              # See all bots
pm2 logs [bot-name]  # View logs
```

## 🎯 The Magic: PM2 Auto-Start

The `deploy.sh` script runs:
```bash
pm2 startup systemd -u root --hp /root
pm2 save
```

This creates a system service that:
- Starts PM2 when server boots
- PM2 starts all your bots
- **Bots stay online 24/7 automatically!**

No manual commands needed after initial setup! 🎉
