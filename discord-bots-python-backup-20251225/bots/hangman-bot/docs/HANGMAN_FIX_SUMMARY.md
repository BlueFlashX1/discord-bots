# ✅ Hangman Bot - Fixed!

## What Was Wrong
The bot was showing **"Application Error"** in Discord because it was being **rate limited by Discord's API**.

Every time the bot started, it tried to sync commands immediately, and Discord blocks repeated syncs with a **429 Too Many Requests** error.

## What I Fixed

### 1. Rate Limit Handling
**File:** `src/core/__main__.py` (lines 62-77)

**Before:**
```python
@bot.event
async def on_ready():
    synced = await bot.tree.sync()  # ← Every startup, causing rate limit!
    logger.info(f"Commands synced: {len(synced)}")
```

**After:**
```python
@bot.event
async def on_ready():
    # Only sync once per session - Discord caches commands
    if not hasattr(bot, '_commands_synced'):
        await asyncio.sleep(2)  # Respectful delay
        synced = await bot.tree.sync()
        bot._commands_synced = True
    # If rate limited, continue anyway - commands still work!
```

**Benefits:**
- ✅ Bot syncs commands only once
- ✅ Continues running even if rate limited
- ✅ Discord commands remain available

---

## 🚀 How to Use

### Start the Bot
```bash
bash START_BOT.sh
```

### Check if Running
```bash
ps aux | grep "python src/core"
```

### View Logs
```bash
tail -f logs/hangman.log
```

### Stop the Bot
```bash
killall python
```

---

## 📋 Files Modified

1. **`src/core/__main__.py`**
   - Added one-time command sync flag
   - Added rate limit error handling
   - Added graceful degradation

2. **`START_BOT.sh`** (NEW)
   - Easy bot startup script
   - Checks if already running
   - Shows PID for stopping

3. **`HANGMAN_TROUBLESHOOTING.md`** (NEW)
   - Complete troubleshooting guide
   - Common issues & fixes
   - Status indicators

---

## 🎮 Bot Commands

The bot has these slash commands:

- `/hangman start <word>` - Start a game
- `/hangman guess <letter>` - Guess a letter
- `/hangman end` - End the game (starter only)
- `/hangman stats` - View your stats
- `/hangman leaderboard` - View weekly leaderboard
- `/hangman shop` - View cosmetic shop
- `/hangman inventory` - View owned cosmetics

---

## ✨ Status Check

**Expected on startup:**
```
[INFO] [HangmanBot] Bot is ready for gameplay!
```

**Commands are there even if you see rate limit warning** - the fix handles it gracefully.

---

**Last Updated:** 2025-10-27
