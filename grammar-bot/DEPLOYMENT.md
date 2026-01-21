# Grammar Bot - Deployment Guide

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- OpenAI API Key ([OpenAI Platform](https://platform.openai.com/api-keys))
- npm or yarn package manager

---

## 🚀 Quick Start Deployment

### 1. Clone and Install

```bash
cd ~/Documents/DEVELOPMENT/discord-bots-node/grammar-bot
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_test_server_id_here  # Optional: for guild-specific commands

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Budget Limits (USD)
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00

# Database
MONGODB_URI=mongodb://localhost:27017/grammar_bot

# Bot Settings
NODE_ENV=production
MIN_MESSAGE_LENGTH=10
AUTO_CHECK_COOLDOWN=30000  # 30 seconds in milliseconds
```

### 3. Discord Bot Setup

#### 3.1 Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Grammar Teacher Bot"
4. Go to "Bot" tab
5. Click "Reset Token" and copy the token to `.env`
6. Enable these Privileged Gateway Intents:
   - ✅ MESSAGE CONTENT INTENT (required for auto-detection)
   - ✅ SERVER MEMBERS INTENT
   - ✅ PRESENCE INTENT

#### 3.2 Set Bot Permissions
Go to "OAuth2" > "URL Generator":
- **Scopes**: `bot`, `applications.commands`
- **Bot Permissions**:
  - Read Messages/View Channels
  - Send Messages
  - Send Messages in Threads
  - Embed Links
  - Attach Files
  - Read Message History
  - Use Slash Commands
  - Add Reactions

Copy the generated URL and invite the bot to your server.

### 4. Deploy Commands

```bash
npm run deploy
```

Expected output:
```
✅ Successfully registered 8 commands:
- /check
- /stats
- /shop
- /buy
- /inventory
- /leaderboard
- /pvp
- /toggle
```

### 5. Start the Bot

```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

Expected output:
```
✅ Connected to MongoDB
✅ Logged in as Grammar Teacher Bot#1234
✅ Budget monitor initialized
✅ Ready! Serving 5 guilds
```

---

## 💰 OpenAI Budget Configuration

### Understanding Costs

**Model**: `gpt-4o-mini` (default)
- Input: $0.150 per 1M tokens (~$0.00015 per 1K tokens)
- Output: $0.600 per 1M tokens (~$0.0006 per 1K tokens)

**Average Grammar Check**:
- Input: ~100-200 tokens (message + prompt)
- Output: ~50-100 tokens (JSON response)
- **Cost**: ~$0.0001 - $0.0005 per check
- **Estimate**: 2,000-10,000 checks per $1

### Budget Limits

Set appropriate limits in `.env`:

```env
# Conservative (small server <50 users)
DAILY_BUDGET_LIMIT=1.00
MONTHLY_BUDGET_LIMIT=25.00

# Moderate (medium server 50-200 users)
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00

# Generous (large server 200+ users)
DAILY_BUDGET_LIMIT=10.00
MONTHLY_BUDGET_LIMIT=250.00
```

### Budget Monitoring

The bot automatically:
1. ✅ Tracks every OpenAI API call
2. ✅ Calculates cost based on token usage
3. ✅ Shows remaining budget in `/check` footer
4. ✅ Disables auto-checking when limit reached
5. ✅ Resets daily budget at midnight UTC
6. ✅ Sends warning at 80% budget usage

**Check Current Budget**:
```bash
# In MongoDB
mongo grammar_bot
db.budgettrackings.find().pretty()
```

---

## 🗄️ Database Setup

### Local MongoDB

```bash
# Install MongoDB (macOS)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongo
> show dbs
> exit
```

### MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Update `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/grammar_bot?retryWrites=true&w=majority
```

---

## 📊 Migration from Python Bot

If you have existing Python bot data:

```bash
# Default path (auto-detected)
node scripts/migrate-from-python.js

# Custom path
node scripts/migrate-from-python.js /path/to/gamification.json
```

Expected output:
```
🔄 Starting Grammar Bot Migration from Python to Node.js
📂 Reading from: ~/Documents/.../gamification.json
📊 Found 42 users to migrate

✅ Migrated user John#1234 (1/42)
✅ Migrated user Jane#5678 (2/42)
...

📊 Migration Summary:
  Total users: 42
  ✅ Migrated: 40
  ⏭️  Skipped: 2 (already exist)
  ❌ Errors: 0

✨ Migration complete!
```

**Data Migrated**:
- Points, XP, Level, HP
- Streaks (current and best)
- Message statistics
- Error tracking by type
- Shop items purchased
- Achievements unlocked
- PvP win/loss records
- Auto-check preferences

---

## 🔧 Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name grammar-bot

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup

# Monitor bot
pm2 logs grammar-bot
pm2 status
```

### Using launchd (macOS)

Create `~/Library/LaunchAgents/com.grammarbot.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.grammarbot</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/grammar-bot/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/grammar-bot</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/grammar-bot/logs/bot.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/Documents/DEVELOPMENT/discord-bots-node/grammar-bot/logs/error.log</string>
</dict>
</plist>
```

Load the service:
```bash
mkdir -p logs
launchctl load ~/Library/LaunchAgents/com.grammarbot.plist
launchctl start com.grammarbot
```

### Using Docker

```bash
# Build image
docker build -t grammar-bot .

# Run container
docker run -d \
  --name grammar-bot \
  --env-file .env \
  --restart unless-stopped \
  grammar-bot
```

---

## 📈 Monitoring & Maintenance

### Health Checks

```bash
# Check if bot is running
pm2 status grammar-bot

# View logs
pm2 logs grammar-bot --lines 50

# Monitor resources
pm2 monit
```

### Database Maintenance

```bash
# Backup database
mongodump --db grammar_bot --out ~/backups/grammar-bot-$(date +%Y%m%d)

# Check database size
mongo grammar_bot --eval "db.stats()"

# Clean up old data (optional)
mongo grammar_bot --eval "db.users.deleteMany({ updatedAt: { \$lt: new Date(Date.now() - 90*24*60*60*1000) } })"
```

### Budget Monitoring

```bash
# Check today's spending
mongo grammar_bot --eval "db.budgettrackings.findOne({ date: new Date().toISOString().split('T')[0] })"

# Monthly spending report
node scripts/budget-report.js
```

---

## 🔐 Security Best Practices

1. ✅ **Never commit `.env` file** - Add to `.gitignore`
2. ✅ **Rotate tokens regularly** - Update Discord bot token every 90 days
3. ✅ **Limit OpenAI key permissions** - Use restricted API keys
4. ✅ **Monitor API usage** - Set up billing alerts on OpenAI dashboard
5. ✅ **Use environment variables** - Never hardcode credentials
6. ✅ **Regular backups** - Backup MongoDB weekly
7. ✅ **Update dependencies** - Run `npm audit fix` monthly

---

## 🚨 Troubleshooting

### Bot Won't Start

```bash
# Check logs
pm2 logs grammar-bot

# Common issues:
# 1. Invalid Discord token
#    → Regenerate token in Discord Developer Portal
# 2. MongoDB not running
#    → brew services start mongodb-community
# 3. Missing dependencies
#    → npm install
```

### Commands Not Showing

```bash
# Re-deploy commands
npm run deploy

# Clear Discord cache
# (Ctrl+Shift+R in Discord app)

# Wait 5-10 minutes for global commands to propagate
```

### Budget Not Resetting

```bash
# Check timezone configuration
# Budget resets at UTC midnight
# Convert to your timezone:
# PST = UTC-8, EST = UTC-5

# Manual reset (if needed)
mongo grammar_bot
db.budgettrackings.updateOne(
  { date: new Date().toISOString().split('T')[0] },
  { $set: { totalCost: 0 } }
)
```

### High OpenAI Costs

```bash
# Increase cooldown (reduce checks)
AUTO_CHECK_COOLDOWN=60000  # 1 minute

# Increase minimum message length
MIN_MESSAGE_LENGTH=20  # Only check 20+ char messages

# Reduce daily budget
DAILY_BUDGET_LIMIT=2.00

# Consider switching to manual-only mode
# (Users must use /check explicitly)
```

---

## 📞 Support

**Issues**: [GitHub Issues](https://github.com/yourusername/discord-bots-node/issues)
**Documentation**: See `TESTING.md` and `BUDGET_GUIDE.md`
**Budget Help**: See `BUDGET_GUIDE.md` for cost optimization

---

## ✅ Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB running locally or Atlas configured
- [ ] `.env` file created with all required variables
- [ ] Discord bot created with proper intents
- [ ] Bot invited to server with correct permissions
- [ ] Commands deployed (`npm run deploy`)
- [ ] Bot started and connected
- [ ] OpenAI API key valid and funded
- [ ] Budget limits configured appropriately
- [ ] Migration from Python completed (if applicable)
- [ ] PM2 or launchd configured for auto-restart
- [ ] Logs directory created
- [ ] Backup strategy in place
- [ ] Monitoring dashboard set up

---

**Status**: Ready for production deployment
**Estimated Setup Time**: 15-30 minutes
**Required Budget**: $1-10/month (depending on server size)
