# 📚 CODEBASE ARCHITECTURE - WHAT DOES IT DO?

## Overview

Your spelling bee bot system is built on a multi-layered architecture that manages individual player game sessions while coordinating with a global game session tracker. Here's what it does at each level:

---

## 🎯 Core Game Flow

```
1. Player gets /spelling command
   ↓
2. Creates SpellingBeeGame (has global participants dict)
   ↓
3. Other players join via button
   ↓
4. Starter clicks "Start Game"
   ↓
5. Creates PrivateGameManager (for this game)
   ↓
6. Creates GameSessionTracker (tracks player scores separately)
   ↓
7. For each player:
   - Creates PlayerGameEmbed (their personal embed in DM)
   - Creates PlayerGameView (their submit button)
   - Creates WordSubmitModal (modal for word entry)
   ↓
8. Player submits word → Updates PlayerGameEmbed
   ↓
9. Timer expires → Results compiled from GameSessionTracker
   ↓
10. Stats saved to JSON files
```

---

## 📁 THE THREE MAIN COMPONENTS

### 1. `player_session.py` - Session Tracking

**What it does:** Tracks game state per-player and game-wide

**Classes:**

#### `PlayerSession`

Tracks one player's performance in ONE game

```python
PlayerSession(player_id=123, player_name="Alice")
│
├─ valid_words: [(word, points, definition), ...]
│  └─ Example: [("HELLO", 10, "A greeting"), ("WORLD", 8, "The planet")]
│
├─ attempt_count: int (how many words they tried)
│
├─ started_at: datetime ISO string
├─ ended_at: datetime ISO string (None if game ongoing)
│
└─ Methods:
   ├─ add_valid_word(word, points, definition) → Add a word they found
   ├─ increment_attempt() → Count one submission
   ├─ get_total_score() → Sum all points
   ├─ get_word_count() → How many words they found
   ├─ end_session() → Mark session as done
   └─ to_dict() → Convert to JSON-serializable format
```

**Example:**

```python
session = PlayerSession(123, "Alice")
session.add_valid_word("HELLO", 10, "A greeting")
session.add_valid_word("WORLD", 8, "The planet")
print(session.get_total_score())  # Output: 18
print(session.get_word_count())   # Output: 2
```

#### `GameSessionTracker`

Tracks ALL players in ONE game (the "session")

```python
GameSessionTracker(game_id="game-abc123")
│
├─ players: Dict[player_id → PlayerSession]
│  └─ Stores one PlayerSession for each player
│
├─ started_at: datetime ISO string
├─ ended_at: datetime ISO string (None if game ongoing)
│
└─ Methods:
   ├─ add_player(player_id, player_name) → Add player to tracking
   ├─ record_attempt(player_id) → Count one submission
   ├─ record_valid_word(player_id, word, points, definition) → Record a win
   ├─ end_session() → Mark game complete
   ├─ get_leaderboard() → [(player_id, name, score, word_count, attempts), ...]
   ├─ get_player_words(player_id) → [(word, points, definition), ...]
   ├─ get_player_score(player_id) → Total points
   └─ get_summary() → Complete game summary as dict
```

**Example:**

```python
tracker = GameSessionTracker("game-abc123")
tracker.add_player(123, "Alice")
tracker.add_player(456, "Bob")

tracker.record_valid_word(123, "HELLO", 10, "A greeting")
tracker.record_valid_word(456, "WORLD", 8, "The planet")

leaderboard = tracker.get_leaderboard()
# Output: [(123, "Alice", 10, 1, 1), (456, "Bob", 8, 1, 1)]
```

**Key Insight:** `GameSessionTracker` is the **SOURCE OF TRUTH** for game results. It tracks every player's performance independently of the `SpellingBeeGame.participants` dict.

---

### 2. `game_views.py` - Player UI Management

**What it does:** Creates and manages the personal Discord UI each player sees

**Classes:**

#### `WordSubmitModal`

The popup form players fill out to submit a word

```python
WordSubmitModal(
    player_id=123,
    letters="AEIOURHTN",
    on_submit=async_callback_function
)
│
├─ UI Element: Text input field
│  └─ Prompt: "Enter a word"
│  └─ Placeholder: "Use letters from: AEIOURHTN"
│  └─ Constraints: 3-15 characters, required
│
├─ When submitted:
│  ├─ Gets the word from text field
│  ├─ Trims and converts to uppercase
│  ├─ Calls the on_submit callback with (interaction, player_id, word)
│  └─ Defers response (ephemeral/private)
│
└─ Timeout: 5 minutes (300 seconds)
```

**User Experience:**

```
Player clicks "Submit Word" button
   ↓
Modal pops up with text field
   ↓
Player types "HELLO"
   ↓
Modal submitted
   ↓
on_submit callback triggered
   ↓
Word validated, definition fetched
   ↓
If valid: Modal response "✅ +10 points"
If invalid: Modal response "❌ Not found in letters"
```

#### `PlayerGameView`

The button interface shown in player's DM

