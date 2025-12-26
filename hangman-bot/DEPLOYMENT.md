# Hangman Bot - Deployment Guide

Production deployment guide for macOS using launchd.

---

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ Discord bot token
- ✅ Discord client ID
- ✅ (Optional) MongoDB installed
- ✅ (Optional) OpenAI API key for hints

---

## Step 1: Final Testing

Before deploying, run full test suite:

```bash
cd ~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot

# Run tests
npm test  # If you created tests

# Manual testing checklist
npm start
# Test all commands in Discord
```

See [TESTING.md](./TESTING.md) for complete test cases.

---

## Step 2: Environment Configuration

### Production .env File

```bash
# Copy example
cp .env.example .env

# Edit with production values
nano .env
```

**Production .env:**
```bash
# Discord Configuration
DISCORD_TOKEN=your_production_bot_token_here
CLIENT_ID=your_client_id_here

# OpenAI (Optional - for AI hints)
OPENAI_API_KEY=your_openai_key_here

# Database (Optional - will use JSON if not set)
MONGODB_URI=mongodb://localhost:27017/hangman-bot-prod

# Environment
NODE_ENV=production

# Guild ID for faster command deployment (optional)
# GUILD_ID=your_test_server_id
```

**Security:**
```bash
# Restrict permissions
chmod 600 .env

# Never commit .env
git status  # Should not show .env
```

---

## Step 3: Deploy Slash Commands

Deploy commands to Discord's global registry:

```bash
# Deploy commands globally (takes ~1 hour to propagate)
npm run deploy

# For faster testing, set GUILD_ID in .env and deploy to test server
```

**Verify deployment:**
1. Go to Discord
2. Type `/` in any server with the bot
3. Should see all Hangman commands

---

## Step 4: Data Migration (If Migrating from Python)

```bash
# Preview migration (safe, no changes)
npm run migrate:preview

# Review output, then migrate
npm run migrate:run

# Verify migration
node -e "
const { connectDatabase, getDatabase } = require('./database/db');
connectDatabase().then(() => {
  const { Player } = getDatabase();
  Player.find ? Player.find({}).then(p => console.log(p.length + ' players')) :
    console.log(Object.keys(Player.players).length + ' players');
});
"
```

---

## Step 5: macOS launchd Setup

### Create Launch Agent

```bash
# Create plist file
nano ~/Library/LaunchAgents/com.hangmanbot.node.plist
```

**Paste this configuration:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hangmanbot.node</string>

    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/index.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/hangman-bot</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/hangmanbot-node.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/hangmanbot-node-error.log</string>

    <key>ThrottleInterval</key>
    <integer>60</integer>
</dict>
</plist>
```

**⚠️ IMPORTANT:** Replace `YOUR_USERNAME` with your actual macOS username!

**Find your username:**
```bash
whoami
```

**Find Node.js path:**
```bash
which node
# Common paths:
# /opt/homebrew/bin/node (Apple Silicon)
# /usr/local/bin/node (Intel)
```

---

## Step 6: Load and Start Service

### Load the Launch Agent

```bash
# Load the agent
launchctl load ~/Library/LaunchAgents/com.hangmanbot.node.plist

# Start immediately
launchctl start com.hangmanbot.node

# Check if running
launchctl list | grep hangmanbot
```

**Expected output:**
```
-	0	com.hangmanbot.node
```
(The `0` means it's running successfully)

---

## Step 7: Verify Deployment

### Check Logs

```bash
# View startup logs
tail -f ~/Library/Logs/hangmanbot-node.log

# Check for errors
tail -f ~/Library/Logs/hangmanbot-node-error.log
```

**Expected log output:**
```
✅ Database: MongoDB (or JSON files)
✅ Shop initialized with 5 items
📅 Weekly reset scheduler started
🤖 Logged in as HangmanBot#1234
```

### Test Bot

1. Go to Discord
2. Run `/hangman start word:test`
3. Check bot responds correctly

---

## Step 8: Monitoring

### Check Bot Status

```bash
# Check if running
launchctl list | grep hangmanbot

# View recent logs
tail -20 ~/Library/Logs/hangmanbot-node.log

# Watch logs in real-time
tail -f ~/Library/Logs/hangmanbot-node.log
```

### Restart Bot

```bash
# Restart the service
launchctl stop com.hangmanbot.node
launchctl start com.hangmanbot.node

# Or unload and reload
launchctl unload ~/Library/LaunchAgents/com.hangmanbot.node.plist
launchctl load ~/Library/LaunchAgents/com.hangmanbot.node.plist
```

### Stop Bot

```bash
# Stop the service
launchctl stop com.hangmanbot.node

# Unload (won't start on boot)
launchctl unload ~/Library/LaunchAgents/com.hangmanbot.node.plist
```

---

## Step 9: Database Backup

### MongoDB Backup (if using MongoDB)

```bash
# Create backup script
cat > ~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/backups/mongodb
mkdir -p $BACKUP_DIR
mongodump --db hangman-bot-prod --out $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)
echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x scripts/backup-db.sh

