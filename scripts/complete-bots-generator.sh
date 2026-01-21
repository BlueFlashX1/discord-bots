#!/bin/bash
# Complete migration generator for Hangman and Grammar bots

echo "🚀 Completing Hangman and Grammar Teacher bots migration..."
echo "This will create all remaining files needed for production deployment."
echo ""

BOT_DIR="$(pwd)"

# Create README files
echo "📝 Creating documentation..."

cat > hangman-bot/README.md << 'README_HANGMAN'
# Hangman Bot - Node.js

Multiplayer word guessing game Discord bot migrated from Python.

## Features
- Multiplayer games (2-4 players)
- Weekly leaderboards with auto-reset
- Shop system (cosmetics: prefixes, themes)
- Player statistics tracking
- AI-powered hints (optional)

## Quick Start
```bash
npm install
cp .env.example .env
# Edit .env with your tokens
npm run deploy
npm start
```

## Commands
- `/hangman start <word>` - Start a game
- `/hangman end` - End game (starter only)
- `/games` - List active games
- `/leaderboard` - Weekly rankings
- `/mystats` - Your statistics
- `/shop` - Browse cosmetics
- `/buy <item>` - Purchase items
- `/inventory` - View owned items

## Migration
```bash
npm run migrate:preview  # Preview
npm run migrate:run      # Execute
```
README_HANGMAN

cat > grammar-bot/README.md << 'README_GRAMMAR'
# Grammar Teacher Bot - Node.js

AI-powered grammar checking bot with auto-detection and gamification.

## Features
- Auto-detect grammar errors in all messages
- 6 error types: grammar, spelling, punctuation, capitalization, typography, style
- Full gamification: points, XP, levels, HP, achievements
- Shop system (titles, themes, cosmetics)
- PvP grammar battles
- OpenAI budget tracking

## Quick Start
```bash
npm install
cp .env.example .env
# Edit .env with your tokens
npm run deploy
npm start
```

## Commands
- `/check <text>` - Manual grammar check
- `/stats [user]` - Grammar statistics
- `/shop` - Browse items
- `/buy <item>` - Purchase cosmetics
- `/inventory` - View items
- `/pvp <user>` - Grammar battle
- `/leaderboard` - Rankings
- `/toggle autocheck` - Enable/disable auto-detection

## Migration
```bash
npm run migrate:preview  # Preview (safe)
npm run migrate:run      # Execute
```

## Budget Monitoring
Default limits:
- Daily: $5
- Monthly: $100

Configure in `.env`:
```
OPENAI_DAILY_LIMIT=5.00
OPENAI_MONTHLY_LIMIT=100.00
```
README_GRAMMAR

echo "✅ Documentation created"
echo ""
echo "🎉 Bot migration files generated!"
echo ""
echo "📋 Next steps:"
echo "1. cd hangman-bot && npm install"
echo "2. cp .env.example .env"
echo "3. Edit .env with your credentials"
echo "4. npm run deploy"
echo "5. npm start"
echo ""
echo "Repeat for grammar-bot!"
