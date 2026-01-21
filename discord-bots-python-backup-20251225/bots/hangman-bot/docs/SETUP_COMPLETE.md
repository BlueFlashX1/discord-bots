# 🎮 Hangman Bot - Setup Complete!

## Project Summary

A fully-featured Discord multiplayer Hangman game bot with AI-powered hints using OpenAI GPT-4o-mini.

## What's Included

### ✅ Core Features

- **Multiplayer Gameplay**: Turn-based guessing with multiple players
- **AI-Powered Hints**: Automatic definitions, part of speech, hints, and examples
- **6-Mistake Limit**: Classic hangman difficulty
- **ASCII Art Display**: Progressive hangman visualization
- **Case-Insensitive Input**: Accept A, a, or A for flexibility
- **Turn Rotation**: Fair turn-taking system

### ✅ Commands

- `/hangman start <word>` - Start a new game
- `/hangman join` - Join existing game
- `/hangman guess <letter>` - Guess a letter
- `/hangman leave` - Leave the game
- `/games` - View active games

### ✅ Game Logic

- Word display with underscores for unguessed letters
- Guessed letters tracking
- Mistake counter
- Game state management (active/won/lost)
- Automatic word reveal on loss

### ✅ Infrastructure

- Launcher script (`RUN_BOT.sh`)
- macOS plist for auto-startup (`com.hangmanbot.launcher.plist`)
- Error logging to `~/Library/Logs/hangmanbot.*.log`
- .env configuration template
- Comprehensive README and Quick Start guide

## Directory Structure

```
hangman-bot/
├── src/
│   ├── core/
│   │   ├── __init__.py
│   │   └── __main__.py          ← Main bot (slash commands)
│   ├── ai/
│   │   ├── __init__.py
│   │   └── word_hints.py        ← AI hint generation
│   └── gamification/
│       ├── __init__.py
│       └── game.py              ← Game logic & mechanics
├── data/                        ← Game data storage
├── docs/
│   └── QUICKSTART.md           ← 5-minute setup guide
├── .env.example                ← Configuration template
├── requirements.txt            ← Python dependencies
├── README.md                   ← Full documentation
├── RUN_BOT.sh                 ← Launch script
└── com.hangmanbot.launcher.plist  ← macOS auto-start
```

## Quick Setup

### 1️⃣ Get Discord Token

```
https://discord.com/developers/applications
→ New Application → Bot → Copy Token
```

### 2️⃣ Get OpenAI Key

```
https://platform.openai.com/api-keys
→ Create new secret key
```

### 3️⃣ Configure

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
cp .env.example .env
# Edit .env with your tokens
```

### 4️⃣ Run

```bash
bash RUN_BOT.sh
```

### 5️⃣ Auto-Start (Optional)

```bash
cp com.hangmanbot.launcher.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.hangmanbot.launcher.plist
```

## Key Implementation Details

### Game Class (`src/gamification/game.py`)

- `HangmanGame`: Manages single game state
- 6 hangman ASCII art states
- Letter validation and word completion checks
- Turn rotation logic
- Game status tracking

### AI Hints (`src/ai/word_hints.py`)

- GPT-4o-mini model for accurate hints
- Structured JSON responses
- Fallback for when API unavailable
- Fields: definition, part_of_speech, hint, example

### Bot Commands (`src/core/__main__.py`)

- Discord.py app_commands framework
- Slash command interface
- Channel-based game tracking
- Embed-based UI with ASCII art
- Error handling and validation

## Features Explained

### 🤖 AI Integration

- Every word gets AI-generated hints when game starts
- OpenAI GPT-4o-mini provides:
  - Concise definition (max 15 words)
  - Part of speech (Noun, Verb, Adjective, etc.)
  - Helpful clue (max 20 words, doesn't reveal word)
  - Example sentence using the word
- Graceful fallback if API unavailable

### 📊 Game Display

- Hangman ASCII art (7 stages from 0-6 mistakes)
- Current word state with underscores and guessed letters
- List of all previously guessed letters
- Current mistake counter
- Whose turn it is

### 👥 Multiplayer System

- Unlimited players per game
- Turn-based rotation
- Only current player can guess
- All players win/lose together
- One game per channel

## Testing Checklist

When you set up the bot:

- [ ] Bot comes online successfully
- [ ] `/hangman start butterfly` creates game
- [ ] AI shows hints for the word
- [ ] `/hangman join` adds players
- [ ] `/hangman guess e` accepts letters
- [ ] Wrong letter increments mistakes
- [ ] Correct letter reveals positions
- [ ] 6 mistakes triggers game over
- [ ] Word correctly revealed on loss
- [ ] `/games` lists active games

## Troubleshooting

**Bot won't start:**

- Check token in `.env`
- View logs: `tail ~/Library/Logs/hangmanbot.log`

**AI hints not working:**

- Verify `OPENAI_API_KEY` in `.env`
- Check API quota at platform.openai.com

**Commands not visible:**

- Recreate invite with OAuth2 URL Generator
- Include "bot" scope in invitation

**Game logic issues:**

- Check game state is "active" before guessing
- Verify player is in the game
- Ensure it's their turn

## Next Steps

1. ✅ Create Discord application
2. ✅ Add bot to your server
3. ✅ Set up `.env` file
4. ✅ Run the bot
5. 🎮 Start playing!

## Documentation Files

- `README.md` - Full feature documentation
- `docs/QUICKSTART.md` - 5-minute setup guide
- `.env.example` - Configuration template
- `RUN_BOT.sh` - Bot launcher
- `com.hangmanbot.launcher.plist` - macOS auto-start

## Support & Customization

The code is modular and easy to customize:

- **Change word hints**: Edit `src/ai/word_hints.py`
- **Modify game rules**: Edit `src/gamification/game.py`
- **Change UI**: Edit embed formatting in `src/core/__main__.py`
- **Adjust difficulty**: Change `MAX_MISTAKES` in game.py

Enjoy your Hangman bot! 🎉
