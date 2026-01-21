# Hangman Bot - Interactive Button Feature Guide

## Overview

The Hangman bot now supports **interactive Discord buttons** for joining games and starting gameplay. This provides a much more polished, user-friendly experience.

---

## New Game Flow (With Buttons) ✨

### Step 1: Starter Initiates Game

```
/hangman start <word>
```

Example: `/hangman start leopard`

**Result:** Posts an embed with:

- 🎮 Game title and starter's name
- 📚 AI-generated hint/definition (without spoiling the word)
- 📝 Word display (underscores for hidden letters)
- 👥 Player count (starts at 1/4 - the starter)
- 🎯 Instructions updated for button usage
- 🎲 Hangman ASCII art showing mistakes

**Buttons appear at bottom:**

- `✋ Join Game` (Primary blue button)
- `🎮 Start Game` (Success green button)

---

### Step 2: Players Join via Button

Other players click the **`✋ Join Game`** button.

**What happens:**

- ✅ Player is instantly added to the game
- ✅ Embed automatically updates showing new player count
- ✅ All player names (@mentions) are listed
- ✅ Confirmation message sent (can show max 4 players)

**Validation:**

- ❌ Can't join if already in game
- ❌ Can't join if game is full (max 4 players)
- ❌ Can't join after game has started

---

### Step 3: Starter Begins Game

Once ready, the **starter** (only) clicks **`🎮 Start Game`** button.

**Validation:**

- ❌ Only the starter can click this button
- ❌ Needs at least 2 players to start (starter + 1 other)
- ❌ Can't start if game already started

**When clicked:**

1. 🎲 **Random player is selected** from all joined players
2. 🚀 Buttons become disabled (no more joining/starting)
3. 📤 New embed posted: "Game Started! Random first player selected: @Player"
4. 🎯 Selected player is **@mentioned** with instruction:
   > "Your turn! Use `/hangman guess <letter>` to guess a letter"

---

## Gameplay (Slash Commands)

### Player's Turn

Player enters: `/hangman guess <letter>`

Example: `/hangman guess e`

**Response:**

- ✅ If correct: "✅ **E** is in the word!" + shows updated word
- ❌ If wrong: "❌ **E** is not in the word. Mistakes: 1/6"
- 🎉 If completes word: "🎉 **E** is correct! You found the word!"
- 💀 If 6 mistakes: "Game Over! The word was: **LEOPARD**"

**Then:**

- Turn passes to next player (round-robin)
- Next player is pinged with same turn instruction

---

## Button Feature Details

### Join Button (`✋ Join Game`)

| Aspect             | Details                                       |
| ------------------ | --------------------------------------------- |
| **Style**          | Primary (Blue)                                |
| **Emoji**          | 👤                                            |
| **Timeout**        | 15 minutes (buttons disappear if no activity) |
| **Max Joins**      | 4 players total                               |
| **Who Can Click**  | Anyone in the channel                         |
| **Multiple Joins** | Prevented (error if try to join twice)        |

### Start Button (`🎮 Start Game`)

| Aspect                     | Details                                          |
| -------------------------- | ------------------------------------------------ |
| **Style**                  | Success (Green)                                  |
| **Emoji**                  | 🚀                                               |
| **Who Can Click**          | Only the game starter                            |
| **Minimum Players**        | 2 (starter + 1 other)                            |
| **Disables Automatically** | After game starts                                |
| **Random Selection**       | First player picked randomly from joined players |

### Behavior After Start

- Both buttons become **disabled** (grayed out, unclickable)
- Original embed stays in channel (for reference)
- New embed posted showing game has started
- Gameplay continues via `/hangman guess` slash commands

---

## Command Overview

| Command                   | Purpose           | Who            | Example                 |
| ------------------------- | ----------------- | -------------- | ----------------------- |
| `/hangman start <word>`   | Create a new game | Anyone         | `/hangman start dragon` |
| `/hangman guess <letter>` | Guess a letter    | Current player | `/hangman guess a`      |
| `/hangman leave`          | Quit the game     | Non-starters   | `/hangman leave`        |
| `/hangman stats`          | View your stats   | Anyone         | `/hangman stats`        |
| `/hangman leaderboard`    | View rankings     | Anyone         | `/hangman leaderboard`  |

