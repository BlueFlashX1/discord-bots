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
