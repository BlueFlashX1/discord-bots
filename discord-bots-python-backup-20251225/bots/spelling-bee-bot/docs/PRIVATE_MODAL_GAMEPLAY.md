# Private Modal Gameplay - Implementation Guide

## Overview

The Spelling Bee Bot now features **private modal-based gameplay** where each player interacts with the game through:

1. **Individual Discord DMs** - Each player receives their own private interface
2. **Modal Forms** - Click "Submit Word" button to open a modal form
3. **Personal Word Lists** - Only they see their valid words, points, and definitions
4. **Private Attempt Tracking** - Unlimited attempts until timer ends
5. **Final Public Results** - Leaderboard with all participants' scores and words

## System Architecture

### Core Components

#### 1. **PlayerGameEmbed** (`src/core/game_views.py`)

- Manages each player's personal game interface
- Displays:
  - Available letters
  - Valid words found + points awarded
  - Current score
  - Attempt count
  - Timer
- Updates in real-time after each submission

#### 2. **WordSubmitModal** (`src/core/game_views.py`)

- Discord UI Modal for word submission
- Fields:
  - Word input (3-15 characters)
  - Placeholder shows available letters
- Opens when "Submit Word" button clicked
- Ephemeral - only the player sees it

#### 3. **PlayerGameView** (`src/core/game_views.py`)

- Discord UI View with "Submit Word" button
- Attached to each player's personal embed
- Button opens the WordSubmitModal

#### 4. **PlayerSession** (`src/gamification/player_session.py`)

- Tracks individual player data:
  - Valid words with points and definitions
  - Attempt count
  - Session timestamps
  - Total score

#### 5. **GameSessionTracker** (`src/gamification/player_session.py`)

- Tracks all players in a game
- Maintains leaderboard
- Compiles final results

#### 6. **PrivateGameManager** (`src/core/private_game_manager.py`)

- Orchestrates private gameplay
- Sends DMs to each player when game starts
- Handles word submissions:
  - Validates words
  - Gets definitions
  - Updates player embeds
  - Tracks attempts
- Compiles final results with definitions

## Game Flow

### Before Game Starts (Lobby Phase)

```
1. Starter creates game with /spelling
2. AI generates random letters (5-12)
3. Lobby created - players join via buttons
4. After joining, players wait for start
```

### Game Starts

```
1. Starter clicks "Start Game"
2. Game timer begins (10 minutes)
3. For each player:
   - Bot sends DM with private game embed
   - Shows letters available
   - Shows "Submit Word" button
4. All players see their own private interface only
```

### During Active Game (Per Player)

```
Player receives DM with:
┌─────────────────────────────────┐
│ 🐝 Your Spelling Bee Game       │
│ Find words from: AEINRST        │
│ Time Remaining: 537s             │
│                                 │
│ 📝 Letters Available            │
│ AEINRST                          │
│                                 │
│ ✅ Words Found (2)               │
│ ✅ RAIN (+6 pts)                │
│    Water falling from clouds    │
│ ✅ STAR (+6 pts)                │
│    Celestial object in night sky│
│                                 │
│ 🏆 Your Score                   │
│ 12 points                        │
│                                 │
│ 📊 Statistics                   │
│ Total Attempts: 7               │
│                                 │
│ [📝 Submit Word]  ← Click button│
└─────────────────────────────────┘

Player clicks "Submit Word"
↓
Modal opens:
┌─────────────────────────────────┐
│ Submit a Word                   │
│                                 │
│ Enter a word                    │
│ [____Use letters from: AEINRST__│
│                                 │
│        [Cancel]  [Submit]       │
└─────────────────────────────────┘

Player types: STAIN
↓
Bot validates:
  - All letters available? ✓
  - Valid English word? ✓
  - Get definition ✓
  - Calculate points ✓
↓
Response (Ephemeral - only they see):
┌──────────────────────────────────┐
│ ✅ STAIN is valid!              │
│ +5 points awarded               │
│ 📖 Discoloration or mark        │
└──────────────────────────────────┘

Player embed updates:
✅ Words Found (3)
✅ RAIN (+6 pts)
   Water falling from clouds
✅ STAR (+6 pts)
   Celestial object in night sky
✅ STAIN (+5 pts)
   Discoloration or mark

🏆 Your Score: 17 points
📊 Statistics
Total Attempts: 8
```

### Invalid Word Example

