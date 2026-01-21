# Grammar Bot - Auto-Start & Management Guide

## 🚀 Quick Start

The bot is now configured to **automatically start on login** and **restart if it crashes**.

### Installation

```bash
./install_bot.sh
```

### Uninstallation

```bash
./uninstall_bot.sh
```

---

## 🎮 Gamification System

The bot now includes a full RPG-style gamification system!

### How It Works

**Every message you write is tracked:**

- ✅ **Clean message** (no errors): +10 points, +15 XP, +1 streak
- ❌ **Message with errors**: -3 points per error, -5 HP per error, +5 XP, streak breaks

**HP System:**

- Start with 100 HP
- Lose 5 HP per grammar error
- Regenerate 10 HP per hour automatically
- Buy HP potions in the shop if you run low!

**Level System:**

- 10 levels total (Level 0 → Level 10)
- Earn XP by writing messages
- Level up bonuses: Level × 50 points
- Unlock new titles as you level up

**Streak System:**

- Build streaks by writing clean messages
- 5+ streak: 1.5× points multiplier
- Breaks on errors or 24 hours of inactivity

**Achievements:**

- 🎯 First Step: Write your first clean message
- 🔥 On Fire: Reach 5 message streak
- ⚡ Unstoppable: Reach 10 message streak
- ⭐ Rising Star: Reach Level 5
- 🏆 Master: Reach Level 10
- 💯 Perfectionist: Write 100 clean messages

### Shop System

Spend your points on powerful items:

**Consumables:**

- 🧪 HP Potion (50 pts): Restore 25 HP
- ⚗️ Full HP Potion (150 pts): Restore to full HP
- 🛡️ Streak Shield (100 pts): Protect your streak from the next error

**Boosts:**

- ⚡ XP Boost (200 pts): 2× XP for 1 hour

**Cosmetics:**

- 📚 Scholar Title (500 pts): Custom title
- ✍️ Wordsmith Title (750 pts): Custom title
- 🎓 Linguist Title (1000 pts): Custom title

**Upgrades:**

- ❤️ HP Upgrade (300 pts): +20 max HP (permanent)

### Commands

**Profile & Stats:**

- `/profile` - View your HP, points, level, achievements
- `/stats` - View detailed grammar statistics

**Shopping:**

- `/shop` - Browse the shop catalog
- `/buy <item_id>` - Purchase an item (e.g., `/buy hp_potion`)
- `/use <item_id>` - Use a consumable from inventory (e.g., `/use hp_potion`)

**Grammar Checking:**

- `/check <text>` - Manually check text for errors
- `/autocheck on/off` - Enable/disable automatic checking

---

## 🔧 Management Commands

### Service Control

```bash
# Stop the bot
launchctl stop com.grammarbot.launcher

# Start the bot
launchctl start com.grammarbot.launcher

# Restart the bot
launchctl stop com.grammarbot.launcher && launchctl start com.grammarbot.launcher

# Check if running
ps aux | grep "python.*main.py" | grep -v grep
```

### View Logs

```bash
# Follow logs in real-time
tail -f ~/Library/Logs/grammarbot.log

# View error logs
tail -f ~/Library/Logs/grammarbot.error.log

# View last 50 lines
tail -50 ~/Library/Logs/grammarbot.log
```

### Disable/Enable Auto-Start

```bash
# Disable auto-start (bot won't start on login)
launchctl unload ~/Library/LaunchAgents/com.grammarbot.launcher.plist

# Enable auto-start
launchctl load ~/Library/LaunchAgents/com.grammarbot.launcher.plist
```

---

## 📁 File Structure

```
grammar-teacher-bot/
├── main.py                          # Entry point
├── install_bot.sh                   # Installation script
├── uninstall_bot.sh                 # Uninstall script
├── com.grammarbot.launcher.plist    # LaunchAgent configuration
│
├── src/
│   ├── core/
│   │   ├── bot_auto_detect.py      # Main bot logic
│   │   ├── config.py               # Configuration
│   │   ├── analysis.py             # Grammar analysis
│   │   └── filters.py              # Error filtering
│   │
│   ├── ai/
│   │   ├── ai_grammar.py           # AI grammar checking
│   │   ├── ai_stats.py             # AI statistics analysis
│   │   └── budget_monitor.py       # API budget tracking
│   │
│   ├── gamification/
│   │   ├── points.py               # Points, HP, XP, levels
│   │   └── shop.py                 # Shop system
│   │
│   └── utils/
│       └── utils.py                # Utility functions
│
└── data/
    ├── user_stats.json             # User statistics
    ├── budget_tracking.json        # API budget data
    └── gamification.json           # Game data (HP, points, inventory)
```

---

## 🐛 Troubleshooting

### Bot Not Starting

```bash
# Check error logs
cat ~/Library/Logs/grammarbot.error.log

# Verify Python path
which python

# Test bot manually
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
/opt/homebrew/Caskroom/miniforge/base/bin/python main.py
```

### Bot Not Detecting Errors

- Check if auto-detection is enabled: `/autocheck on`
- Verify OpenAI API key is set in `.env` file
- Check budget hasn't been exceeded: `/budget`

### Gamification Not Working

- Check if `data/gamification.json` exists
- Verify file permissions: `ls -la data/`
- Check logs for errors: `tail -50 ~/Library/Logs/grammarbot.error.log`

### Commands Not Showing

- Commands sync automatically on bot startup
- Wait 1-2 minutes after starting the bot
- Try using the commands in a different Discord server
- Restart Discord client

---

## 📊 API Budget

The bot has a $10 monthly budget for OpenAI API calls:

- Each grammar check costs ~$0.001-0.003
- Budget resets on the 1st of each month
- Bot auto-suspends when budget is exceeded
- Check status with: `/budget`

---

## ✨ Features

### AI-Powered Grammar Checking

- Uses GPT-4o-mini for accurate grammar detection
- Detects grammar, spelling, punctuation, and style issues
- Provides corrected versions and alternatives
- Shows readability scores and tone analysis

### Auto-Detection

- Automatically checks messages as you type
- Only you see the corrections (private)
- Cooldown system to prevent spam
- Can be disabled per-user with `/autocheck off`

### Smart Filtering

- Ignores informal expressions ("gonna", "wanna", etc.)
- Filters out false positives
- Customizable through `config.py`

### Budget Monitoring

- Tracks API spending in real-time
- Prevents overspending
- Shows remaining budget and estimated checks

### Gamification

- Points, HP, XP, and levels
- Achievements and titles
- Shop with items and boosts
- Streaks and bonuses

---

## 🔒 Security

- Bot token stored in `.env` file (not committed to git)
- LaunchAgent runs as user (not root)
- Logs stored in user's Library folder
- No sensitive data in logs

---

## 📝 Notes

- The bot will automatically restart if it crashes
- Logs rotate when they get too large
- Configuration changes require a restart
- Commands are synced globally (may take a few minutes)

---

## 🎯 Next Steps

1. ✅ Bot is installed and running
2. ✅ Auto-start on login enabled
3. ✅ Gamification system active
4. 🎮 Start earning points by writing messages!
5. 🏪 Use `/shop` to see what you can buy
6. 📊 Track your progress with `/profile`
