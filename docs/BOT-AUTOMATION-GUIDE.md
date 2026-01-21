# 🤖 Bot Automation Guide

Automated scripts to start, stop, and verify Discord bots are running.

---

## 📋 Available Scripts

### 1. **start-all-bots.sh** - Start All Bots
Starts both Hangman Bot and Grammar Bot in the background.

### 2. **stop-all-bots.sh** - Stop All Bots
Stops all running Discord bots.

### 3. **check-bots-status.sh** - Check Status (Bash)
Verifies if bots are running (bash version).

### 4. **check_bots_status.py** - Check Status (Python)
Verifies if bots are running (Python version).

---

## 🚀 Quick Start

### Start All Bots

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./start-all-bots.sh
```

**What it does:**
- Starts Hangman Bot in background
- Starts Grammar Bot in background
- Saves PID files to `logs/` directory
- Outputs logs to `logs/*.log` files

**Output:**
```
🤖 Starting Discord Bots...

📦 Starting Hangman Bot...
✅ Hangman Bot started (PID: 12345)

📦 Starting Grammar Bot...
✅ Grammar Bot started (PID: 12346)

✅ All bots started!

📝 Logs:
   Hangman Bot: /path/to/logs/hangman-bot.log
   Grammar Bot: /path/to/logs/grammar-bot.log
```

---

### Check Bot Status

**Using Bash:**
```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./check-bots-status.sh
```

**Using Python:**
```bash
cd ~/Documents/DEVELOPMENT/discord/bots
python3 check_bots_status.py
# or
./check_bots_status.py
```

**Output:**
```
🔍 Discord Bots Status Check
============================

🤖 Hangman Bot
   ✅ RUNNING (PID: 12345)
   Started: Mon Jan 16 14:52:00 2024
   Last log: ✅ Logged in as HangmanBot#1234

🤖 Grammar Bot
   ✅ RUNNING (PID: 12346)
   Started: Mon Jan 16 14:52:05 2024
   Last log: ✅ Logged in as GrammarBot#5678

============================

🟢 ALL BOTS RUNNING ✅
```

---

### Stop All Bots

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./stop-all-bots.sh
```

**Output:**
```
🛑 Stopping Discord Bots...

✅ Hangman Bot stopped (PID: 12345)
✅ Grammar Bot stopped (PID: 12346)

✅ All bots stopped!
```

---

## 📊 View Logs

### View Live Logs (Follow Mode)

**Hangman Bot:**
```bash
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/hangman-bot.log
```

**Grammar Bot:**
```bash
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/grammar-bot.log
```

**Both at once:**
```bash
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/*.log
```

### View Last 50 Lines

```bash
tail -50 ~/Documents/DEVELOPMENT/discord/bots/logs/hangman-bot.log
tail -50 ~/Documents/DEVELOPMENT/discord/bots/logs/grammar-bot.log
```

### Search Logs

```bash
# Find errors
grep -i error ~/Documents/DEVELOPMENT/discord/bots/logs/*.log

# Find successful login
grep "Logged in" ~/Documents/DEVELOPMENT/discord/bots/logs/*.log

# Find specific command
grep "/ping" ~/Documents/DEVELOPMENT/discord/bots/logs/*.log
```

---

## 🔧 Advanced Usage

### Using PM2 (Process Manager)

If you want more advanced process management, you can use PM2:

**Install PM2:**
```bash
npm install -g pm2
```

**Start with PM2:**
```bash
cd ~/Documents/DEVELOPMENT/discord/bots/hangman-bot
pm2 start index.js --name hangman-bot

cd ../grammar-bot
pm2 start index.js --name grammar-bot
```

**Check status:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs hangman-bot
pm2 logs grammar-bot
pm2 logs  # All bots
```

**Stop:**
```bash
pm2 stop all
pm2 stop hangman-bot
pm2 stop grammar-bot
```

**Restart:**
```bash
pm2 restart all
```

**Save PM2 config:**
```bash
pm2 save
pm2 startup  # Auto-start on system boot
```

---

## 🐍 Python Verification

The Python script (`check_bots_status.py`) can be used in Python programs or automated scripts:

```python
#!/usr/bin/env python3
import subprocess
import json

# Run status check
result = subprocess.run(
    ['./check_bots_status.py'],
    capture_output=True,
    text=True,
    cwd='/path/to/discord/bots'
)

print(result.stdout)
```

Or use it in automation:
```bash
# Cron job to check every 5 minutes
*/5 * * * * cd /path/to/discord/bots && python3 check_bots_status.py >> /tmp/bot-status.log 2>&1
```

---

## 📋 File Locations

```
discord/bots/
├── start-all-bots.sh        # Start script
├── stop-all-bots.sh         # Stop script
├── check-bots-status.sh     # Status check (bash)
├── check_bots_status.py     # Status check (Python)
├── logs/                    # Log directory
│   ├── hangman-bot.log      # Hangman Bot logs
│   ├── hangman-bot.pid      # Hangman Bot PID
│   ├── grammar-bot.log      # Grammar Bot logs
│   └── grammar-bot.pid      # Grammar Bot PID
├── hangman-bot/            # Hangman Bot directory
└── grammar-bot/            # Grammar Bot directory
```

---

## ⚠️ Troubleshooting

### Bots Not Starting

**Check .env files:**
```bash
# Verify credentials are set
grep "DISCORD_TOKEN=" hangman-bot/.env
grep "DISCORD_TOKEN=" grammar-bot/.env
```

**Check dependencies:**
```bash
cd hangman-bot && npm list discord.js
cd ../grammar-bot && npm list discord.js
```

**Check logs:**
```bash
cat logs/hangman-bot.log
cat logs/grammar-bot.log
```

### Bots Won't Stop

**Kill manually:**
```bash
# Find processes
ps aux | grep "index.js" | grep -E "hangman|grammar"

# Kill by PID
kill <PID>

# Force kill if needed
kill -9 <PID>
```

### Logs Not Appearing

**Check permissions:**
```bash
ls -la logs/
chmod 755 logs/
```

**Check disk space:**
```bash
df -h
```

---

## 🔄 Auto-Start on System Boot

### Using launchd (macOS)

Create a launch agent to start bots on system boot:

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.discord.bots.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.discord.bots</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/start-all-bots.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots</string>
</dict>
</plist>
EOF

# Load the agent
launchctl load ~/Library/LaunchAgents/com.discord.bots.plist
```

---

## 📚 Quick Reference

| Command | Purpose |
|---------|---------|
| `./start-all-bots.sh` | Start all bots |
| `./stop-all-bots.sh` | Stop all bots |
| `./check-bots-status.sh` | Check status (bash) |
| `python3 check_bots_status.py` | Check status (Python) |
| `tail -f logs/*.log` | View live logs |
| `pm2 status` | Check PM2 status (if using PM2) |

---

**Ready to automate! 🚀**
