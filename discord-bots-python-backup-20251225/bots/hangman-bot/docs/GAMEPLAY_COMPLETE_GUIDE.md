# Hangman Gameplay - Complete Flow Guide

## Answer to Your Questions

### 1️⃣ "How should players play - type letter in message or in embed?"

**Answer: Use slash command `/hangman guess <letter>`**

Players type: `/hangman guess e` (not in message box, in Discord command)

**Why this approach:**

- ✅ Slash commands are Discord-native and reliable
- ✅ Turn validation built-in
- ✅ Works perfectly on mobile
- ✅ No confusion between game messages and casual chat
- ✅ Already fully implemented

---

### 2️⃣ "Auto-capitalize words when started"

**Answer: ✅ ALREADY IMPLEMENTED**

When user types: `/hangman start leopard`

- Bot stores as: `LEOPARD` (automatically uppercased)
- Display shows: `_ _ _ _ _ _ _` (all uppercase)

**Code location:** `src/gamification/game.py` line 35

```python
self.word = word.upper()  # Converts "leopard" → "LEOPARD"
```

---

### 3️⃣ "Auto-capitalize player guesses"

**Answer: ✅ ALREADY IMPLEMENTED**

When player types: `/hangman guess e`

- Bot processes as: `E` (automatically uppercased)
- Display shows: `✅ E is in the word!`

**Code location:** `src/gamification/game.py` line 93

```python
letter = letter.upper()  # Converts "e" → "E"
```

---

## 🎮 Complete Game Flow

### Step 1: Starting the Game

```
User Types:     /hangman start leopard
                    ↓
Game Creates:   word = "LEOPARD" (auto-uppercase!)
                    ↓
Display Shows:  📝 Word: _ _ _ _ _ _ _
                👥 Players: 1/4
                [✋ Join Game] [🎮 Start Game]
```

### Step 2: Players Join

```
Player1 Clicks: [✋ Join Game]
Bot Updates:    👥 Players: 2/4
                <@Matthew> 👑 (Starter)
                <@Player1>

Player2 Clicks: [✋ Join Game]
Bot Updates:    👥 Players: 3/4
                <@Matthew> 👑 (Starter)
                <@Player1>
                <@Player2>
```

### Step 3: Starting Gameplay

```
Starter Clicks: [🎮 Start Game]
Bot Selects:    🎲 Random first player = @Player2
Bot Posts:      "Your turn @Player2! Use /hangman guess <letter>"
```

### Step 4: Player Makes Guess

```
Player2 Types:  /hangman guess e
                    ↓
Bot Converts:   "e" → "E" (auto-uppercase!)
                    ↓
Bot Processes:  Is "E" in "LEOPARD"? YES!
                    ↓
Bot Shows:      ✅ E is in the word!
                📝 Word: _ _ O _ _ _ _
                📋 Guessed: E
                Mistakes: 0/6
                    ↓
Next Player:    @Matthew, your turn!
```

### Step 5: Game Continues

```
Matthew Types:  /hangman guess a
                    ↓
Bot Converts:   "a" → "A" (auto-uppercase!)
                    ↓
Bot Processes:  Is "A" in "LEOPARD"? YES!
                    ↓
Bot Shows:      ✅ A is in the word!
                📝 Word: L E O _ A _ _
                📋 Guessed: E, A
                Mistakes: 0/6
                    ↓
Next Player:    @Player1, your turn!
```

### Step 6: Wrong Guess

```
Player1 Types:  /hangman guess x
                    ↓
Bot Converts:   "x" → "X" (auto-uppercase!)
                    ↓
Bot Processes:  Is "X" in "LEOPARD"? NO!
                    ↓
Bot Shows:      ❌ X is not in the word!
                📝 Word: L E O _ A _ _
                📋 Guessed: E, A, X
                Mistakes: 1/6
                [Hangman updates with body part]
                    ↓
Next Player:    @Matthew, your turn!
```

### Step 7: Game Won

```
Player Guesses: All remaining letters...
                    ↓
Bot Detects:    All letters of "LEOPARD" found!
                    ↓
Bot Shows:      🎉 LEOPARD is complete! You found the word!
                🏆 Winners: @Matthew, @Player1, @Player2
                📊 Points Awarded to all
                    ↓
Game Ends:      New game can start
```

---

## ✅ Capitalization System

### How It Works

**Automatic Capitalization Pipeline:**

```
User Input → Bot Receives → Auto-Uppercase → Game Logic → Display

Examples:
"leopard"  → "LEOPARD"   → Used for game state
"e"        → "E"         → Checked against word
"oArD"     → "OARD"      → Multiple letters (error: needs single letter)
```

### Guarantee: 100% Consistency

