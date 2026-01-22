# Complete Deployment Guide

## ✅ What's Done

1. ✅ GitHub repository setup
2. ✅ GitHub Actions workflow created (auto-deployment)
3. ✅ .gitignore configured (protects .env files)
4. ✅ PM2 ecosystem config ready
5. ✅ Deployment scripts created

## 🚀 Next Steps

### Step 1: Push to GitHub (if not done)

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots
git push -u origin main
```

### Step 2: Set Up GitHub Actions Secrets

1. Go to: `https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions`
2. Click **"New repository secret"** for each:

   **VPS_HOST:**
   - Name: `VPS_HOST`
   - Value: Your Droplet IP (e.g., `123.45.67.89`)

   **VPS_USERNAME:**
   - Name: `VPS_USERNAME`
   - Value: `root`

   **VPS_SSH_KEY:**
   - Name: `VPS_SSH_KEY`
   - Value: Your private SSH key (run on Mac: `cat ~/.ssh/id_rsa | pbcopy`)

   **VPS_PORT (optional):**
   - Name: `VPS_PORT`
   - Value: `22`

### Step 3: Deploy to VPS (First Time)

**On your VPS (SSH session):**

```bash
# Create directory
mkdir -p /root/discord-bots
cd /root/discord-bots

# Clone repository
git clone https://github.com/BlueFlashX1/discord-bots.git .

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Step 4: Create .env Files

For each bot, create `.env` file with Discord tokens:

```bash
cd /root/discord-bots

# Example: coding-practice-bot
nano coding-practice-bot/.env
```

Add:

```env
DISCORD_TOKEN=your_bot_token_here
```

Repeat for:

- `coding-practice-bot/.env`
- `command-control-bot/.env`
- `hangman-bot/.env`
- `spelling-bee-bot/.env`
- `grammar-bot/.env`
- `todoist bot/.env`
- `reddit-filter-bot/.env`
- `youtube-monitor-bot/.env`

### Step 5: Start Bots

```bash
cd /root/discord-bots

# Start all bots
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
# (Copy and run the command it gives you)

# Check status
pm2 list
```

### Step 6: Verify Auto-Deployment

Make a test change and push:

```bash
# On your Mac
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots
echo "# Test" >> README.md
git add .
git commit -m "Test auto-deployment"
git push
```

**Check GitHub Actions:**

- Go to repo → **"Actions"** tab
- Should see deployment running
- Green checkmark = success! ✅

## 📋 Quick Commands Reference

### On Your Mac (Updates)

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots

# Make changes, then:
git add .
git commit -m "Description"
git push  # Auto-deploys to VPS!
```

### On Your VPS (Manual)

```bash
# Check status
pm2 list

# View logs
pm2 logs --lines 50

# Restart bot
pm2 restart bot-name

# Manual update (if auto-deploy fails)
cd /root/discord-bots
git pull
pm2 restart all
```

## 🎉 You're All Set

**Workflow:**

1. Make changes on Mac
2. `git push`
3. GitHub Actions auto-deploys
4. Bots restart with new code
5. Done! (~2 minutes)

**No more manual uploads needed!** 🚀