```python
PlayerGameView(
    player_id=123,
    letters="AEIOURHTN",
    on_submit=async_callback_function
)
│
├─ UI Element: "📝 Submit Word" button
│  └─ When clicked: Opens WordSubmitModal
│
└─ Timeout: 5 minutes
```

**In Discord DM:**

```
┌─────────────────────────────┐
│ 🐝 Your Spelling Bee Game   │
│                             │
│ Find words from: AEIOURHTN  │
│ Time Remaining: 597s        │
│                             │
│ [📝 Submit Word] ✏️         │ ← Button
│                             │
│ ✅ Words Found (2)          │
│ ✅ HELLO (+10 pts)          │
│    A greeting               │
│ ✅ WORLD (+8 pts)           │
│    The planet               │
│                             │
│ 🏆 Your Score: 18 points    │
│ 📊 Total Attempts: 5        │
└─────────────────────────────┘
```

#### `PlayerGameEmbed`

Manages the visual embed that displays in DM

```python
PlayerGameEmbed(
    player_id=123,
    letters="AEIOURHTN",
    game_duration=600  # 10 minutes
)
│
├─ State:
│  ├─ valid_words: [(word, points, definition), ...]
│  ├─ attempt_count: int
│  ├─ remaining_time: int (seconds left)
│  ├─ message: discord.Message (the DM message)
│  └─ player_id: int
│
├─ Methods:
│  ├─ create_embed() → discord.Embed (formatted embed)
│  ├─ send_to_player(user, view) → Send initial DM
│  ├─ update_embed(view=None) → Refresh DM display
│  ├─ add_valid_word(word, points, definition) → Add word
│  ├─ increment_attempts() → Count attempt
│  ├─ update_timer(remaining_seconds) → Update countdown
│  ├─ get_total_score() → Sum points
│  └─ get_word_list() → Copy of valid_words
```

**Key Flow:**

```
1. PlayerGameEmbed created when game starts
   ↓
2. create_embed() generates the visual embed
   ↓
3. send_to_player() sends it to player's DM
   ↓
4. While game running:
   ├─ Player adds a word
   ├─ add_valid_word() stores it locally
   ├─ update_embed() refreshes DM display
   └─ repeat
   ↓
5. Timer updates remaining time
   ├─ update_timer(597) updates countdown
   ├─ update_embed() refreshes display
   └─ repeat
   ↓
6. Game ends - embed becomes archived
```

---

## 🔄 How They Work Together

### Scenario: Player Joins Game

```
1. /spelling command run
   ↓
2. SpellingBeeGame created (stores participants dict)
   ↓
3. Player clicks Join
   → SpellingBeeGame.add_participant(player_id)
   ↓
4. Starter clicks Start
   → PrivateGameManager created (knows about all players)
   → GameSessionTracker created (parallel tracking)
   ↓
5. For each player:
   ├─ PlayerGameEmbed created (their personal display)
   ├─ PlayerGameView created (their button interface)
   ├─ embed.send_to_player() sends DM
   └─ Player sees their personal game interface
```

### Scenario: Player Submits Word

```
1. Player clicks "Submit Word" button in DM
   ↓
2. WordSubmitModal opens (text input form)
   ↓
3. Player types "HELLO" and submits
   ↓
4. on_submit callback triggered with (interaction, player_id, "HELLO")
   ↓
5. PrivateGameManager.handle_word_submission() called
   ├─ Validates word is in available letters
   ├─ Fetches definition from OpenAI API
   ├─ Awards points if valid
   ├─ Stores in GameSessionTracker.record_valid_word()
   └─ Updates PlayerGameEmbed with new word
   ↓
6. PlayerGameEmbed.update_embed() refreshes DM display
   ├─ Shows new word with definition
   ├─ Updates total score
   └─ Updates attempt count
```

### Scenario: Game Ends

