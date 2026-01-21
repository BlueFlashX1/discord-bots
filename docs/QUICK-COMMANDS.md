# ⚡ Quick Commands Reference

## Start Bots

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./start-all-bots.sh
```

## Stop Bots

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./stop-all-bots.sh
```

## Check Status (Bash)

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./check-bots-status.sh
```

## Check Status (Python)

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
python3 check_bots_status.py
```

## View Logs

```bash
# Live logs (all bots)
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/*.log

# Live logs (specific bot)
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/hangman-bot.log
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/grammar-bot.log

# Last 50 lines
tail -50 ~/Documents/DEVELOPMENT/discord/bots/logs/*.log
```

## Deploy Commands (First Time)

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/hangman-bot && npm run deploy
cd ../grammar-bot && npm run deploy
```

---

**For full automation guide, see: `BOT-AUTOMATION-GUIDE.md`**
