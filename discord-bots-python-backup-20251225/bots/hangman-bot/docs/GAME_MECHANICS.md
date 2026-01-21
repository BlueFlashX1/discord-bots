# Hangman Bot - Game Mechanics

## Player Roles & Participation

### Game Starter (👑 Starter)

- **Who**: The player who runs `/hangman start <word>`
- **Cannot**: Leave the game (prevented by `/leave` command)
- **Responsibility**: Provides the word and stays for the entire game
- **Behavior**: If all other players leave, game continues with starter alone
- **Indicator**: Shows as "👑 (Starter)" in player list

### Other Players

- **How to Join**: Use `/hangman join` command
- **Max Players**: 4 total per game (1 starter + up to 3 others)
- **Can Leave**: Use `/hangman leave` to exit (doesn't affect game)
- **Auto-Join**: NOT auto-joined; must explicitly use `/hangman join`

## Game Flow

### 1. Game Start

```
/hangman start <word>
```

- Creates a game with the starter as player
- Shows: Word display, hints from AI, player list (1/4)
- Starter is locked in as "👑 (Starter)"

### 2. Player Joining

```
/hangman join
```

- Adds player to the game (max 4 total)
- Shows updated player list (X/4)
- Cannot join if:
  - No game in progress
  - Game already ended (won/lost)
  - Game is full (4 players)
  - Already in the game

### 3. Taking Turns

- Players take **turns** guessing letters
- Current player indicated by bot
- Turn order: First to join → Second → etc.
- After each guess, turn passes to next player

### 4. Leaving Game

```
/hangman leave
```

- **Starter**: ❌ Cannot leave (shows error)
- **Other Players**: ✅ Can leave freely
- If starter leaves game: ❌ Blocked with message "Game starter cannot leave!"
- Leaving doesn't affect game state

### 5. Game End

- **Win**: All letters guessed correctly
  - All players who participated get points
  - Score calculated based on: word length, mistakes, perfect bonus
- **Loss**: 6 wrong guesses reached
  - Game ends immediately
- **Early End**: Starter can end game anytime with `/hangman end`
  - Reveals the word to all players
  - Game ends, no points awarded
  - Only starter can use this command

## Player Limits

| Metric            | Value                          |
| ----------------- | ------------------------------ |
| Max Players       | 4 (1 starter + 3 others)       |
| Min Players       | 1 (starter alone)              |
| Game Full Message | "Game is full (max 4 players)" |
| Already Joined    | "Already in game"              |

## Points & Rewards

### Earning Points

- Win condition: All team players get points
- **Scoring Formula**:

  ```
  Points = Base (100)
         + Word Length Bonus (length × 10)
         + Perfect Bonus (50 if 0 mistakes, else 0)
         - Mistake Penalty (mistakes × 20)

  Minimum guarantee: 50 points
  ```

### Example Scores

- 6-letter word, 0 mistakes: 100 + 60 + 50 - 0 = **210 points**
- 6-letter word, 2 mistakes: 100 + 60 + 0 - 40 = **120 points**
- 5-letter word, 4 mistakes: 100 + 50 + 0 - 80 = **70 points**
- Any word, 6+ mistakes: Minimum **50 points**

### Weekly Leaderboard

- Points reset every Monday
- Tracked in: `/leaderboard` command
- Shows: Top 10 players with medals (🥇🥈🥉)
- All-time leaderboard also available

## Commands Reference

| Command          | Usage                   | Description                         |
| ---------------- | ----------------------- | ----------------------------------- |
| Command          | Usage                   | Description                         |
| `/hangman start` | `/hangman start python` | Start new game (becomes starter)    |
| `/hangman join`  | `/hangman join`         | Join existing game                  |
| `/hangman guess` | `/hangman guess a`      | Guess a letter                      |
| `/hangman end`   | `/hangman end`          | End game (starter only)             |
| `/hangman leave` | `/hangman leave`        | Leave game (not allowed if starter) |
| `/games`         | `/games`                | List active games                   |
| `/leaderboard`   | `/leaderboard`          | View weekly rankings                |
| `/mystats`       | `/mystats`              | View personal stats                 |
| `/shop`          | `/shop`                 | Browse cosmetics                    |
| `/buy`           | `/buy fire_prefix`      | Purchase item                       |
| `/inventory`     | `/inventory`            | View owned items                    |

## Example Game Session

```
1. Alice: /hangman start python
   → Game created, Alice is starter (👑)
   → Shows: "python" → "_______", AI hints
   → Player count: 1/4

2. Bob: /hangman join
   → Bob joins as player 2
   → Player count: 2/4
   → Turn goes to Alice (starter first)

3. Alice: /hangman guess e
   → "✅ E is correct!"
   → Word: "_E____ON"
   → Turn goes to Bob

4. Bob: /hangman guess a
   → "❌ A is not in the word"
   → Mistakes: 1/6
   → Turn goes to Alice

5. Charlie: /hangman join
   → Charlie joins as player 3
   → Player count: 3/4

... game continues with Alice → Bob → Charlie turn order ...

6. Charlie guesses correctly
   → All letters found: "PYTHON"
   → 🎉 Game Won!
   → All 3 players earn points:
      - Alice: +150 pts
      - Bob: +150 pts
      - Charlie: +150 pts

7. Game ends, players can start new game
```

### Alternative: Starting a Game Alone

```
1. Diana: /hangman start secret
   → Game created with Diana as starter (👑)
   → No one else joins...
   → Player count: 1/4

2. Diana waits a bit, decides to end
   → /hangman end
   → "🛑 Game Ended - Diana ended the game"
   → Reveals word: "SECRET"
   → Game closes
```

**Note**: If no one joins your game, you can always use `/hangman end` to cancel it!

## Separation from Grammar Bot

✅ **Hangman Bot is completely independent**:

- Separate Discord token: `BOT_TOKEN_HANGMAN`
- Separate data files: `data/player_stats.json`, `data/shop_inventory.json`
- Separate gamification system (player_stats, shop, game logic)
- Optional OpenAI API key (can share or use own)
- No imports from grammar-teacher-bot

**Token Configuration** (in `.env`):

```
BOT_TOKEN_HANGMAN=your_hangman_token
OPENAI_API_KEY=your_openai_key  # Optional; can be shared or dedicated
```
