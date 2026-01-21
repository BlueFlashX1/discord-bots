# 🐝 Spelling Bee Bot

An AI-powered Discord spelling game bot that helps users improve their English spelling skills through gamification and detailed error analysis.

## Features

### 🎮 Game Features

- **Random Letter Generation**: AI generates random letters (5-12) weighted by English frequency
- **AI-Powered Word Generation**: Uses OpenAI to generate all valid words from given letters
- **Difficulty-Based Scoring**: Words award points based on difficulty level
  - Easy (3-5 letters): 1x word length
  - Medium (5-8 letters): 2x word length
  - Hard (8-10 letters): 3x word length
  - Expert (10+ letters): 4x word length

### 📊 Game Management

- **Multiplayer Support**: 2-4 players per game
- **Simultaneous Timer-Based Gameplay**: All players play independently for 10 minutes
- **Real-time Leaderboard**: Track points and words found
- **Session Tracking**: Records all attempts and errors
- **Solo Timeout**: Auto-ends lobby if only 1 player remains after 2 minutes

### 🔍 Learning Features

- **Error Analysis**: Tracks common misspellings with AI analysis
- **Spelling Tips**: AI-generated tips for each word
- **Pattern Recognition**: Identifies common spelling mistakes
- **Improvement Insights**: Personalized recommendations based on errors

### 🔗 Integration

- **Shared OpenAI Key**: Uses same API key as hangman and grammar bot
- **Consistent Logging**: Same logging system as other bots
- **Unified Architecture**: Follows hangman bot design patterns

## Commands

### `/spelling [letters] [words]`

Start a new spelling bee game

- `letters`: Number of random letters (default: random 5-12, max: 12)
- `words`: Max number of words to generate (default: 20)

### `/submit <word>`

Submit a word in the current game

- `word`: The word to submit (case-insensitive)

### `/stats`

View current game statistics and leaderboard

### `/spelling_end`

End the current game and show final results (starter only)

## Directory Structure

```
spelling-bee-bot/
├── src/
│   ├── core/
│   │   ├── logger.py           # Logging utilities
│   │   └── views.py            # Discord UI (buttons, embeds)
│   ├── gamification/
│   │   ├── game.py             # Game logic and session management
│   │   └── session_analyzer.py # Session analysis and insights
│   └── ai/
│       └── word_generator.py   # AI-powered word generation
├── config/
│   └── settings.py             # Configuration and constants
├── tests/
│   └── test_*.py               # Unit tests
├── docs/
│   ├── SETUP.md                # Setup instructions
│   └── API.md                  # API documentation
├── data/
│   └── sessions/               # Session history storage
├── spelling_bee_bot.py         # Main bot entry point
└── README.md                   # This file
```

## Setup

### 1. Prerequisites

- Python 3.9+
- Discord bot token
- OpenAI API key

### 2. Installation

```bash
# Navigate to the bot directory
cd discord-bots/bots/spelling-bee-bot

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

Set environment variables:

```bash
export DISCORD_BOT_TOKEN="your_bot_token"
export OPENAI_API_KEY="your_openai_api_key"
```

### 4. Running the Bot

```bash
python spelling_bee_bot.py
```

## Game Flow

1. **Game Creation**

   - Starter creates game with `/spelling` command
   - AI generates random letters (5-12)
   - AI generates list of valid words from those letters

2. **Lobby Phase (2 minutes)**

   - Players join using join button (max 4)
   - Players can leave before game starts
   - Solo timeout after 2 minutes with only starter

3. **Active Game (10 minutes)**

   - Starter clicks "Start Game" button
   - Game timer starts (10 minutes)
   - All players compete independently, submitting words simultaneously
   - Use `/submit <word>` command to add words
   - Points awarded in real-time
   - Check leaderboard anytime with `/stats`

4. **Game End**

   - Game ends automatically when 10-minute timer expires
   - OR starter can manually end with `/spelling_end`
   - Final leaderboard and results displayed
   - Session saved for learning analytics

## Scoring System

### Base Points

```
Points = Word Length × Difficulty Multiplier

Easy (3-5 letters):      1x multiplier
Medium (5-8 letters):    2x multiplier
Hard (8-10 letters):     3x multiplier
Expert (10+ letters):    4x multiplier
```

### Examples

- "CAT" (easy, 3 letters) = 3 × 1 = 3 points
- "STREAM" (medium, 6 letters) = 6 × 2 = 12 points
- "BREAKFAST" (hard, 9 letters) = 9 × 3 = 27 points

## Error Tracking

The bot records:

- Invalid word attempts
- Misspellings (if user has different letters available)
- Word frequency by player
- Error patterns and suggestions

## Session Analysis

After each game, the bot analyzes:

- Common spelling error patterns
- Success rates by difficulty
- Player improvement areas
- Personalized learning recommendations

## AI Integration

### Word Generation

- Uses GPT-4 to generate valid words from random letters
- Validates word difficulty levels
- Ensures all words are dictionary-valid

### Error Analysis

- Analyzes why words were incorrect
- Identifies rule violations
- Suggests memory tricks and mnemonics

### Spelling Tips

- Provides context-specific tips
- Explains English spelling rules
- Shows related word patterns

## Performance Considerations

- **Caching**: Word lists cached to reduce API calls
- **Async**: All API calls are non-blocking
- **Efficient**: Minimal memory footprint per game
- **Scalable**: Supports multiple simultaneous games

## Logging

All actions logged to `logs/spelling_bee.log`:

- Game creation and session events
- Player actions and submissions
- Errors and exceptions
- Performance metrics

## Dependencies

```
discord.py>=2.0.0
openai>=0.27.0
python-dotenv>=0.19.0
```

## Future Features

- [ ] Daily spelling challenges
- [ ] Weekly tournaments
- [ ] User progress tracking
- [ ] Difficulty progression
- [ ] Dictionary browsing
- [ ] Custom letter sets
- [ ] Team-based games
- [ ] Mobile app integration

## Contributing

Guidelines for contributing:

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Maintain logging consistency

## License

Same as main discord-bots repository

## Support

For issues or questions:

1. Check logs in `logs/spelling_bee.log`
2. Review error messages in Discord
3. Test with simpler games first
4. Verify API key is working

---

**Built with ❤️ for English learners everywhere**
