# Hangman Bot - Node.js

🎮 Multiplayer word guessing game Discord bot migrated from Python.

## ✨ Features

- **Multiplayer Games** - 2-4 players per game
- **Weekly Leaderboards** - Auto-reset every Monday
- **Shop System** - Cosmetic items (prefixes, themes, badges)
- **Player Statistics** - Track wins, accuracy, points
- **AI-Powered Hints** - Optional OpenAI integration
- **Button Interactions** - Join/start games with buttons
- **Dual Database** - MongoDB or JSON fallback

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord token and client ID

# Deploy slash commands
npm run deploy

# Start bot
npm start
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/hangman start <word>` | Start a new game with a secret word |
| `/hangman guess <letter>` | Guess a letter in the active game |
| `/hangman end` | End the current game (starter only) |
| `/games` | List all active games across channels |
| `/leaderboard [type]` | View weekly, total, or win rate rankings |
| `/mystats [user]` | View your (or another user's) statistics |
| `/shop [category]` | Browse available cosmetic items |
| `/buy <item>` | Purchase a cosmetic item |
| `/inventory [user]` | View purchased items |

## 🎮 How to Play

1. **Start a Game:**
   ```
   /hangman start word:PROGRAMMING
   ```
   (The word is kept secret from other players)

2. **Join the Game:**
   - Other players click the "Join Game" button
   - 2-4 players can join

3. **Begin:**
   - Starter clicks "Start Game" button
   - Game board appears with empty word display

4. **Guess Letters:**
   ```
   /hangman guess letter:E
   ```
   - Correct guesses reveal letters
   - Wrong guesses add body parts to hangman
   - 6 mistakes = game over

5. **Win or Lose:**
   - **Win:** Reveal all letters before 6 mistakes
   - **Lose:** 6 mistakes reached
   - Points awarded based on word length and mistakes

## 🏆 Shop System

Earn points by winning games and purchase cosmetics:

- **Prefixes** (500-1000 pts) - 🔥 Fire, ⭐ Star, 👑 Crown
- **Themes** (1000-1500 pts) - 🌑 Dark, ✨ Gold
- **Weekly Reset** - Points reset every Monday

## 📊 Statistics Tracked

- Weekly points (resets Monday 00:00)
- Total points (all-time)
- Games played / won
- Win rate percentage
- Letter guessing accuracy
- Cosmetic inventory

## 🔄 Migration from Python

If migrating from the Python version:

```bash
# Preview migration (dry run)
npm run migrate:preview

# Execute migration
npm run migrate:run

# Verbose output
npm run migrate:verbose
```

**Migrates:**
- Player statistics
- Weekly/total points
- Games played/won
- Shop inventory
- Weekly reset timestamps

## 📚 Documentation

- [**TESTING.md**](./TESTING.md) - Complete testing guide with 23 test cases
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Production deployment with launchd

## 🛠️ Development

### Project Structure

```
hangman-bot/
├── commands/           # Slash commands
│   ├── hangman.js     # Main game command
│   ├── games.js       # List active games
│   ├── leaderboard.js # Rankings
│   ├── mystats.js     # Player stats
│   ├── shop.js        # Browse items
│   ├── buy.js         # Purchase items
│   └── inventory.js   # View items
├── database/
│   ├── db.js          # Dual database (MongoDB/JSON)
│   └── models/
│       ├── Player.js  # Player stats + weekly reset
│       ├── Game.js    # Active game state
│       └── ShopItem.js # Shop catalog
├── events/
│   ├── ready.js       # Bot startup
│   ├── interactionCreate.js # Command handler
│   └── buttonHandler.js # Button interactions
├── utils/
│   ├── gameManager.js # Game logic
│   ├── shopSystem.js  # Shop operations
│   ├── weeklyReset.js # Monday reset scheduler
│   └── embedBuilder.js # Discord embeds
├── scripts/
│   └── migrate-from-python.js # Data migration
├── config.json        # Game configuration
└── index.js           # Main entry point
```

### Environment Variables

```bash
# Required
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id

# Optional
OPENAI_API_KEY=your_openai_key  # For AI hints
MONGODB_URI=mongodb://localhost:27017/hangman-bot
GUILD_ID=your_test_server_id    # Faster command deployment
NODE_ENV=development             # or production
```

### Scripts

```bash
npm start               # Start bot
npm run deploy          # Deploy commands globally
npm run migrate:preview # Preview Python migration
npm run migrate:run     # Execute migration
npm run migrate:verbose # Migration with detailed output
```

## 🔧 Configuration

Edit [config.json](./config.json):

```json
{
  "game": {
    "minPlayers": 2,
    "maxPlayers": 4,
    "maxMistakes": 6,
    "pointsPerWin": 100,
    "pointsPerLetter": 10
  },
  "shop": {
    "items": [/* cosmetic items */]
  },
  "leaderboard": {
    "resetDay": 1,      // Monday
    "resetHour": 0,     // 00:00
    "topCount": 10
  }
}
```

## 🐛 Troubleshooting

**Bot won't start:**
- Check Discord token is valid
- Verify Node.js v18+ installed
- Check .env file exists and is readable

**Commands not appearing:**
- Run `npm run deploy`
- Wait ~1 hour for global commands to propagate
- Or set GUILD_ID for instant test server deployment

**Database errors:**
- MongoDB not required (auto-fallback to JSON)
- Check MongoDB running: `brew services list | grep mongodb`
- Or use JSON mode (default if no MONGODB_URI)

## 📝 License

Migrated from Python Discord bot to Node.js/Discord.js v14.

---

**Status:** ✅ Production Ready

**Migration:** Python → Node.js complete
**Database:** MongoDB + JSON fallback
**Commands:** 9 slash commands
**Features:** 100% implemented
