# Spelling Bee Bot - Setup Guide

## Quick Start

### 1. Prerequisites

- Python 3.9 or higher
- Discord Bot Token (from Discord Developer Portal)
- OpenAI API Key (same one used for hangman & grammar bot)

### 2. Environment Setup

```bash
# Clone/navigate to the spelling bee bot directory
cd discord-bots/bots/spelling-bee-bot

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

Set these environment variables:

```bash
# Option 1: Export variables
export DISCORD_BOT_TOKEN="your_bot_token_here"
export OPENAI_API_KEY="your_openai_api_key_here"

# Option 2: Create .env file
echo 'DISCORD_BOT_TOKEN=your_bot_token_here' > .env
echo 'OPENAI_API_KEY=your_openai_api_key_here' >> .env
```

### 4. Running the Bot

```bash
# Run the bot
python spelling_bee_bot.py

# Or with logging output
python -u spelling_bee_bot.py
```

## Project Structure

```
spelling-bee-bot/
├── src/
│   ├── ai/
│   │   └── word_generator.py      # AI word generation with OpenAI
│   ├── core/
│   │   ├── logger.py              # Logging system
│   │   └── views.py               # Discord UI components
│   └── gamification/
│       ├── game.py                # Game logic
│       └── session_analyzer.py    # Error analysis & insights
├── config/
│   └── settings.py                # Configuration constants
├── tests/
│   └── (test files)
├── docs/
│   ├── SETUP.md                   # This file
│   ├── API.md                     # API documentation
│   └── FEATURES.md                # Feature documentation
├── data/
│   └── sessions/                  # Game session records
├── spelling_bee_bot.py            # Main bot entry point
├── requirements.txt               # Python dependencies
└── README.md                      # Project overview
```

## How It Works

### Game Flow

1. **Start Game**: `/spelling` command

   - Bot generates random letters (5-12) weighted by English frequency
   - AI generates list of valid words
   - Creates lobby for players to join

2. **Lobby Phase** (2 min timeout for solo)

   - Players join with join button
   - Players can leave before start
   - Starter clicks "Start Game" to begin timer

3. **Active Game** (10 minutes)

   - 10-minute countdown timer starts
   - All players compete independently (simultaneous gameplay)
   - Players submit words with `/submit word`
   - Points calculated in real-time based on word difficulty
   - Leaderboard updates with each submission
   - All attempts tracked for analysis

4. **Game End**
   - Starter ends with `/spelling_end`
   - Session analysis performed
   - Final leaderboard and stats shown
   - Session saved for learning analytics

### Key Components

#### Word Generator (src/ai/word_generator.py)

- Generates random letters weighted by English frequency
- Uses OpenAI to create valid word lists
- Calculates difficulty levels
- Provides spelling tips and error analysis

#### Game Logic (src/gamification/game.py)

- Manages player participation
- Validates word submissions
- Calculates points based on difficulty
- Tracks all game data

#### Session Analyzer (src/gamification/session_analyzer.py)

- Analyzes game performance
- Identifies error patterns
- Generates player insights
- Provides improvement recommendations

#### Discord Views (src/core/views.py)

- Manages lobby UI (join/start/end/leave buttons)
- Updates game state display
- Handles player interactions
- Solo timeout monitoring

## Difficulty Levels & Scoring

Words are assigned difficulty based on length and commonality:

| Difficulty | Length | Multiplier | Example Points       |
| ---------- | ------ | ---------- | -------------------- |
| Easy       | 3-5    | 1x         | CAT = 3 pts          |
| Medium     | 5-8    | 2x         | STREAM = 12 pts      |
| Hard       | 8-10   | 3x         | BREAKFAST = 27 pts   |
| Expert     | 10+    | 4x         | SPECTACULAR = 44 pts |

## Command Reference

### Game Commands

```
/spelling [letters=7] [words=20]
  Start a new spelling bee game
  letters: 3-10 (default 7)
  words: max possible words (default 20)

/submit <word>
  Submit a word to the current game
  word: the word to check

/stats
  View current game statistics

/spelling_end
  End the game and show final results (starter only)
```

### Game Buttons

In the lobby message:

- ✋ **Join Game** - Add yourself to players
- 🎮 **Start Game** - Begin the game (starter only)
- 🛑 **End Game** - Cancel lobby (starter only)
- 👋 **Leave Game** - Remove yourself (non-starters only)

## Features in Detail

### AI-Powered Word Generation

- Uses GPT-4 to generate valid words from random letters
- Validates all words are dictionary-correct
- Assigns difficulty based on rarity and length
- Caches results to minimize API calls

### Error Tracking & Analysis

- Records all player submissions
- Identifies invalid word attempts
- Analyzes misspelling patterns
- Provides AI-generated error explanations

### Scoring System

- Points = Word Length × Difficulty Multiplier
- Rewards finding rare, longer words
- Encourages vocabulary expansion
- Fair competition between players

### Learning Insights

- AI generates personalized tips
- Identifies common error patterns
- Suggests spelling rules to study
- Tracks improvement over time

## Integration with Existing Bots

This bot shares infrastructure with other discord-bots:

**Shared Resources:**

- OpenAI API Key (same key for all bots)
- Logging system (logs/spelling_bee.log)
- Configuration patterns
- Codebase conventions

**Installation in Main Bot:**

1. Place in `bots/spelling-bee-bot/`
2. Add to bot loader as a cog
3. Use same environment variables
4. Follow same logging patterns

## Troubleshooting

### API Key Issues

- Verify `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
- Check key has proper permissions in OpenAI account
- Ensure no extra spaces/quotes in environment variable

### Discord Connection Issues

- Verify bot token is correct
- Check bot has required intents enabled in Discord Developer Portal
- Ensure bot has permissions in the Discord server

### Word Generation Issues

- Check OpenAI API quota and usage
- Verify API key hasn't expired
- Try with fewer letters initially (3-5)
- Check logs for specific error messages

### Performance Issues

- Reduce max words parameter if slow
- Clear data/sessions/ periodically
- Monitor OpenAI API usage
- Check system resources

## Logging

All activity is logged to `logs/spelling_bee.log`:

```
2024-01-15 10:30:45 - spelling_bee_bot - INFO - [Ch:123456] game_created | User:789
2024-01-15 10:30:50 - spelling_bee_bot - INFO - [Ch:123456] player_joined | User:999
2024-01-15 10:31:05 - spelling_bee_bot - INFO - [Ch:123456] game_started | User:789
2024-01-15 10:31:45 - spelling_bee_bot - INFO - [Ch:123456] word_submitted_valid | User:999
```

## Performance Tips

1. **Word Generation**

   - Start with 7 letters (default)
   - Reduce max words if API is slow
   - Word lists are cached automatically

2. **Game Performance**

   - Supports multiple simultaneous games
   - Minimal memory per game
   - Async API calls don't block

3. **API Optimization**
   - Reuses cached word lists
   - Batches requests when possible
   - Uses gpt-4-turbo for speed

## Next Steps

1. Run the bot: `python spelling_bee_bot.py`
2. Test in Discord: `/spelling`
3. Check logs: `tail -f logs/spelling_bee.log`
4. Report issues or improvements

## Support & Debugging

Enable debug logging:

```python
# In spelling_bee_bot.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check specific logs:

```bash
# See last 50 lines of log
tail -50 logs/spelling_bee.log

# See all errors
grep ERROR logs/spelling_bee.log

# Follow live
tail -f logs/spelling_bee.log
```

---

**For more information, see README.md and other docs/**
