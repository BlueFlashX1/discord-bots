# Quick Start: Hangman Bot Button Feature

## The New Experience

### Step 1: Start Game

```
You: /hangman start leopard
Bot: [Shows embed with 2 buttons]
```

### Step 2: Players Join (Click Button)

```
Player1: [Clicks ✋ Join Game]
Bot: ✅ Player1 joined! (2/4 players)

Player2: [Clicks ✋ Join Game]
Bot: ✅ Player2 joined! (3/4 players)
```

### Step 3: Start Game (Click Button)

```
You: [Clicks 🎮 Start Game]
Bot: 🎮 Game Started! 🎲 Random first player selected: @Player2
Bot: 🎯 @Player2, your turn! Use /hangman guess <letter>
```

### Step 4: Play

```
Player2: /hangman guess e
Bot: ✅ E is in the word!
Bot: @Player1, your turn!

Player1: /hangman guess a
Bot: ❌ A is not in the word. Mistakes: 1/6
Bot: @You, your turn!

You: /hangman guess o
Bot: ✅ O is in the word!
...game continues
```

---

## Button Details

### ✋ Join Game Button

- **Color**: Blue (Primary)
- **Emoji**: 👤
- **Who Can Click**: Anyone
- **What It Does**: Adds you to game, updates player list
- **Errors**:
  - Already in game → Error
  - Game full (4/4) → Error
  - Game already started → Error

### 🎮 Start Game Button

- **Color**: Green (Success)
- **Emoji**: 🚀
- **Who Can Click**: Only the starter
- **What It Does**: Starts game with random first player
- **Errors**:
  - Not the starter → Error
  - Less than 2 players → Error
  - Already started → Error

---

## Commands During Game

| Command                   | Purpose                       | Example                |
| ------------------------- | ----------------------------- | ---------------------- |
| `/hangman guess <letter>` | Guess a letter                | `/hangman guess e`     |
| `/hangman leave`          | Quit game (non-starters only) | `/hangman leave`       |
| `/hangman stats`          | View your stats               | `/hangman stats`       |
| `/hangman leaderboard`    | View rankings                 | `/hangman leaderboard` |

---

## What Changed Under the Hood

**New File**: `src/core/views.py` (267 lines)

- GameControlView class
- Join button logic
- Start button logic
- Real-time embed updates
- 15-minute timeout handling

**Modified File**: `src/core/__main__.py`

- Added GameControlView import
- Updated `/hangman start` to use buttons
- That's it!

---

## Key Features

✅ Click buttons to join (no commands needed)
✅ Real-time embed updates as players join
✅ Random first player selection
✅ Modern Discord UI
✅ Full error handling
✅ 15-minute timeout for unused lobbies
✅ Mobile-friendly

---

## Testing It Now

1. Get bot running: `bash RUN_BOT.sh`
2. In Discord: `/hangman start <any_word>`
3. Click `✋ Join Game` to join
4. Click `🎮 Start Game` to begin
5. Use `/hangman guess <letter>` to play

---

## Need Help?

- **Buttons not showing**: Make sure bot is running and has latest code
- **Can't click buttons**: Make sure bot has proper permissions
- **Game won't start**: Need at least 2 players (you + 1 other)
- **Random player always same**: Verify `random.choice()` is working (should vary)

---

That's it! Enjoy the new button-based game experience! 🎮