```
1. Timer expires (10 minutes)
   ↓
2. _end_game_timer_expired() called in views.py
   ↓
3. Gets results from GameSessionTracker (source of truth)
   ├─ Gets leaderboard from tracker
   ├─ Gets each player's words with definitions
   └─ All data is complete and accurate
   ↓
4. LeaderboardFormatter creates professional embed
   ├─ Handles field limits (1024 chars)
   ├─ Adds medals (🥇🥈🥉)
   ├─ Truncates long definitions
   └─ Creates beautiful results display
   ↓
5. Results posted to channel
   ↓
6. SessionSaver saves to JSON
   ├─ Uses GameSessionTracker.get_summary()
   ├─ Gets complete game state
   └─ Saves to data/session_results.json
   ↓
7. StatsTracker updates player statistics
   ├─ Gets data from GameSessionTracker
   ├─ Updates global player stats
   └─ Saves to data/player_stats.json
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    /spelling command                        │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────┐
        │  SpellingBeeGame created       │
        │  ├─ game_id                    │
        │  ├─ letters: str               │
        │  ├─ possible_words: dict       │
        │  └─ participants: dict         │
        └────────────┬───────────────────┘
                     │
        Players join via button
                     │
        Starter clicks "Start Game"
                     │
                     ↓
        ┌────────────────────────────────┐
        │ PrivateGameManager created     │
        │ ├─ game_id                     │
        │ ├─ letters                     │
        │ ├─ word_generator (OpenAI API) │
        │ └─ bot instance                │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │ GameSessionTracker created     │
        │ ├─ game_id                     │
        │ └─ players: Dict[            │
        │    player_id → PlayerSession] │
        └────────────┬───────────────────┘
                     │
         For each player in game
                     │
        ┌────┬───────┴────────┬────────────────────┐
        │    │                │                    │
        ↓    ↓                ↓                    ↓
    ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐
    │PlayerGameEmbed  │  │PlayerGameView    │  │PlayerSession │
    │ (DM display)    │  │(submit button)   │  │(tracking)    │
    └────────┬────────┘  └────────┬─────────┘  └──────┬───────┘
             │                    │                   │
             └────────┬───────────┴───────────────────┘
                      │
                      ↓
         Sends DM with embed + button
                      │
         Player clicks "Submit Word"
                      │
                      ↓
         WordSubmitModal (text input form)
                      │
         Player enters word
                      │
                      ↓
         PrivateGameManager.handle_word_submission()
         ├─ Validates word
         ├─ Fetches definition
         ├─ Awards points
         └─ Updates GameSessionTracker.record_valid_word()
                      │
                      ↓
         PlayerGameEmbed.update_embed()
         (refreshes DM with new word)
                      │
              ... game continues for 10 min ...
                      │
                      ↓
              Timer expires
                      │
                      ↓
         _end_game_timer_expired()
         Gets results from GameSessionTracker ← SOURCE OF TRUTH
                      │
                      ↓
         LeaderboardFormatter.create_leaderboard_embed()
         (professional formatting with limits)
                      │
                      ↓
         Post results to channel
                      │
                      ↓
         SessionSaver.save_session()
         (save to JSON)
                      │
                      ↓
         StatsTracker.update_player_stats()
         (update global stats)
```

---

## 🎯 Key Design Principles

### 1. **Separation of Concerns**

- `PlayerSession`: Tracks one player's score
- `GameSessionTracker`: Aggregates all players
- `PlayerGameEmbed`: Manages UI display
- `PlayerGameView`: Handles interactions
- `WordSubmitModal`: Word input form

### 2. **Single Source of Truth**

- `GameSessionTracker` is THE source of truth for game results
- NOT `SpellingBeeGame.participants`
- All final results pulled from tracker
- Ensures accuracy and consistency

### 3. **Stateless UI Components**

- `PlayerGameView` and `WordSubmitModal` are stateless
- They call callbacks to actual game logic
- UI is just display, logic is elsewhere

### 4. **Real-time Updates**

- `PlayerGameEmbed.update_embed()` refreshes DM live
- Shows words, score, attempts, timer
- Updates every time player adds a word

---

## 📋 What Needs Polishing

### 1. **Missing Module Docstring**

`game_views.py` has no module-level docstring explaining the whole file

### 2. **Incomplete Type Hints**

```python
# Current (vague)
self.valid_words: list = []

# Should be (precise)
self.valid_words: List[Tuple[str, int, str]] = []
```

### 3. **Missing Method Return Types**

```python
# Current (no return type)
def get_word_list(self) -> list:

# Should be (specific)
def get_word_list(self) -> List[Tuple[str, int, str]]:
```

### 4. **No TypedDict for Clarity**

```python
# Currently: Dict (untyped)
# Should use: TypedDict to specify exact keys and types
```

### 5. **Docstrings Need Improvement**

```python
# Current (minimal)
def add_valid_word(self, word: str, points: int, definition: str):
    """Add a valid word to player's list"""

# Should be (comprehensive)
def add_valid_word(self, word: str, points: int, definition: str) -> None:
    """
    Add a valid word that player found.

    Args:
        word: The word found (uppercase)
        points: Points awarded for this word
        definition: Definition fetched from OpenAI API

    Returns:
        None

    Example:
        >>> embed = PlayerGameEmbed(123, "AEIOU", 600)
        >>> embed.add_valid_word("HELLO", 10, "A greeting")
        >>> embed.get_total_score()
        10
    """
```

---

## 🎯 Summary

Your bot architecture:

1. **Tracks player progress** via `PlayerSession` and `GameSessionTracker`
2. **Creates personal UI** for each player via `PlayerGameEmbed` and `PlayerGameView`
3. **Handles input** via `WordSubmitModal` forms
4. **Validates & scores** words in real-time
5. **Updates DM display** live as game progresses
6. **Compiles results** from the GameSessionTracker
7. **Saves data** to JSON files
8. **Updates stats** for future games

**It's a complete, production-grade game session management system!**

---

## 📖 Now Ready for Polishing

With this understanding, polishing means:

✅ Add comprehensive module docstrings
✅ Fix all type hints to be specific
✅ Add return type hints to all methods
✅ Create TypedDict for complex return types
✅ Expand method docstrings with examples
✅ Add edge case documentation

Ready to proceed? 🚀