# Run backup
./scripts/backup-db.sh
```

### JSON Backup (if using JSON storage)

```bash
# Create backup script
cat > ~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/scripts/backup-json.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/backups/json
mkdir -p $BACKUP_DIR
cp -r data/ $BACKUP_DIR/data-$(date +%Y%m%d-%H%M%S)/
echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x scripts/backup-json.sh

# Run backup
./scripts/backup-json.sh
```

### Automated Backups

```bash
# Add to crontab for daily backups
crontab -e

# Add this line (runs daily at 3 AM):
0 3 * * * ~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot/scripts/backup-db.sh
```

---

## Step 10: Updates and Maintenance

### Update Bot Code

```bash
cd ~/Documents/DEVELOPMENT/discord-bots-node/hangman-bot

# Backup first
./scripts/backup-db.sh  # or backup-json.sh

# Pull updates
git pull

# Update dependencies
npm install

# Restart bot
launchctl restart com.hangmanbot.node

# Watch logs
tail -f ~/Library/Logs/hangmanbot-node.log
```

### Update Commands

If you modify commands:

```bash
# Redeploy slash commands
npm run deploy

# Restart bot
launchctl restart com.hangmanbot.node
```

---

## Troubleshooting

### Bot Won't Start

**Check logs:**
```bash
tail -50 ~/Library/Logs/hangmanbot-node-error.log
```

**Common issues:**

1. **Wrong Node.js path:**
   ```bash
   # Find correct path
   which node
   # Update plist file with correct path
   ```

2. **Wrong username in paths:**
   ```bash
   # Check username
   whoami
   # Update all paths in plist
   ```

3. **Missing .env file:**
   ```bash
   ls -la .env
   # If missing, create it
   cp .env.example .env
   ```

4. **Permission errors:**
   ```bash
   # Check permissions
   ls -l index.js
   # Should be readable
   chmod +r index.js
   ```

### Bot Keeps Restarting

**Check logs for errors:**
```bash
tail -100 ~/Library/Logs/hangmanbot-node-error.log
```

**Common causes:**
- Invalid Discord token
- Database connection issues
- Missing dependencies

### Commands Not Appearing

**Wait ~1 hour for global commands to propagate**

**Or deploy to test server:**
```bash
# Add GUILD_ID to .env
echo "GUILD_ID=your_test_server_id" >> .env

# Redeploy
npm run deploy
```

### Database Issues

**MongoDB not connecting:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community
```

**JSON fallback not working:**
```bash
# Check data directory exists
ls -la data/

# Create if missing
mkdir -p data
```

---

## Production Checklist

- [ ] .env configured with production values
- [ ] .env permissions restricted (chmod 600)
- [ ] Commands deployed globally
- [ ] Data migrated from Python (if applicable)
- [ ] launchd plist created and loaded
- [ ] Bot starts without errors
- [ ] Logs directory created
- [ ] All commands tested in Discord
- [ ] Database backup script created
- [ ] Automated backups scheduled
- [ ] Monitoring in place

---

## Performance Optimization

### For High Traffic

**Enable MongoDB (faster than JSON):**
```bash
# Install MongoDB
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Update .env
MONGODB_URI=mongodb://localhost:27017/hangman-bot-prod
```

**Connection Pooling:**
Already configured in `database/db.js`

**Index Creation:**
```javascript
// Models already have indexes on:
// - Player.userId
// - Game.channelId
// - ShopItem.itemId
```

---

## Security Best Practices

1. **Never commit .env files**
   ```bash
   # Verify
   git status
   cat .gitignore | grep .env
   ```

2. **Restrict file permissions**
   ```bash
   chmod 600 .env
   chmod 700 scripts/
   ```

3. **Regular updates**
   ```bash
   npm audit
   npm update
   ```

4. **Monitor logs**
   ```bash
   # Check for suspicious activity
   grep -i error ~/Library/Logs/hangmanbot-node.log
   ```

---

## Rollback Plan

If deployment fails:

### Quick Rollback

```bash
# Stop new bot
launchctl stop com.hangmanbot.node

# Restore database backup
# (MongoDB)
mongorestore --db hangman-bot-prod backups/mongodb/backup-YYYYMMDD/

# (JSON)
rm -rf data/
cp -r backups/json/data-YYYYMMDD/ data/

# Revert code
git reset --hard previous_commit_hash

# Restart
launchctl start com.hangmanbot.node
```

---

## Success Metrics

**Monitor these metrics:**
- Uptime: > 99.9%
- Response time: < 500ms
- Error rate: < 0.1%
- Memory usage: < 200MB
- Weekly reset success: 100%

**Check metrics:**
```bash
# Memory usage
ps aux | grep node | grep hangman

# Uptime
launchctl list | grep hangman

# Error count
grep -c ERROR ~/Library/Logs/hangmanbot-node-error.log
```

---

**Deployment complete! 🚀**

Your Hangman bot is now running in production with automatic restarts and monitoring.
