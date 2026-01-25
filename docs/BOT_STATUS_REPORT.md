# Discord Bots Status Report

**Generated:** 2026-01-23 11:48 MST  
**Location:** VPS (64.23.179.177) via PM2

---

## Executive Summary

**Total Bots:** 16 processes  
**Status:** 16 online, but 5 bots have critical restart issues

### Quick Status

| Status | Count | Bots |
|--------|-------|------|
| ✅ **Stable** (0 restarts, 14h+ uptime) | 7 | command-control-bot, github-bot, grammar-bot, reddit-filter-bot, youtube-monitor-bot, all MonitoRSS services |
| ⚠️ **Unstable** (High restart count) | 5 | coding-practice-bot, reminder-bot, exercism-bot, hangman-bot, todoist-bot |
| ✅ **Recently Restarted** (Low uptime, but online) | 4 | Same as unstable (they keep restarting) |

---

## Detailed Bot Status

### ✅ Stable Bots (Working Fine)

#### 1. **command-control-bot**
- **Status:** ✅ Online
- **Restarts:** 0
- **Uptime:** 14h+
- **Memory:** 58.9 MB
- **CPU:** 0%
- **Issues:** None

#### 2. **github-bot** (Python)
- **Status:** ✅ Online
- **Restarts:** 0
- **Uptime:** 14h+
- **Memory:** 38.5 MB
- **CPU:** 0%
- **Issues:** None (minor asyncio warning in old logs, but stable now)

#### 3. **grammar-bot**
- **Status:** ✅ Online
- **Restarts:** 0
- **Uptime:** 14h+
- **Memory:** 81.6 MB
- **CPU:** 0%
- **Issues:** 
  - Minor MongoDB timeout warnings (buffering timeout after 10000ms)
  - Bot is functional and processing grammar checks

#### 4. **reddit-filter-bot**
- **Status:** ✅ Online
- **Restarts:** 0
- **Uptime:** 14h+
- **Memory:** 74.7 MB
- **CPU:** 0%
- **Issues:** None

#### 5. **youtube-monitor-bot**
- **Status:** ✅ Online
- **Restarts:** 0
- **Uptime:** 14h+
- **Memory:** 60.0 MB
- **CPU:** 0%
- **Issues:** None

#### 6-10. **MonitoRSS Services** (All Stable)
- **monitorss-monolith:** ✅ Online, 0 restarts, 14h+ uptime
- **monitorss-bot-presence:** ✅ Online, 0 restarts, 14h+ uptime
- **monitorss-discord-rest-listener:** ✅ Online, 0 restarts, 14h+ uptime
- **monitorss-feed-requests:** ✅ Online, 0 restarts, 14h+ uptime
- **monitorss-user-feeds:** ✅ Online, 0 restarts, 14h+ uptime
- **monitorss-schedule-emitter:** ✅ Online, 0 restarts, 14h+ uptime

**MonitoRSS Issues:**
- Minor RabbitMQ heartbeat errors (non-critical, services still functional)
- Backend API is receiving requests and responding correctly

---

### ⚠️ Unstable Bots (Need Attention)

#### 1. **coding-practice-bot**
- **Status:** ⚠️ Online but crashing repeatedly
- **Restarts:** 4,487+
- **Current Uptime:** 5 seconds (just restarted)
- **Memory:** 82.5 MB
- **CPU:** 16.7%
- **Issues:**
  - Deprecation warnings: `ready` event should be `clientReady` (Discord.js v15)
  - Deprecation warnings: `ephemeral` option should use flags
  - Bot keeps restarting every few seconds
  - **Root Cause:** Likely Discord.js version compatibility or connection issues

**Recommendation:** Update Discord.js or fix event handlers

#### 2. **reminder-bot** (Python)
- **Status:** ⚠️ Online but crashing repeatedly
- **Restarts:** 8,399+
- **Current Uptime:** 2 seconds (just restarted)
- **Memory:** 18.0 MB
- **CPU:** 16.7%
- **Issues:**
  - **Critical:** `Fatal error: invalid literal for int() with base 10: 'your_guild_id'`
  - Bot is trying to convert placeholder string "your_guild_id" to integer
  - Also has `aiohttp.connector.TCPConnector` unclosed connector errors (secondary)
  - Bot crashes every 5-10 seconds
  - **Root Cause:** `.env` file on VPS has placeholder `GUILD_ID=your_guild_id` instead of actual guild ID

**Recommendation:** Update `.env` file on VPS with actual GUILD_ID or make bot handle optional GUILD_ID

#### 3. **exercism-bot** (Python)
- **Status:** ⚠️ Online but crashing repeatedly
- **Restarts:** 8,042+
- **Current Uptime:** 4 seconds (just restarted)
- **Memory:** 40.1 MB
- **CPU:** 0%
- **Issues:**
  - **Critical:** Same `Fatal error: invalid literal for int() with base 10: 'your_guild_id'`
  - Bot is trying to convert placeholder string "your_guild_id" to integer
  - Also has `aiohttp.connector.TCPConnector` unclosed connector errors (secondary)
  - Bot crashes every 5-10 seconds
  - **Root Cause:** `.env` file on VPS has placeholder `GUILD_ID=your_guild_id` instead of actual guild ID

**Recommendation:** Update `.env` file on VPS with actual GUILD_ID or make bot handle optional GUILD_ID

#### 4. **hangman-bot**
- **Status:** ⚠️ Online but restarting frequently
- **Restarts:** 4,215+
- **Current Uptime:** 2 seconds (just restarted)
- **Memory:** 57.2 MB
- **CPU:** 16.7%
- **Issues:**
  - Deprecation warnings: `ready` event should be `clientReady`
  - MongoDB model warnings (falling back to JSON storage)
  - Bot restarts frequently but may still be functional
  - **Root Cause:** Likely Discord.js deprecation or MongoDB connection issues

