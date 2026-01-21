# Grammar Teacher Bot - Quick Reference

## ✅ Setup Complete

The Discord Grammar Teacher Bot is now configured to:

- ✅ Use **env-active** conda environment (Python 3.11)
- ✅ Auto-start on login via LaunchAgent
- ✅ Restart automatically if it crashes
- ✅ All required packages installed

---

## 🎮 Bot Control Commands

Use the `bot_control.sh` script to manage the bot:

```bash
cd ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Start/Stop
./bot_control.sh start      # Start the bot
./bot_control.sh stop       # Stop the bot
./bot_control.sh restart    # Restart the bot

# Monitor
./bot_control.sh status     # Check if bot is running
./bot_control.sh logs       # View recent logs
./bot_control.sh errors     # View error logs

# Auto-start
./bot_control.sh install    # Enable auto-start on login
./bot_control.sh uninstall  # Disable auto-start

# Manual run (for testing)
./bot_control.sh manual     # Run in foreground (Ctrl+C to stop)
```

---

## 📁 File Locations

**Bot Directory:**

```
~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/
```

**Python Environment:**

```
/opt/homebrew/Caskroom/miniforge/base/envs/env-active/
```

**LaunchAgent Plist:**

```
~/Library/LaunchAgents/com.grammarbot.launcher.plist
```

**Log Files:**

```
~/Library/Logs/grammarbot.log       # Standard output
~/Library/Logs/grammarbot.error.log # Errors and Discord events
```

---

## 🔧 Python Path Configuration

The bot is configured with:

- **Python Interpreter:** `/opt/homebrew/Caskroom/miniforge/base/envs/env-active/bin/python`
- **PYTHONPATH:** Project root (automatically set)
- **Module:** `src.core.bot_auto_detect`

**Key files:**

- `src/core/bot_auto_detect.py` - Main bot file
- `src/gamification/points.py` - RPG/gamification system
- `.env` - API keys (OpenAI, Discord token)

---

## 📦 Installed Packages (env-active)

- `discord.py` - Discord bot framework
- `openai` - AI grammar checking (GPT-4o-mini)
- `textstat` - Readability analysis
- `nltk` - Natural language processing
- `python-dotenv` - Environment variables
- `aiohttp` - Async HTTP
- `pydantic` - Data validation

---

## 🎯 Features Summary

### **Silent Quality Tracking**

- Tracks 5 quality aspects on every message
- Awards bonuses for: no typos, no grammar errors, thoughtful responses, punctuation, word variety
- Balanced system: "yea idk" = acceptable casual speech

### **RPG Gamification**

- Level system (max level 100)
- HP, XP, stats (durability, efficiency, learning, resilience, fortune)
- 8 unlockable attack skills
- PvP combat system
- Daily quests
- Shop with items

### **Slash Commands**

- `/daily` - Daily stats with improvement tips (private)
- `/profile` - Your RPG character (private)
- `/skills` - View unlocked skills (private)
- `/quests` - Daily quests (private)
- `/attack @user <skill>` - PvP combat (public)
- `/shop` - Browse shop (private)
- `/check <text>` - Manual grammar check (private)

---

## 🚀 How to Restart After Changes

If you edit the code:

```bash
./bot_control.sh restart
```

To see if it's working:

```bash
./bot_control.sh status
./bot_control.sh logs
```

---

## 🐛 Troubleshooting

**Bot not starting?**

```bash
# Check error logs
./bot_control.sh errors

# Try manual run to see errors
./bot_control.sh manual
```

**Auto-start not working?**

```bash
# Reinstall LaunchAgent
./bot_control.sh uninstall
./bot_control.sh install
```

**Wrong Python version?**

```bash
# Verify Python path
/opt/homebrew/Caskroom/miniforge/base/envs/env-active/bin/python --version
# Should show: Python 3.11.14
```

**Missing packages?**

```bash
# Reinstall packages
conda run -n env-active pip install discord.py python-dotenv aiohttp openai textstat nltk pydantic
```

---

## 📊 Current Status

Run this to check everything:

```bash
./bot_control.sh status
```

Expected output:

```
✅ LaunchAgent: Running
✅ Bot Process: Active
```

---

**Last Updated:** October 21, 2025
**Environment:** env-active (Python 3.11.14)
**Auto-start:** Enabled ✅
