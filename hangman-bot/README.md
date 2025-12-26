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
