# Running Your Grammar Bot - Quick Reference

## Environment Setup Complete! ✅

Your conda environment is configured and all packages are installed:

- Python: 3.12.11 (conda)
- discord.py: 2.6.4 ✅
- python-dotenv: 1.0.0 ✅
- language-tool-python: 2.9.4 ✅
- textstat: 0.7.10 ✅
- nltk: 3.9.2 ✅

---

## Run the Bot

### Method 1: Using Launcher Script (Easiest!)

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

./start_bot.sh
```

### Method 2: Using Full Python Path

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

/opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py
```

### Method 3: Activate Conda Base Environment First

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

conda activate base

python bot_auto_detect.py
```

### Method 4: Verify Setup First

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Check if everything is configured correctly
/opt/homebrew/Caskroom/miniforge/base/bin/python verify_setup.py

# Then run bot
./start_bot.sh
```

### Method 3: Create Alias (One-time setup)

Add to your `~/.zshrc`:

```bash
alias run-grammar-bot='cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot && /opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py'
```

Then reload: `source ~/.zshrc`

Then just run: `run-grammar-bot`

---

## Bot Startup Time

**Note:** First startup takes ~10-15 seconds because:

1. `textstat` loads `scipy` (slow)
2. `nltk` loads language models
3. `language-tool-python` downloads LanguageTool JAR file (first time only)

**Subsequent starts:** ~3-5 seconds

---

## Expected Output

```
Starting Grammar Teacher Bot (Auto-Detection Mode)...
Monitoring all messages 24/7
Sending private DM corrections
Users can dismiss messages
Users can opt-out with /autocheck off
Grammar Teacher Bot#1234 is online!
Grammar checking: Enabled
Auto-detection: Active
Synced 3 slash commands
```

---

## Stop the Bot

Press `Ctrl+C` in the terminal

---

## Run in Background (24/7)

### Option 1: Using nohup

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

nohup /opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py > bot.log 2>&1 &
```

**View logs:** `tail -f bot.log`
**Stop bot:** `pkill -f bot_auto_detect.py`

### Option 2: Using screen

```bash
# Start screen session
screen -S grammar_bot

# Navigate and run bot
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
/opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py

# Detach: Press Ctrl+A, then D
# Reattach later: screen -r grammar_bot
```

---

## Troubleshooting

### "zsh: command not found: python"

Use full path: `/opt/homebrew/Caskroom/miniforge/base/bin/python`

### "ModuleNotFoundError: No module named 'discord'"

All packages are installed! Use the full Python path shown above.

### Bot takes long to start

This is normal - scipy and nltk take time to load. Wait ~15 seconds.

### Bot token error

Your token is already in `.env` file:

```
BOT_TOKEN_GRAMMAR=MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE
```

If it doesn't work, get a new token from:
https://discord.com/developers/applications

---

## Quick Commands

```bash
# Go to bot directory
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Run bot (foreground)
/opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py

# Run bot (background with logs)
nohup /opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py > bot.log 2>&1 &

# View logs
tail -f bot.log

# Stop background bot
pkill -f bot_auto_detect.py

# Check if bot is running
ps aux | grep bot_auto_detect
```

---

## Environment Variables

Your `.env` file location:

```
/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/.env
```

Contents:

```
BOT_TOKEN_GRAMMAR=YOUR_TOKEN_HERE
```

---

## File Locations

**Bot script:**

```
/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/bot_auto_detect.py
```

**Python executable:**

```
/opt/homebrew/Caskroom/miniforge/base/bin/python
```

**Data directory (auto-created):**

```
/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/data/
```

---

## Summary

**You're all set!**

✅ Conda environment configured (Python 3.12.11)
✅ All packages installed (discord.py, language-tool-python, etc.)
✅ Bot token configured in .env
✅ Ready to run!

**Just run:**

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot && /opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py
```

**Wait ~15 seconds for first startup, then your bot will be online!**
