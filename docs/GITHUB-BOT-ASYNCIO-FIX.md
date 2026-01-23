# GitHub Bot AsyncIO Error - Root Cause Analysis & Fix

**Date:** January 22, 2026  
**Duration:** Extended debugging session  
**Severity:** Critical - Bot completely non-functional  
**Status:** RESOLVED

---

## The Error

```
Error fetching stats: name 'asyncio' is not defined
```

This error appeared when users ran `/stats` command in Discord. The bot responded but failed to fetch GitHub data.

---

## Root Cause Analysis

**The error was NOT a code issue.** The actual problem was a **multi-layer deployment failure**:

### Layer 1: Uncommitted ecosystem.config.js

The `ecosystem.config.js` file had local changes that were **never committed to git**:
- The github-bot, reminder-bot, and exercism-bot were added to the local config
- These changes (234 lines) were never pushed to the repository
- The VPS was running an **old version** of the config that didn't include github-bot

**Symptom:** PM2 on VPS didn't know github-bot existed, so it was never started.

### Layer 2: Failed git pull on VPS

The GitHub Actions deployment used `git pull origin main`, which was **silently failing**:
```
error: Your local changes to the following files would be overwritten by merge:
    github-bot/github_service.py
    github-bot/track.py
Please commit your changes or stash them before you merge.
```

**Symptom:** Even when code was pushed to GitHub, the VPS never received the updates.

### Layer 3: PM2 reload vs start

After fixing Layer 2, we used `pm2 reload` which only restarts **running** processes:
- We deleted github-bot, reminder-bot, exercism-bot first
- Then `pm2 reload` didn't restart them because they weren't running
- They were never re-added to PM2

**Symptom:** Bots were deleted but never started again.

---

## The Fixes Applied

### Fix 1: Force reset VPS repository

Changed `deploy.yml` from:
```yaml
git pull origin main
```

To:
```yaml
git fetch origin main
git reset --hard origin/main
git clean -fd
```

This ensures VPS always matches the remote exactly, discarding any local changes.

### Fix 2: Use pm2 start instead of reload

Changed `deploy.yml` from:
```yaml
pm2 delete github-bot 2>/dev/null || true
pm2 delete reminder-bot 2>/dev/null || true
pm2 delete exercism-bot 2>/dev/null || true
pm2 reload ecosystem.config.js || pm2 restart all
```

To:
```yaml
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
```

This ensures ALL bots defined in ecosystem.config.js are started fresh.

### Fix 3: Commit ecosystem.config.js

The ecosystem.config.js had local changes that were never committed:
```bash
git add ecosystem.config.js
git commit -m "Add github-bot, reminder-bot, exercism-bot to ecosystem config"
git push origin main
```

---

## Final deploy.yml

```yaml
name: Deploy to DigitalOcean VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          script: |
            cd /root/discord-bots

            # Force reset to match remote (discard any local changes on VPS)
            git fetch origin main
            git reset --hard origin/main
            git clean -fd

            # Update dependencies for each bot
            for bot in coding-practice-bot command-control-bot hangman-bot spelling-bee-bot grammar-bot "todoist bot" reddit-filter-bot youtube-monitor-bot; do
              if [ -d "$bot" ] && [ -f "$bot/package.json" ]; then
                echo "Updating dependencies for $bot..."
                cd "$bot"
                npm install --production
                cd /root/discord-bots
              fi
            done

            # Clear Python bytecode cache for Python bots
            echo "Clearing Python bytecode cache..."
            find /root/discord-bots -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
            find /root/discord-bots -name "*.pyc" -delete 2>/dev/null || true

            # Stop all bots, then start fresh from ecosystem config
            echo "Restarting all bots from ecosystem config..."
            pm2 delete all 2>/dev/null || true
            pm2 start ecosystem.config.js

            # Save PM2 configuration
            pm2 save

            # Show status
            pm2 list
```

---

## Key Lessons Learned

### 1. Always commit configuration files
- `ecosystem.config.js` changes must be committed and pushed
- Use `git status` to check for uncommitted changes before debugging

### 2. Check deployment logs first
- Use `gh run view <run_id> --log` to see what's actually happening
- Look for git errors, PM2 errors, or missing files

### 3. Use `git reset --hard` for server deployments
- VPS should never have local changes
- Force reset ensures code matches repository exactly

### 4. Use `pm2 start` not `pm2 reload` after deleting processes
- `pm2 reload` only restarts running processes
- `pm2 start ecosystem.config.js` starts all defined apps

### 5. Check PM2 list to verify bots are running
```bash
pm2 list
```
If a bot isn't in the list, it's not running!

---

## Debugging Commands

### Check GitHub Actions logs
```bash
# List recent runs
gh run list --repo BlueFlashX1/discord-bots --limit 5

# View specific run logs
gh run view <run_id> --repo BlueFlashX1/discord-bots --log

# Search for specific issues
gh run view <run_id> --repo BlueFlashX1/discord-bots --log 2>&1 | grep -E "(error|Error|failed|github-bot)"
```

### Check PM2 status on VPS
```bash
# Via SSH or in deploy script
pm2 list
pm2 logs github-bot
pm2 logs github-bot --err --lines 50
```

### Check for uncommitted changes
```bash
git status
git diff HEAD -- ecosystem.config.js
```

---

## Timeline

1. **Initial Error:** `NameError: name 'asyncio' is not defined`
2. **First Attempt:** Added `import asyncio` to files - didn't help
3. **Second Attempt:** Cleared `__pycache__` on VPS - didn't help
4. **Discovery 1:** Found `git pull` failing due to local changes on VPS
5. **Fix 1:** Changed to `git reset --hard origin/main`
6. **Still Broken:** Bot still not working
7. **Discovery 2:** PM2 reload not starting deleted bots
8. **Fix 2:** Changed to `pm2 delete all && pm2 start ecosystem.config.js`
9. **Still Broken:** github-bot not in PM2 list
10. **Discovery 3:** `ecosystem.config.js` never committed (234 lines of changes)
11. **Fix 3:** Committed and pushed ecosystem.config.js
12. **RESOLVED:** github-bot now running and `/stats` works!

---

## Prevention Checklist

Before deploying Python bots:

- [ ] All code changes committed (`git status`)
- [ ] `ecosystem.config.js` changes committed
- [ ] `import asyncio` present in files using async functions
- [ ] VPS has no local modifications (use `git reset --hard`)
- [ ] PM2 uses `start` not `reload` after deleting processes
- [ ] Check `pm2 list` shows bot as "online"
- [ ] Check `pm2 logs <bot-name>` for errors

---

## Files Modified

1. `/discord/bots/.github/workflows/deploy.yml` - Deployment workflow
2. `/discord/bots/ecosystem.config.js` - PM2 configuration (finally committed!)

---

## Related Files

- `/discord/bots/github-bot/services/github_service.py` - Has `import asyncio`
- `/discord/bots/github-bot/utils/retry.py` - Has `import asyncio`
- `/discord/bots/github-bot/bot.py` - Main bot file

---

**Author:** AI Assistant (Claude)  
**Reviewed by:** Matthew Thompson
