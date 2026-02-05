# Master Bot Deployment System

This directory contains scripts for deploying multiple Discord bots to your VPS using rsync.

## 🚀 Quick Setup

### 1. Configure VPS Details
Edit the VPS settings in each deployment script:
- `VPS_USER` - Your SSH username on VPS
- `VPS_HOST` - Your VPS IP address  
- `VPS_BASE` - Base path to bots directory on VPS

### 2. Make Scripts Executable
```bash
chmod +x deploy-all.sh deploy-bot.sh deploy-moltbot.sh deploy-quick.sh
```

## 📋 Deployment Options

### **Deploy ALL Bots**
```bash
./deploy-all.sh
```

### **Deploy Specific Bot**
```bash
./deploy-all.sh --bot=moltbot
./deploy-bot.sh moltbot
```

### **Dry Run (Preview Changes)**
```bash
./deploy-all.sh --dry-run
./deploy-all.sh --bot=moltbot --dry-run
```

### **Watch Mode (Auto-sync)**
```bash
# Install fswatch first
brew install fswatch

# Watch all bots
./deploy-all.sh --watch

# Watch specific bot (use individual script)
./moltbot/auto-sync.sh
```

### **List Available Bots**
```bash
./deploy-all.sh --list
```

## 🎯 Individual Scripts

- `deploy-all.sh` - Master script for all bots
- `deploy-bot.sh` - Simple single bot deployment
- `moltbot/deploy-quick.sh` - Fast moltbot deployment
- `moltbot/deploy-moltbot.sh` - Advanced moltbot deployment
- `moltbot/auto-sync.sh` - Moltbot watch mode

## ⚙️ Configuration Examples

### VPS Directory Structure (recommended):
```
/home/username/discord-bots/
├── moltbot/
├── subscription-bot/
├── command-control-bot/
├── news-bots/
└── subscription-tracker/
```

### Edit in each script:
```bash
VPS_USER="your_vps_username"
VPS_HOST="123.45.67.89"
VPS_BASE="/home/your_username/discord-bots"
```

## 🔧 What Gets Synced

### ✅ Included
- All source code
- Configuration files
- Package files
- Documentation

### ❌ Excluded (standard)
- `node_modules/` (reinstalled on VPS)
- `.env*` files (security)
- `logs/` directories
- `*.log` files
- `.DS_Store` files
- `.pm2/` directories
- `_archive/` directories

## 🔄 Automated Workflows

### Development Setup
```bash
# Terminal 1: Watch moltbot for changes
cd moltbot && ./auto-sync.sh

# Terminal 2: Deploy other bots as needed
./deploy-bot.sh subscription-bot
./deploy-all.sh --watch
```

### Production Deployment
```bash
# Preview changes
./deploy-all.sh --dry-run

# Deploy all
./deploy-all.sh

# Deploy single critical bot
./deploy-bot.sh moltbot
```

## 🎮 PM2 Commands (on VPS)

After deployment, you can manage bots:

```bash
# List all bots
pm2 list

# Restart specific bot
pm2 restart moltbot

# Check logs
pm2 logs moltbot

# Restart all bots
pm2 restart all

# Save configuration
pm2 save
```

## 🛡️ Security Notes

- All `.env` files are excluded (VPS has its own)
- SSH keys should be passwordless for automation
- Use individual bot scripts for granular control
- Always test with `--dry-run` first

## 🚀 Quick Start Commands

```bash
# 1. Configure VPS settings
nano deploy-all.sh

# 2. Test connection
ssh your_user@your_vps_ip

# 3. Deploy all bots
./deploy-all.sh

# 4. Or watch for changes
./deploy-all.sh --watch
```