---

## Error Handling

### Common Errors & Solutions

#### ❌ "Game is full! (Max 4 players)"

- **Cause**: Max capacity reached
- **Solution**: Wait for someone to leave or start a new game

#### ❌ "Only the game starter can start the game!"

- **Cause**: Non-starter tried to click Start button
- **Solution**: Wait for the starter to click the button

#### ❌ "Need at least 2 players to start!"

- **Cause**: Starter tried to start with just themselves
- **Solution**: Wait for at least 1 other player to join first

#### ❌ "Game has already started!"

- **Cause**: Tried to join after game started
- **Solution**: Wait for the current game to end or start a new game

#### ⏰ "Game lobby has expired"

- **Cause**: No button clicks for 15 minutes
- **Solution**: Use `/hangman start <word>` again to create new game

---

## Implementation Details

### New File: `src/core/views.py`

Contains the `GameControlView` class with:

- `GameControlView`: Main View holding both buttons
- `join_button()`: Handles join button interactions
- `start_button()`: Handles start button interactions
- `_update_game_embed()`: Updates embed with new player list
- `on_timeout()`: Handles view timeout after 15 minutes

### Modified File: `src/core/__main__.py`

- Added import: `from src.core.views import GameControlView`
- Updated `/hangman start` command to:
  - Create a `GameControlView` instance
  - Send embed with buttons (`view=view`)
  - Store message reference for button interactions

### Key Features

✅ Disabled buttons after game starts (prevents abuse)
✅ Real-time embed updates when players join
✅ Random first player selection from all players
✅ Player pinging with turn instructions
✅ 15-minute timeout for unused game lobbies
✅ Full error handling for all edge cases
✅ Seamless integration with existing slash commands

---

## Testing Checklist

- [ ] `/hangman start dragon` creates game with buttons
- [ ] Click `✋ Join Game` adds player and updates embed
- [ ] Try clicking `✋ Join Game` twice - get error
- [ ] Try clicking `🎮 Start Game` as non-starter - get error
- [ ] Click `🎮 Start Game` as starter - game begins, random player pinged
- [ ] New player does `/hangman guess a` - works correctly
- [ ] Button clicks don't work after game starts (disabled)
- [ ] After 15 min of inactivity, buttons disappear

---

## Example Discord Conversation

```
@Matthew: /hangman start leopard
[Embed appears with buttons]

@John: [Clicks ✋ Join Game]
Bot: ✅ @John joined the game! (2/4 players)

@Sarah: [Clicks ✋ Join Game]
Bot: ✅ @Sarah joined the game! (3/4 players)

@Matthew: [Clicks 🎮 Start Game]
[New embed appears: "🎲 Random first player selected: @Sarah"]
Bot: 🎯 @Sarah, your turn! Use `/hangman guess <letter>` to guess a letter.

@Sarah: /hangman guess e
Bot: ✅ **E** is in the word!
[Word updates, shows current state]
Bot: @John, your turn! Use `/hangman guess <letter>` to guess a letter.

@John: /hangman guess a
Bot: ❌ **A** is not in the word. Mistakes: 1/6
[Hangman updates with one body part]
Bot: @Matthew, your turn! Use `/hangman guess <letter>` to guess a letter.

... game continues ...
```

---

## Notes

- Buttons timeout after **15 minutes** of no interaction
- Game can have **1-4 players** (starter counts as 1)
- First player is **randomly selected** from all joined players
- Turns then **rotate round-robin** through players
- **Only `/hangman guess` works during gameplay** (other commands return errors)
- **Starter can't leave** (they own the game)
- **Non-starters can use `/hangman leave`** to exit before game starts

---

## Summary

This button-based system replaces the old command-based joining (`/hangman join`) with a much more intuitive, modern Discord experience. Players simply click buttons to join and the starter clicks to begin—no confusing command syntax needed!

The new flow is:

1. `/hangman start <word>` → Game created with buttons
2. Click `✋ Join Game` → Join instantly
3. Click `🎮 Start Game` → Random player picked, game begins
4. `/hangman guess <letter>` → Gameplay (same as before)
