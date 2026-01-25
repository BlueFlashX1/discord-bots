# VPS Deployment Requirement - CRITICAL

## ⚠️ MANDATORY: Always Update Both Local AND VPS

**When fixing or updating any Discord bot, you MUST update BOTH:**
1. **Local/macOS version** (development machine)
2. **VPS version** (production server at 64.23.179.177)

**AI assistants frequently forget to update the VPS. This document exists to prevent that.**

---

## Why This Matters

- **Local bot** runs on macOS for development/testing
- **VPS bot** runs on production server (64.23.179.177) via PM2
- **Users interact with the VPS bot** - if it's not updated, fixes don't reach users
- **Both bots can be running simultaneously** - they need to stay in sync

---

## VPS Information

- **Host**: 64.23.179.177
- **User**: root
- **SSH Key**: `~/.ssh/id_rsa_deploy` or `~/.ssh/vps_key`
- **Bot Directory**: `/root/discord-bots/[bot-name]/`
- **Process Manager**: PM2
- **Logs**: `/root/discord-bots/logs/[bot-name]-*.log`

---

## Deployment Workflow

### Step 1: Fix the Code Locally

```bash
# Make your fixes in the local codebase
cd ~/Documents/DEVELOPMENT/discord/bots/[bot-name]
# Edit files, test locally, etc.
```

### Step 2: Test Locally (Optional but Recommended)

```bash
# Restart local bot to test
pkill -f "node index.js"  # or whatever the bot process is
node index.js  # Test your fixes
```

### Step 3: Update VPS (MANDATORY)

**Option A: Use Update Script (Recommended)**

For grammar-bot:
```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./scripts/update-grammar-bot-vps.sh
```

**Option B: Manual Update**

```bash
# Copy fixed files to VPS
scp -i ~/.ssh/id_rsa_deploy \
  grammar-bot/commands/budget.js \
  root@64.23.179.177:/root/discord-bots/grammar-bot/commands/

scp -i ~/.ssh/id_rsa_deploy \
  grammar-bot/services/budgetMonitor.js \
  root@64.23.179.177:/root/discord-bots/grammar-bot/services/

# Restart bot on VPS
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 \
  "pm2 restart grammar-bot"
```

**Option C: GitHub Auto-Deploy (If Pushed to Main)**

The GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on push to `main`:
- Pushes code to VPS
- Runs `npm install`
- Restarts all bots via PM2

```bash
git add .
git commit -m "Fix: [description]"
git push origin main
# Wait for GitHub Actions to deploy
```

---

## Quick Reference: Update Scripts

### Grammar Bot
```bash
./scripts/update-grammar-bot-vps.sh
```

### Create Update Script for Other Bots

Copy the grammar-bot update script and modify:
- Bot name
- Files to copy
- PM2 process name

Example template:
```bash
#!/bin/bash
# Update [bot-name] on VPS

VPS_IP="64.23.179.177"
VPS_USER="root"
VPS_DIR="/root/discord-bots/[bot-name]"
KEY_PATH="$HOME/.ssh/id_rsa_deploy"
LOCAL_DIR="$HOME/Documents/DEVELOPMENT/discord/bots/[bot-name]"

# Copy files
scp -i "$KEY_PATH" "$LOCAL_DIR/[file1]" "$VPS_USER@$VPS_IP:$VPS_DIR/"
scp -i "$KEY_PATH" "$LOCAL_DIR/[file2]" "$VPS_USER@$VPS_IP:$VPS_DIR/"

# Restart
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" "pm2 restart [bot-name]"
```

---

## Verification Checklist

After updating VPS, verify:

- [ ] Files copied successfully (check with `scp` or `ssh`)
- [ ] Bot restarted on VPS (`pm2 list | grep [bot-name]`)
- [ ] Bot is online (`pm2 status`)
- [ ] No errors in logs (`pm2 logs [bot-name] --lines 20`)
- [ ] Test the fix on VPS bot (not just local)

---

## Common Mistakes (What NOT to Do)

❌ **Fix code locally, test locally, assume it's done**
- **Problem**: VPS bot still has old code
- **Result**: Users still see the bug

