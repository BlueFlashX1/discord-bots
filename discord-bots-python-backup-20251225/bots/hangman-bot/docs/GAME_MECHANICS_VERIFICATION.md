# ✅ Hangman Bot - Game Mechanics Verification

## Implementation Status

### ✅ Starter Auto-Join & Protection

- [x] Game starter automatically joins when `/hangman start` is used
- [x] Starter is protected from leaving (cannot use `/hangman leave`)
- [x] Starter marked with 👑 (Starter) indicator in player list
- [x] Attempt to leave as starter shows: "Game starter cannot leave!"
- [x] Other players can freely join/leave

### ✅ Player Join System

- [x] Players use `/hangman join` to join existing game
- [x] Max 4 players per game (1 starter + 3 others)
- [x] Game full message: "Game is full (max 4 players)"
- [x] Duplicate join blocked: "Already in game"
- [x] Player count displayed: "👥 Players (X/4)"
- [x] Cannot join if game not in active state

### ✅ Leave Mechanics

- [x] `/hangman leave` command implemented
- [x] Starter cannot leave: ❌ Blocked
- [x] Other players can leave: ✅ Allowed
- [x] Leaving doesn't affect game state
- [x] Error handling for invalid leave attempts

### ✅ End Game Mechanics

- [x] `/hangman end` command implemented (starter only)
- [x] Starter can end game early anytime
- [x] Game reveals the word when ended
- [x] Non-starters cannot use `/hangman end` (error message)
- [x] Game state properly cleaned up on end
- [x] Solves "no one joined" problem

### ✅ Turn-Based Gameplay

- [x] Players take turns guessing letters
- [x] Turn order: First to join → Second → Third → ...
- [x] Cannot guess out of turn (error message sent)
- [x] Turn passes automatically after each guess

### ✅ Points & Scoring System

- [x] Winning team earns points based on performance
- [x] Scoring formula: 100 + (length×10) + perfect_bonus - (mistakes×20)
- [x] Minimum score guarantee: 50 points
- [x] All players in game get same score on win
- [x] Weekly leaderboard with automatic Monday reset
- [x] All-time leaderboard tracking

### ✅ Shop System

- [x] 12 cosmetic items available
- [x] Items include: prefixes, themes, badges, boosters
- [x] `/shop` - Browse items and prices
- [x] `/buy <item>` - Purchase with weekly points
- [x] `/inventory` - View owned items
- [x] Points deducted on purchase

### ✅ Leaderboard System

- [x] `/leaderboard` - Weekly top 10 with medals (🥇🥈🥉)
- [x] `/mystats` - Personal statistics
- [x] Weekly reset every Monday (ISO calendar)
- [x] All-time leaderboard available
- [x] Win rate calculation
- [x] Best game score tracking

### ✅ Separation from Grammar Bot

- [x] Independent Discord token (BOT_TOKEN_HANGMAN)
- [x] Separate data files (player_stats.json, shop_inventory.json)
- [x] No imports from grammar-teacher-bot
- [x] Optional OpenAI API key (can be shared or dedicated)
- [x] Self-contained modules (game.py, player_stats.py, shop.py)

## Game Flow Diagram

```
1. Alice starts game
   ├─ `/hangman start python`
   ├─ Alice = starter (👑)
   └─ Player count: 1/4

2. Bob joins
   ├─ `/hangman join`
   ├─ Bob = regular player
   └─ Player count: 2/4

3. Charlie joins
   ├─ `/hangman join`
   ├─ Charlie = regular player
   └─ Player count: 3/4

4. Diana joins
   ├─ `/hangman join`
   ├─ Diana = regular player
   └─ Player count: 4/4 (FULL)

5. Eve tries to join
   ├─ `/hangman join`
   └─ ❌ "Game is full (max 4 players)"

6. Game starts turns: Alice → Bob → Charlie → Diana → Alice → ...

7. Bob tries to leave
   ├─ `/hangman leave`
   └─ ✅ Bob left, count: 3/4

8. Alice tries to leave (starter)
   ├─ `/hangman leave`
   └─ ❌ "Game starter cannot leave!"

9. Game won!
   ├─ Score calculated: 150 points
   ├─ All 3 remaining players (Alice, Charlie, Diana) get 150 pts
   └─ Game ends
```

## Testing Checklist

- [ ] Starter can start game with word
- [ ] Starter appears as 👑 (Starter) in player list
- [ ] Up to 3 other players can join via `/hangman join`
- [ ] Player limit message shows when 4 players reached
- [ ] Starter can end game early with `/hangman end`
- [ ] Non-starter cannot end game (error message)
- [ ] Starter cannot leave game (error message)
- [ ] Other players can leave with `/hangman leave`
- [ ] Turns rotate through all players
- [ ] Correct guesses award points
- [ ] Perfect game (0 mistakes) awards bonus
- [ ] Leaderboard shows top 10 with medals
- [ ] Weekly reset happens Monday
- [ ] Shop items purchasable with points
- [ ] Inventory shows owned items
- [ ] No shared state with Grammar Bot

## Command Reference

| Action          | Command                 | Who            | Result                            |
| --------------- | ----------------------- | -------------- | --------------------------------- |
| Start Game      | `/hangman start python` | Anyone         | Create game, user becomes starter |
| Join Game       | `/hangman join`         | Anyone         | Add to player list (max 4 total)  |
| Guess           | `/hangman guess a`      | Current player | Process letter guess              |
| End Game        | `/hangman end`          | Starter only   | End game, reveal word             |
| Leave           | `/hangman leave`        | Non-starters   | Remove from game                  |
| Leave (Starter) | `/hangman leave`        | Starter        | ❌ Blocked                        |
| View Games      | `/games`                | Anyone         | List active games                 |
| View Board      | `/leaderboard`          | Anyone         | Show weekly top 10                |
| View Stats      | `/mystats`              | Anyone         | Show personal stats               |
| Shop            | `/shop`                 | Anyone         | Browse cosmetics                  |
| Buy             | `/buy fire_prefix`      | Anyone         | Purchase item                     |
| Inventory       | `/inventory`            | Anyone         | View owned items                  |

---

**Last Updated**: October 21, 2025  
**Status**: ✅ Complete and Ready for Testing
