# Initial Deployment - Getting Bots Online 24/7

## 🎯 Goal

Deploy your Discord bots to the VPS **once**, and they'll stay online 24/7 automatically - even after server reboots!

## How It Works

### PM2 Process Manager

PM2 is what keeps your bots running 24/7:

1. **Auto-Restart:** If a bot crashes, PM2 automatically restarts it
2. **Startup Script:** PM2 is configured to start all bots when the server boots
3. **Monitoring:** PM2 watches your bots and keeps them alive
4. **Logging:** All bot logs are saved automatically

### The Magic: `pm2 startup`

When you run `pm2 startup`, it creates a systemd service that:

- Starts PM2 when the server boots
- PM2 then starts all your bots automatically
- **You never need to manually start them again!**

## 📋 First-Time Deployment Steps

### Step 1: Clone Repository on VPS

SSH to your VPS and clone your repository:

```bash
ssh root@64.23.179.177

# Create directory and clone
mkdir -p /root/discord-bots
cd /root/discord-bots
git clone https://github.com/BlueFlashX1/discord-bots.git .
```

**Or if you already have it cloned, just update:**

```bash
cd /root/discord-bots
git pull origin main
```

### Step 2: Run Initial Deployment Script

The `deploy.sh` script does everything:

```bash
cd /root/discord-bots
chmod +x deploy.sh
./deploy.sh
```

**What it does:**

- ✅ Updates system packages
- ✅ Installs Node.js 20.x
- ✅ Installs PM2 globally
- ✅ Installs Git
- ✅ Installs dependencies for all bots
- ✅ Starts all bots with PM2
- ✅ Saves PM2 configuration
- ✅ **Sets up auto-start on reboot** (this is the key!)

### Step 3: Create .env Files

Each bot needs its `.env` file with tokens/secrets:

```bash
# For each bot, create .env file
cd /root/discord-bots/coding-practice-bot
nano .env
# Paste your bot token and other secrets
# Save: Ctrl+X, Y, Enter

# Repeat for each bot
cd /root/discord-bots/command-control-bot
nano .env
# ... etc
```

### Step 4: Start Bots (if not already started)

If bots aren't running yet:

```bash
cd /root/discord-bots
pm2 start ecosystem.config.js
pm2 save
```

### Step 5: Verify Auto-Start Setup

Check that PM2 will start on reboot:

```bash
pm2 startup
# This will show a command - run it if needed
pm2 save
```

**Verify it's set up:**

```bash
systemctl status pm2-root
# Should show "active (running)"
```

## ✅ That's It

Once deployed, your bots will:

- ✅ Run 24/7 automatically
- ✅ Auto-restart if they crash
- ✅ Start automatically after server reboot
- ✅ Log everything for debugging

## 🔄 How Updates Work

After initial deployment, you **never need to SSH to the VPS again** for updates:

1. **Edit code locally** on your Mac
2. **Commit and push:**

   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

3. **GitHub Actions automatically:**
   - Connects to VPS
   - Pulls latest code
   - Updates dependencies
   - Restarts bots with PM2

**You don't need to run any commands on the VPS!**

## 🔍 Verify Bots Are Running

### Check Status

```bash
ssh root@64.23.179.177
pm2 list
```

Should show all bots with status "online" (green).

### Check Logs

```bash
pm2 logs [bot-name]        # Specific bot
pm2 logs                   # All bots
pm2 logs --lines 50        # Last 50 lines
```

### Test Auto-Restart

PM2 automatically restarts crashed bots. To test:

```bash
pm2 restart [bot-name]     # Manual restart
# Or kill a process - PM2 will restart it automatically
```

## 🚨 Troubleshooting

### Bots Not Starting on Reboot

If bots don't start after server reboot:

```bash
# Re-run PM2 startup setup
pm2 startup systemd -u root --hp /root
pm2 save

# Verify
systemctl status pm2-root
```

### Bots Not Running

```bash
# Check PM2 status
pm2 list

# Start all bots
pm2 start ecosystem.config.js
pm2 save

# Check logs for errors
pm2 logs --lines 100
```

### Missing Dependencies

```bash
cd /root/discord-bots
# Update dependencies for all bots
for bot in coding-practice-bot command-control-bot hangman-bot spelling-bee-bot grammar-bot "todoist bot" reddit-filter-bot youtube-monitor-bot; do
  if [ -d "$bot" ] && [ -f "$bot/package.json" ]; then
    echo "Updating $bot..."
    cd "$bot"
    npm install --production
    cd /root/discord-bots
  fi
done
```

## 📊 PM2 Commands Reference

| Command | What It Does |
|---------|--------------|
| `pm2 list` | Show all bots and status |
| `pm2 logs [bot]` | View logs for a bot |
| `pm2 restart [bot]` | Restart a bot |
| `pm2 stop [bot]` | Stop a bot |
| `pm2 start ecosystem.config.js` | Start all bots |
| `pm2 save` | Save current PM2 state |
| `pm2 startup` | Setup auto-start on reboot |
| `pm2 monit` | Real-time monitoring dashboard |
| `pm2 delete all` | Stop and remove all bots |

## 🎯 Key Points

1. **One-time setup:** Run `deploy.sh` once, then you're done
2. **Auto-restart:** PM2 restarts crashed bots automatically
3. **Auto-start on reboot:** `pm2 startup` ensures bots start after server restarts
4. **Auto-deploy:** GitHub Actions handles all code updates
5. **No manual commands needed:** Once set up, everything is automatic!

## 🔐 Security Note

Make sure your `.env` files on the VPS contain all required tokens and secrets. These are NOT in Git (they're in `.gitignore`), so you need to create them manually on the VPS.

## ✅ Verification Checklist

After initial deployment, verify:

- [ ] All bots show "online" in `pm2 list`
- [ ] Bots respond to commands in Discord
- [ ] Logs show no errors: `pm2 logs`
- [ ] PM2 startup is configured: `systemctl status pm2-root`
- [ ] Test reboot: Restart VPS, bots should auto-start

Once all checked, your bots are running 24/7! 🎉