| Input           | Stored    | Displayed | Example                                  |
| --------------- | --------- | --------- | ---------------------------------------- |
| Any case        | UPPERCASE | UPPERCASE | `leopard` → All shows as `L E O P A R D` |
| Any letter      | UPPERCASE | UPPERCASE | `e` or `E` both → Shows as `E`           |
| Guessed letters | UPPERCASE | UPPERCASE | `A, E, L` → Shows as `A E L`             |

**Result:** Everything is uppercase = perfect consistency ✅

---

## 🎯 Command Reference

### Starting Game

```
/hangman start <word>

Examples:
/hangman start leopard
/hangman start PYTHON
/hangman start dragon

All get stored as: LEOPARD, PYTHON, DRAGON
```

### Guessing Letter

```
/hangman guess <letter>

Examples:
/hangman guess e
/hangman guess E
/hangman guess a

All processed as: E, E, A
```

### Other Commands

```
/hangman stats      - View your stats
/hangman leaderboard - View rankings
/hangman leave      - Leave current game (non-starters only)
```

---

## 🔄 Turn Order

After each guess, turns rotate:

```
Players: [Matthew, Player1, Player2]

Turn 1: Matthew guesses
Turn 2: Player1 guesses
Turn 3: Player2 guesses
Turn 4: Matthew guesses (loops back)
```

**Current player always shown:** `@PlayerName, your turn!`

---

## 💬 Player Communication

### What Player Sees

```
/hangman guess e

Bot Response:
────────────────────────────────────────
✅ E is in the word!

📝 Word: L E O _ A R D
📋 Guessed Letters: A E L O
🎨 Hangman: [ASCII art showing mistakes]
Mistakes: 0/6

🎯 @Player1, your turn!
────────────────────────────────────────
```

### Clear Feedback

Every guess gets:

1. ✅ or ❌ status
2. Updated word display
3. List of all guessed letters (sorted)
4. Hangman ASCII art
5. Mistake counter (X/6)
6. Next player's name and instruction

---

## ✨ Key Features

| Feature                     | Status        | How It Works                   |
| --------------------------- | ------------- | ------------------------------ |
| **Auto-Capitalize Words**   | ✅ YES        | `word.upper()` in game init    |
| **Auto-Capitalize Letters** | ✅ YES        | `letter.upper()` when guessing |
| **Consistency**             | ✅ GUARANTEED | All uppercase = no confusion   |
| **Turn Validation**         | ✅ YES        | Only current player can guess  |
| **Duplicate Prevention**    | ✅ YES        | Can't guess same letter twice  |
| **Mobile Friendly**         | ✅ YES        | Slash commands work everywhere |
| **Turn Order**              | ✅ YES        | Round-robin through players    |
| **Win Detection**           | ✅ YES        | Detects when word complete     |

---

## Example Game Session

```
Matthew: /hangman start PYTHON
Bot: 🎮 Game created! _ _ _ _ _ _ (6 letters)
     [✋ Join Game] [🎮 Start Game]

Sarah: [Clicks Join]
Tom:   [Clicks Join]

Matthew: [Clicks Start]
Bot: 🎲 Random first player: @Sarah
     @Sarah, your turn! /hangman guess <letter>

Sarah: /hangman guess e
Bot: ❌ E is not in the word. Mistakes: 1/6
     @Tom, your turn!

Tom: /hangman guess p
Bot: ✅ P is in the word!
     Word: P _ _ _ _ _
     @Matthew, your turn!

Matthew: /hangman guess y
Bot: ✅ Y is in the word!
     Word: P Y _ _ _ _
     @Sarah, your turn!

Sarah: /hangman guess t
Bot: ✅ T is in the word!
     Word: P Y T _ _ _
     @Tom, your turn!

Tom: /hangman guess h
Bot: ✅ H is in the word!
     Word: P Y T _ _ _
     @Matthew, your turn!

Matthew: /hangman guess o
Bot: ✅ O is in the word!
     Word: P Y T _ O _
     @Sarah, your turn!

Sarah: /hangman guess n
Bot: 🎉 N is correct! You found the word! PYTHON!
     🏆 Winners: Matthew, Sarah, Tom
     📊 Everyone earned points!
```

---

## Summary

### Your Questions Answered ✅

| Question                 | Answer                     | Implementation                |
| ------------------------ | -------------------------- | ----------------------------- |
| How to play?             | `/hangman guess <letter>`  | Slash command                 |
| Where type?              | Command input, not message | Discord native                |
| Auto-capitalize word?    | YES ✅                     | Line 35 of game.py            |
| Auto-capitalize letters? | YES ✅                     | Line 93 of game.py            |
| Consistency?             | 100% guaranteed            | All stored/shown as UPPERCASE |

### Key Guarantees

- ✅ All words uppercase on display
- ✅ All guesses uppercase automatically
- ✅ No confusion from mixed cases
- ✅ Perfect consistency throughout game
- ✅ Already fully implemented

**Status: READY TO USE** 🎮

You don't need to change anything - the capitalization system is already perfect!
