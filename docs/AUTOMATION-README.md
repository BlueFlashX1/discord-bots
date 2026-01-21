# 🤖 Bot Automation - Ready to Use!

## ✅ All Scripts Created and Ready

All automation scripts have been created and are ready to use!

---

## 📋 Quick Start Commands

### Start All Bots
```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./start-all-bots.sh
```

### Check Status
**Bash version:**
```bash
./check-bots-status.sh
```

**Python version:**
```bash
python3 check_bots_status.py
```

### Stop All Bots
```bash
./stop-all-bots.sh
```

---

## 🔍 Verify Bots Are Running

After starting the bots, verify they're running:

```bash
# Using bash
./check-bots-status.sh

# Using Python
python3 check_bots_status.py
```

Both scripts will show:
- ✅ If bots are running (with PID and start time)
- ❌ If bots are not running
- Last log line from each bot

---

## 📊 View Logs

**View live logs (follow mode):**
```bash
tail -f logs/hangman-bot.log
tail -f logs/grammar-bot.log

# Or both at once:
tail -f logs/*.log
```

**View last 50 lines:**
```bash
tail -50 logs/*.log
```

**Search logs:**
```bash
grep -i error logs/*.log
grep "Logged in" logs/*.log
```

---

## 📁 Files Created

- ✅ `start-all-bots.sh` - Start both bots in background
- ✅ `stop-all-bots.sh` - Stop all running bots
- ✅ `check-bots-status.sh` - Check status (bash version)
- ✅ `check_bots_status.py` - Check status (Python version)
- ✅ `logs/` - Directory for log files and PID files

---

## 🚀 First Time Setup

Before starting bots for the first time:

1. **Deploy commands:**
   ```bash
   cd hangman-bot && npm run deploy
   cd ../grammar-bot && npm run deploy
   ```

2. **Start bots:**
   ```bash
   ./start-all-bots.sh
   ```

3. **Verify running:**
   ```bash
   ./check-bots-status.sh
   # or
   python3 check_bots_status.py
   ```

4. **Test in Discord:**
   - Go to your Discord server
   - Type `/ping`
   - Both bots should respond!

---

## 📚 Documentation

- **Full Automation Guide:** `BOT-AUTOMATION-GUIDE.md` - Complete guide with all options
- **Quick Commands:** `QUICK-COMMANDS.md` - Quick reference card

---

## ✅ Status: Ready!

All scripts are created, executable, and ready to use!

**Next step:** Run `./start-all-bots.sh` to start your bots! 🚀
