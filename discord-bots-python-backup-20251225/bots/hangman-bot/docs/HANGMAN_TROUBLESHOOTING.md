# 🎮 Hangman Bot - Troubleshooting Guide

## Issue: "Application Error" in Discord

### What This Means:
The application error usually means **Discord can't reach the bot** or the **bot crashed**. This is typically due to:

1. **Bot not running** - Process crashed or wasn't started
2. **Rate limiting** - Discord temporarily blocked sync requests
3. **Token invalid** - Old/expired bot token
4. **Import errors** - Missing dependencies

---

## ✅ Solution: Fixed Rate Limiting Issue

### What Was Wrong:
The bot was syncing commands on **every startup**, which triggered Discord's rate limit (429 error).

### What I Fixed:
- Modified `on_ready()` to sync commands **only once** per session
- Added error handling for rate limit errors (bot continues running even if sync fails)
- Added 2-second delay to be respectful to Discord API

### File Changed:
- `src/core/__main__.py` - Lines 62-77

---

## 🚀 How to Start the Bot

### Option 1: Use the Startup Script (Recommended)
```bash
bash START_BOT.sh
```

### Option 2: Manual Start
```bash
cd ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
python src/core/__main__.py
```

### Option 3: Background Process
```bash
cd ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
nohup python src/core/__main__.py > logs/hangman.log 2>&1 &
```

---

## 🔍 Checking Bot Status

### Is the bot running?
```bash
ps aux | grep "python src/core" | grep -v grep
```

### View live logs:
```bash
tail -f logs/hangman.log
```

### View recent errors:
```bash
tail logs/hangman.error.log
```

---

## ⚠️ Common Issues & Fixes

### Issue: "ModuleNotFoundError: No module named 'src'"
**Solution:** Make sure you're in the right directory:
```bash
cd ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
python src/core/__main__.py
```

### Issue: "BOT_TOKEN_HANGMAN not found"
**Solution:** Check `.env` file exists and has valid token:
```bash
cat .env | grep BOT_TOKEN_HANGMAN
```

### Issue: Bot starts but no commands appear
**Solution:** This is normal! Commands sync happens quietly now. Just use `/hangman` - they're there.

### Issue: "429 Too Many Requests"
**Solution:** The bot hit Discord's rate limit. **This is now handled gracefully** - bot keeps running, just might need to wait a bit before using commands again.

**Old behavior:** Bot would crash  
**New behavior:** Bot logs warning but keeps running ✅

---

## 📊 Bot Status Indicators

### ✅ Bot is Healthy:
```
[INFO] [HangmanBot] Bot is ready for gameplay!
```

### ⚠️ Bot Had Rate Limit (But Still Works):
```
[WARNING] [HangmanBot] Rate limited by Discord, but bot is still operational
```

### ❌ Bot Crashed:
```
[ERROR] [HangmanBot] ERROR in on_ready: ...
```
(Check logs for details)

---

## 🛑 Stopping the Bot

### From Terminal:
```bash
# Find the process ID
ps aux | grep "python src/core" | grep -v grep

# Kill it
kill <PID>

# Or kill all Python processes
killall python
```

### Using the Startup Script:
The script shows the PID - use that to kill it:
```bash
kill 91600  # Replace with actual PID
```

---

## 📝 Log Files

- `logs/hangman.log` - General bot logs
- `logs/hangman.error.log` - Error logs only
- `logs/api_calls.log` - OpenAI API calls
- `logs/game_actions.log` - Game action logs

View them:
```bash
tail -f logs/hangman.log          # Follow in real-time
tail -50 logs/hangman.log         # Last 50 lines
grep ERROR logs/hangman.error.log # Only errors
```

---

## 🔑 Checklist Before Starting

- ✅ `.env` file exists with `BOT_TOKEN_HANGMAN`
- ✅ In correct directory: `/active/discord-bots/bots/hangman-bot/`
- ✅ Python 3.11+ installed
- ✅ `discord.py` installed: `pip list | grep discord`
- ✅ `python-dotenv` installed: `pip list | grep python-dotenv`

---

## 🆘 Still Having Issues?

### Check Python version:
```bash
python --version  # Should be 3.11+
```

### Check dependencies:
```bash
pip list | grep -E "discord|python-dotenv"
```

### Reinstall if needed:
```bash
pip install --upgrade discord.py python-dotenv
```

### Clear cache and restart:
```bash
rm -rf src/__pycache__
rm -rf src/**/__pycache__
python src/core/__main__.py
```

---

## 📞 Discord Bot Setup Verification

If you keep getting "Application Error" after trying all above:

1. Go to https://discord.com/developers/applications
2. Find "HangmanBot"
3. Check OAuth2 → Bot has these permissions:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Read Messages

4. Invite URL should be like:
   ```
   https://discord.com/api/oauth2/authorize?client_id=143064345319637007&permissions=...&scope=bot
   ```

---

**Last Fixed:** 2025-10-27  
**Fix Applied:** Rate limit handling + one-time command sync
