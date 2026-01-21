# Grammar Teacher Bot 📝

> AI-powered Discord bot that helps users improve their grammar through automatic detection, gamification, and friendly competition.

**Status**: ✅ **100% COMPLETE - PRODUCTION READY**

---

## ✨ Features

### 🤖 Automatic Grammar Detection
- Real-time grammar checking using OpenAI GPT-4o-mini
- Intelligent cooldown system (30s per user)
- Minimum message length filtering (10+ characters)
- Toggle auto-check on/off per user

### 🎮 Gamification System
- **Points & XP**: Earn rewards for clean messages
- **Leveling**: Progress through levels with increasing XP requirements
- **HP System**: Take damage for errors, restore on level-up
- **Streaks**: Daily streak tracking with best streak records

### 🏪 Shop System
7 purchasable items:
- 👑 **Grammar Guru** (500 pts) - Title badge
- 🎓 **Professor Title** (1000 pts) - Advanced title
- 🎨 **Custom Theme** (750 pts) - Personalized colors
- 🏅 **Gold Badge** (1500 pts) - Prestige cosmetic
- 💎 **Platinum Badge** (2000 pts) - Ultimate cosmetic
- ⚡ **XP Boost** (300 pts) - 2x XP for 24 hours
- 🛡️ **HP Shield** (400 pts) - Prevent HP loss for 1 hour

### 🏆 Achievements System
12 unlockable achievements:
- First Steps, Clean Streak, Grammar Knight
- Perfectionist, Streak Master, Level 10 Hero
- And more...

### ⚔️ PvP Grammar Battles
- Challenge other users to grammar duels
- Submit text, compare grammar quality
- Win/loss records tracked
- Earn points and bragging rights

### 📊 Statistics & Leaderboards
- Personal accuracy tracking
- Error type analysis
- Multiple leaderboard types (level, accuracy, streak, PvP)
- Improvement trend analysis

### 💰 Budget Management
- Daily and monthly OpenAI spending limits
- Real-time cost tracking
- Auto-disable when budget reached
- Average cost: ~$0.00004 per check (~25,000 checks per $1)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Discord Bot Token
- OpenAI API Key

### Installation

```bash
# 1. Navigate to bot directory
cd discord-bots-node/grammar-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your tokens and API keys

# 4. Deploy slash commands
npm run deploy

# 5. Start the bot
npm start
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed setup instructions.

---

## 💻 Commands

| Command | Description |
|---------|-------------|
| `/check <text>` | Manually check grammar of provided text |
| `/stats [user]` | View grammar statistics (self or others) |
| `/shop` | Browse the cosmetics shop |
| `/buy <item>` | Purchase a shop item |
| `/inventory` | View your purchased items and achievements |
| `/leaderboard [type]` | View rankings (level/accuracy/streak/pvp) |
| `/pvp <opponent> <text>` | Challenge user to grammar battle |
| `/toggle` | Enable/disable automatic grammar checking |

---

## 📁 Project Structure

```
grammar-bot/
├── commands/              # Slash commands (8 total)
│   ├── check.js          # Manual grammar checking
│   ├── stats.js          # Statistics display
│   ├── shop.js           # Shop browsing
│   ├── buy.js            # Item purchasing
│   ├── inventory.js      # Inventory display
│   ├── leaderboard.js    # Rankings
│   ├── pvp.js            # Grammar battles
│   └── toggle.js         # Auto-check toggle
├── database/
│   ├── db.js             # MongoDB connection
│   └── models/           # Database models (3 total)
│       ├── User.js       # User gamification data
│       ├── BudgetTracking.js  # OpenAI cost tracking
│       └── DailyStats.js # Daily analytics
├── services/             # Core services (3 total)
│   ├── aiGrammar.js      # OpenAI integration
│   ├── budgetMonitor.js  # Cost monitoring
│   └── analysisEngine.js # Message analysis
├── gamification/         # Gamification systems
│   └── systems.js        # Points, Shop, Achievements, PvP
├── events/               # Discord event handlers
│   ├── ready.js          # Bot startup
│   ├── interactionCreate.js  # Command handling
│   └── messageCreate.js  # Auto-detection
├── scripts/              # Utility scripts
│   └── migrate-from-python.js  # Python migration
├── utils/                # Utilities
│   └── embedBuilder.js   # Embed formatting
├── config.json           # Bot configuration
├── index.js              # Main entry point
├── deploy-commands.js    # Command deployment
├── TESTING.md            # Testing guide (25+ test cases)
├── DEPLOYMENT.md         # Deployment guide
├── BUDGET_GUIDE.md       # Cost management guide
└── README.md             # This file

Total: 22 files, ~5,000 lines of code
```

---

## 💰 Cost Estimates

**Model**: gpt-4o-mini
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- **Average check**: ~$0.00004 (0.004 cents)

**Usage Examples**:
- Small server (50 checks/day): ~$0.002/day = **$0.06/month**
- Medium server (500 checks/day): ~$0.02/day = **$0.60/month**
- Large server (2000 checks/day): ~$0.08/day = **$2.40/month**

See **[BUDGET_GUIDE.md](./BUDGET_GUIDE.md)** for optimization strategies.

---

## 🔄 Migration from Python

If you're migrating from the Python version:

```bash
# Migrate all user data
node scripts/migrate-from-python.js

# Or specify custom path
node scripts/migrate-from-python.js /path/to/gamification.json
```

**Migrates**:
- All user stats (points, XP, level, HP)
- Streaks and message history
- Shop items and achievements
- PvP records
- User preferences

---

## 📚 Documentation

- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide with 25+ test cases
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment & production setup
- **[BUDGET_GUIDE.md](./BUDGET_GUIDE.md)** - Cost management & optimization

---

## 🎉 Example Usage

### Auto-Detection
```
User: "I has a great day today"
Bot: 📝 Grammar Check

❌ Errors Found:
1. Subject-verb agreement
   "I has" → "I have"

📊 Quality: C (1 error)
-5 points | -2 HP
```

### Stats Display
```
📊 John's Grammar Stats

📈 Level: 15          ⭐ Points: 2,450      ❤️ HP: 95/100
🎯 Accuracy: 87% (Grade: B)
🔥 Streak: 12 days (Best: 15)
📊 Messages: 450 total, 392 clean
```

---

## 📄 License

MIT License - Feel free to use and modify for your Discord server!

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: December 2024