❌ **Update VPS but forget to restart PM2**
- **Problem**: Old code still running in memory
- **Result**: Fix doesn't take effect

❌ **Update one file but forget related files**
- **Problem**: Partial update causes inconsistencies
- **Result**: Bot breaks in new ways

❌ **Forget to check VPS logs after update**
- **Problem**: Bot might have errors you don't see
- **Result**: Bot appears "fixed" but actually broken

---

## PM2 Commands Reference

```bash
# Connect to VPS
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177

# Check bot status
pm2 list | grep [bot-name]

# Restart specific bot
pm2 restart [bot-name]

# View logs
pm2 logs [bot-name] --lines 50

# View only errors
pm2 logs [bot-name] --err --lines 50

# Stop bot
pm2 stop [bot-name]

# Start bot
pm2 start [bot-name]

# Restart all bots
pm2 restart all
```

---

## Which Bots Run on VPS?

Check `ecosystem.config.js` for all bots managed by PM2:

- coding-practice-bot
- command-control-bot
- hangman-bot
- **grammar-bot** ⚠️
- todoist-bot
- reddit-filter-bot
- youtube-monitor-bot
- github-bot
- reminder-bot
- exercism-bot
- MonitoRSS services

**All of these need VPS updates when fixed locally.**

---

## AI Assistant Instructions

**When fixing any Discord bot:**

1. ✅ Fix the code locally
2. ✅ Test locally (if possible)
3. ✅ **UPDATE VPS** (use update script or manual method)
4. ✅ **VERIFY VPS update** (check logs, test on VPS bot)
5. ✅ Document what was fixed

**DO NOT:**
- ❌ Stop after fixing locally
- ❌ Assume GitHub Actions will deploy (check if it's enabled)
- ❌ Forget to restart PM2 on VPS
- ❌ Skip verification

**Remember: Users interact with the VPS bot, not the local one!**

---

## Emergency: Quick VPS Update

If you need to quickly update a single file on VPS:

```bash
# 1. Copy file
scp -i ~/.ssh/id_rsa_deploy \
  ~/Documents/DEVELOPMENT/discord/bots/grammar-bot/commands/budget.js \
  root@64.23.179.177:/root/discord-bots/grammar-bot/commands/

# 2. Restart bot
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 restart grammar-bot"

# 3. Check status
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "pm2 logs grammar-bot --lines 10"
```

---

## Integration with GitHub Actions

The `.github/workflows/deploy.yml` workflow auto-deploys on push to `main`:

- ✅ Automatically updates all bots
- ✅ Runs `npm install` for each bot
- ✅ Restarts via PM2
- ✅ Shows deployment status

**However:** This only works if:
- Code is pushed to `main` branch
- GitHub Actions secrets are configured
- You're okay with deploying all bots (not just one)

**For single-bot fixes:** Use the update script instead.

---

## Troubleshooting

### Bot Not Updating on VPS

1. **Check if file was copied:**
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 \
     "cat /root/discord-bots/grammar-bot/commands/budget.js | head -20"
   ```

2. **Check if PM2 restarted:**
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 \
     "pm2 list | grep grammar-bot"
   ```

3. **Check logs for errors:**
   ```bash
   ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 \
     "pm2 logs grammar-bot --lines 50 --err"
   ```

### SSH Connection Issues

- **Check key permissions:** `chmod 600 ~/.ssh/id_rsa_deploy`
- **Test connection:** `ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "echo 'Connected'"`
- **Use alternative key:** Try `~/.ssh/vps_key` if `id_rsa_deploy` doesn't work

---

## Summary

**CRITICAL RULE:** Every bot fix requires **TWO updates**:
1. Local/macOS (for development)
2. VPS (for production users)

**AI assistants must:**
- ✅ Always update VPS after local fixes
- ✅ Verify VPS update succeeded
- ✅ Check VPS logs for errors
- ✅ Test on VPS bot, not just local

**This document exists because AI assistants keep forgetting the VPS update step.**

---

**Last Updated:** 2026-01-23
**Created After:** Grammar bot budget command fix where VPS wasn't updated initially