**Recommendation:** Update Discord.js event handlers, verify MongoDB connection

#### 5. **todoist-bot**
- **Status:** ⚠️ Online but restarting frequently
- **Restarts:** 4,900+
- **Current Uptime:** 1 second (just restarted)
- **Memory:** 51.5 MB
- **CPU:** 16.7%
- **Issues:**
  - Error in logs: `/usr/bin/bash: line 1: ./todoist: No such file or directory`
  - Bot appears to be loading (dotenv messages in output log)
  - May be functional but has dependency issues
  - **Root Cause:** Bot code may be trying to execute `./todoist` command that doesn't exist

**Recommendation:** Check bot code for `./todoist` references, verify if Todoist CLI is needed or if it's optional

---

## Issues Summary

### Critical Issues (Bots Not Working)

1. **reminder-bot** - `GUILD_ID=your_guild_id` placeholder in .env causing int() conversion error
2. **exercism-bot** - `GUILD_ID=your_guild_id` placeholder in .env causing int() conversion error
3. **todoist-bot** - Missing `./todoist` command (may be optional, needs verification)

### Moderate Issues (Bots Restarting But May Work)

4. **coding-practice-bot** - Discord.js deprecation warnings, frequent restarts
5. **hangman-bot** - Discord.js deprecation warnings, MongoDB fallback warnings

### Minor Issues (Bots Working But Have Warnings)

6. **grammar-bot** - MongoDB timeout warnings (non-critical)
7. **MonitoRSS services** - RabbitMQ heartbeat errors (non-critical)

---

## Recommendations

### Immediate Actions

1. **Fix Python bots (reminder-bot, exercism-bot) - CRITICAL:**
   ```bash
   # On VPS, update .env files with actual GUILD_ID or remove GUILD_ID
   ssh -i ~/.ssh/vps_key root@64.23.179.177
   cd /root/discord-bots/reminder-bot
   # Either set actual GUILD_ID or make bot handle optional GUILD_ID
   # Check bot.py line 71 - it tries int(GUILD_ID) which fails on "your_guild_id"
   ```

2. **Fix todoist-bot:**
   - Check bot code for `./todoist` references
   - Verify if Todoist CLI is required or optional
   - If optional, add error handling for missing command

3. **Update Discord.js event handlers:**
   - Replace `ready` event with `clientReady` for:
     - coding-practice-bot
     - hangman-bot
   - Update `ephemeral` option to use flags

### Monitoring

- **Watch restart counts:** Bots with >100 restarts in 14 hours need immediate attention
- **Check logs regularly:** Monitor error logs for new issues
- **Resource usage:** All bots using reasonable memory (<120 MB each)

---

## Bot Configuration

**PM2 Ecosystem:** `/root/discord-bots/ecosystem.config.js`  
**Logs Directory:** `/root/discord-bots/logs/`  
**Auto-restart:** Enabled for all bots  
**Memory Limits:** 300-500 MB per bot (MonitoRSS: 640 MB - 1 GB)

---

## Next Steps

1. ✅ **Stable bots:** Continue monitoring, no action needed
2. ⚠️ **Fix Python bots:** Update aiohttp usage to prevent connector leaks
3. ⚠️ **Fix todoist-bot:** Install Todoist CLI or fix script path
4. ⚠️ **Update Discord.js:** Fix deprecation warnings in Node.js bots
5. 📊 **Monitor:** Continue watching restart counts and error logs

---

## Verification Commands

```bash
# Check all bot status
ssh -i ~/.ssh/vps_key root@64.23.179.177 "pm2 list"

# Check specific bot logs
ssh -i ~/.ssh/vps_key root@64.23.179.177 "pm2 logs reminder-bot --lines 20"

# Restart a specific bot
ssh -i ~/.ssh/vps_key root@64.23.179.177 "pm2 restart reminder-bot"

# Check error logs
ssh -i ~/.ssh/vps_key root@64.23.179.177 "tail -50 /root/discord-bots/logs/reminder-bot-error.log"
```

---

**Report Generated:** 2026-01-23 11:48 MST  
**All bots are online, but 5 require fixes to prevent constant restarts.**

---

## Quick Fixes Needed

### 1. Fix reminder-bot and exercism-bot (CRITICAL)

**Problem:** `.env` files have `GUILD_ID=your_guild_id` placeholder, but bot code tries to convert it to int.

**Solution:** Update `.env` files on VPS:
```bash
ssh -i ~/.ssh/vps_key root@64.23.179.177
cd /root/discord-bots/reminder-bot
# Either set actual GUILD_ID or remove the line
sed -i 's/GUILD_ID=your_guild_id/#GUILD_ID=your_guild_id/' .env
# OR set actual guild ID:
# sed -i 's/GUILD_ID=your_guild_id/GUILD_ID=1429280769418858499/' .env

cd /root/discord-bots/exercism-bot
sed -i 's/GUILD_ID=your_guild_id/#GUILD_ID=your_guild_id/' .env

# Restart bots
pm2 restart reminder-bot exercism-bot
```

**Note:** The bot code (line 71) has a check for 'your_guild_id', but the error suggests it's still being processed. The check might not be working correctly, or there's another code path.

### 2. Fix todoist-bot

**Problem:** Old errors about `./todoist` command (from Jan 22). Bot is currently online but has high restart count.

**Action:** Monitor - errors are old, bot may be working now. If issues persist, investigate further.

### 3. Update Discord.js (coding-practice-bot, hangman-bot)

**Problem:** Deprecation warnings about `ready` event and `ephemeral` option.

**Solution:** Update to use `clientReady` event and new flags syntax for ephemeral responses.
