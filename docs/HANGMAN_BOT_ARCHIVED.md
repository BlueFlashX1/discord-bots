# Hangman Bot - Archived

**Date:** January 23, 2026  
**Reason:** Friends not interested in hangman bot anymore

---

## Archive Summary

The hangman-bot has been successfully archived both locally (macOS) and on the VPS.

### Local Archive Location
```
~/Documents/DEVELOPMENT/discord/bots/_archive/hangman-bot-archived-20260123/
```

### VPS Archive Location
```
/root/discord-bots/_archive/hangman-bot-archived-20260123/
```

---

## Actions Completed

### ✅ VPS Actions
- [x] Stopped hangman-bot process via PM2
- [x] Deleted hangman-bot from PM2
- [x] Moved hangman-bot directory to `_archive/` on VPS
- [x] Archived hangman-bot logs on VPS
- [x] Updated ecosystem.config.js on VPS (removed hangman-bot entry)
- [x] Saved PM2 configuration

### ✅ Local Actions
- [x] Moved hangman-bot directory to `_archive/` locally
- [x] Removed hangman-bot from `ecosystem.config.js`
- [x] Removed hangman-bot from GitHub Actions workflow (`.github/workflows/deploy.yml`)

---

## Files Modified

1. **ecosystem.config.js**
   - Removed hangman-bot app configuration
   - Added comment: `// hangman-bot removed - archived on 2026-01-23 (friends not interested anymore)`

2. **.github/workflows/deploy.yml**
   - Removed `hangman-bot` from the deployment loop
   - Added comment noting the removal

---

## Restoration Instructions

If you need to restore the hangman-bot in the future:

### 1. Restore from Archive
```bash
# Local
mv ~/Documents/DEVELOPMENT/discord/bots/_archive/hangman-bot-archived-20260123 \
   ~/Documents/DEVELOPMENT/discord/bots/hangman-bot

# VPS
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177
mv /root/discord-bots/_archive/hangman-bot-archived-20260123 \
   /root/discord-bots/hangman-bot
```

### 2. Re-add to ecosystem.config.js
Add the hangman-bot configuration back to `ecosystem.config.js`:
```javascript
{
  name: 'hangman-bot',
  script: 'index.js',
  cwd: '/root/discord-bots/hangman-bot',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'production',
  },
  error_file: '/root/discord-bots/logs/hangman-bot-error.log',
  out_file: '/root/discord-bots/logs/hangman-bot-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
},
```

### 3. Re-add to GitHub Actions
Add `hangman-bot` back to the deployment loop in `.github/workflows/deploy.yml`

### 4. Start the Bot
```bash
# VPS
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177
cd /root/discord-bots
pm2 start ecosystem.config.js
pm2 save
```

---

## Notes

- The bot's database and configuration files are preserved in the archive
- All logs have been archived
- The bot can be fully restored from the archive if needed
- No data was deleted, only moved to archive

---

**Archive Script:** `scripts/archive-hangman-bot.sh`