```
Player types: TRAIN
↓
Bot validates:
  - All letters available? NO (no T in AEINRST)
↓
Response (Ephemeral):
┌──────────────────────────────────┐
│ ❌ TRAIN is not a valid word.   │
│ Make sure all letters are from:  │
│ AEINRST                          │
│ Keep trying! You have unlimited │
│ attempts.                        │
└──────────────────────────────────┘

Player embed unchanged
📊 Statistics
Total Attempts: 9 (still incremented)
```

### Game Ends (Automatic or Manual)

When 10-minute timer expires or starter ends game:

```
For each player:
- Embed updates showing game over
- Cannot submit more words

Public channel gets final results:
┌────────────────────────────────────┐
│ 🐝 Spelling Bee Final Results       │
│                                    │
│ 🏆 Final Leaderboard:              │
│ 1. Alice: 47 pts (8 words, 12 att) │
│ 2. Bob: 39 pts (7 words, 15 att)   │
│ 3. Charlie: 28 pts (5 words, 11 at)│
│                                    │
│ 📚 All Words Found:                │
│                                    │
│ Alice (47 points)                  │
│ - RAIN (+6): Water from clouds     │
│ - STAIN (+5): Discoloration        │
│ - SIREN (+6): Warning device       │
│ ...                                │
│                                    │
│ Bob (39 points)                    │
│ - TRAIN (+8): Locomotive vehicle   │
│ ...                                │
└────────────────────────────────────┘
```

## Key Features

### Privacy

✅ **Only players see their own interface**
✅ No cheating via reading others' screens
✅ Each player gets personal DM
✅ Modal responses are ephemeral

### Feedback

✅ **Immediate validation** - Know if word is valid instantly
✅ **Definitions provided** - Learn the word's meaning
✅ **Points awarded immediately** - See score update
✅ **Attempt tracking** - See how many tries used

### Unlimited Attempts

✅ Submit as many words as possible
✅ Invalid attempts still count toward attempt total
✅ Encourages exploration and word-finding
✅ No penalty for trying

### Leaderboard

✅ Final public leaderboard for comparison
✅ Shows:

- Player rank
- Total points
- Number of words found
- Total attempts made
  ✅ Full word list with definitions for learning

## Technical Details

### Message Flow

1. **Game Start Trigger**

   ```python
   view.start_game_timer(duration=600)
   ```

2. **Initialize Players**

   ```python
   for player_id in game.participants:
       await private_manager.initialize_player(
           player_id, player_name
       )
   ```

3. **Player Submission**

   ```python
   Modal → on_submit()
   → handle_word_submission()
   → validate_word()
   → get_word_definition()
   → PlayerGameEmbed.add_valid_word()
   → Update embed in DM
   ```

4. **Game End**
   ```python
   Timer expires → _end_game_timer_expired()
   → private_manager.end_game()
   → Compile results
   → Post to channel
   ```

### Data Structures

**PlayerSession**

```python
{
    "player_id": 123456789,
    "player_name": "Alice#1234",
    "valid_words": [
        ("RAIN", 6, "Water falling from clouds"),
        ("STAIN", 5, "Discoloration or mark"),
    ],
    "attempt_count": 7,
    "total_score": 11,
    "word_count": 2,
}
```

**GameSessionTracker**

```python
{
    "game_id": "spelling-abc123",
    "players": {
        123456789: PlayerSession(...),
        987654321: PlayerSession(...),
    },
    "leaderboard": [
        (123456789, "Alice", 47, 8, 12),  # (id, name, score, words, attempts)
        (987654321, "Bob", 39, 7, 15),
    ],
}
```

## Error Handling

### Word Validation Errors

- **Missing letters** - Show which letters aren't available
- **Invalid word** - Suggest checking dictionary
- **AI validation fails** - Default to false with error message

### Definition Retrieval Errors

- **API timeout** - Generic definition provided
- **Invalid response** - "Definition unavailable" shown

### Player DM Errors

- **DM closed** - Game continues, but player doesn't see interface
- **User not found** - Gracefully skip initialization

## Configuration

Edit `config/settings.py`:

```python
GAME_CONFIG = {
    "game_duration": 600,  # 10 minutes active game
    "solo_timeout": 120,   # 2 minutes to join
    # ...
}
```

## Future Enhancements

- [ ] Difficulty multiplier based on word length
- [ ] Bonus points for rare letter combinations
- [ ] Statistics on letter frequency by player
- [ ] Personal word history across games
- [ ] Difficulty levels (Easy/Normal/Hard)
- [ ] Time bonus for quick submission
- [ ] Minimum letter requirements (use at least X letters)
- [ ] Custom game duration
- [ ] Solo mode support
