# Hangman Bot - Testing Guide

Complete testing checklist for the Hangman Discord bot.

---

## Pre-Testing Setup

### 1. Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your credentials
DISCORD_TOKEN=your_hangman_bot_token
CLIENT_ID=your_client_id
OPENAI_API_KEY=your_openai_key_here  # Optional for hints
MONGODB_URI=mongodb://localhost:27017/hangman-bot  # Optional
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Commands

```bash
npm run deploy
```

### 4. Start Bot

```bash
npm start
```

---

## Test Cases

### ✅ Test 1: Bot Startup

**Expected:**
- ✅ Bot connects to Discord
- ✅ Database connection successful (MongoDB or JSON fallback)
- ✅ Weekly reset scheduler starts
- ✅ Shop items initialized
- ✅ No errors in console

**Commands:**
```bash
npm start
```

**Verify Console Output:**
```
✅ Database: MongoDB (or JSON files)
✅ Shop initialized with 5 items
📅 Weekly reset scheduler started
🤖 Logged in as HangmanBot#1234
```

---

### ✅ Test 2: Start Game (`/hangman start`)

**Steps:**
1. Run `/hangman start word:TESTING`
2. Check ephemeral reply to starter
3. Check public waiting room message

**Expected:**
- ✅ Ephemeral confirmation to starter showing word
- ✅ Public message with:
  - Waiting room embed
  - Join button
  - Start button
  - Word length display (hidden word)
  - Player count: 1/4

**Error Cases:**
- ❌ Empty word → "Word cannot be empty"
- ❌ Numbers in word → "Word can only contain letters"
- ❌ Word too short (< 3) → "Word must be at least 3 characters"
- ❌ Active game exists → "A game is already active in this channel"

---

### ✅ Test 3: Join Game (Button)

**Steps:**
1. Start a game with User A
2. Click "Join Game" button as User B
3. Click "Join Game" button as User C
4. Try joining as User A again

**Expected:**
- ✅ User B joins successfully
- ✅ User C joins successfully
- ✅ Waiting room updates to show 3/4 players
- ❌ User A cannot join twice → "Already joined this game"

**Edge Cases:**
- Try joining with 4 players already → "Game is full"
- Wait >1 minute and try joining → "Join period has ended"

---

### ✅ Test 4: Start Game (Button)

**Steps:**
1. Start game with User A (starter)
2. Have User B join
3. Click "Start Game" as User B
4. Click "Start Game" as User A

**Expected:**
- ❌ User B cannot start → "Only the game starter can begin the game"
- ✅ User A starts successfully
- ✅ Game state changes to "active"
- ✅ Message updates to show game board
- ✅ Buttons disappear
- ✅ Hangman visual shows empty gallows

---

### ✅ Test 5: Guess Letter (`/hangman guess`)

**Setup:** Start game with word "TESTING"

**Test Correct Guesses:**
1. `/hangman guess letter:T` → Should reveal T's
2. `/hangman guess letter:E` → Should reveal E's
3. `/hangman guess letter:S` → Should reveal S

**Expected:**
- ✅ Embed shows "✅ Correct!"
- ✅ Letters revealed in word display
- ✅ Guessed letters list updates
- ✅ Mistake count stays at 0

**Test Incorrect Guesses:**
1. `/hangman guess letter:X` → Wrong
2. `/hangman guess letter:Z` → Wrong

**Expected:**
- ✅ Embed shows "❌ Wrong!"
- ✅ Hangman visual updates (body part added)
- ✅ Mistake count increases
- ✅ Game continues

**Error Cases:**
- Try guessing same letter twice → "Letter already guessed"
- Try guessing as non-player → "You are not in this game"
- Try multi-character guess → "Must be a single letter"
- Try number → "Must be a single letter"

---

### ✅ Test 6: Win Game

**Setup:** Start game with word "CAT"

**Steps:**
1. `/hangman guess letter:C`
2. `/hangman guess letter:A`
3. `/hangman guess letter:T`

**Expected:**
- ✅ Game state changes to "won"
- ✅ "🎉 Game Won!" embed appears
- ✅ The word is revealed
- ✅ Points calculated and displayed
- ✅ All players receive points
- ✅ Player stats updated (gamesPlayed +1, gamesWon +1, weeklyPoints +points)

**Verify Database:**
- Check player stats were updated
- Check game was removed from active games

---

### ✅ Test 7: Lose Game

**Setup:** Start game with word "TESTING"

**Steps:**
1. Guess 6 wrong letters: X, Z, Q, W, K, J

**Expected:**
- ✅ Mistake count reaches 6/6
- ✅ Game state changes to "lost"
- ✅ "💀 Game Over!" embed appears
- ✅ The word is revealed
- ✅ No points awarded
- ✅ Player stats updated (gamesPlayed +1, gamesWon +0)

---

### ✅ Test 8: End Game (`/hangman end`)

**Steps:**
1. Start a game as User A
2. Try `/hangman end` as User B
3. Run `/hangman end` as User A

**Expected:**
- ❌ User B cannot end → "Only the game starter can end the game"
- ✅ User A ends successfully
- ✅ Game cancelled message appears
- ✅ Word revealed
- ✅ No points awarded

---

### ✅ Test 9: List Active Games (`/games`)

**Steps:**
1. Start 2-3 games in different channels
2. Run `/games` from any channel

**Expected:**
- ✅ Embed shows all active games
- ✅ Each game shows:
  - Channel name
  - Status (waiting/in progress)
  - Starter username
  - Player list
  - Word display
  - Mistake count
- ✅ No active games → "📭 No active games right now"

---

### ✅ Test 10: View Statistics (`/mystats`)

**Steps:**
1. Play a few games (some wins, some losses)
2. Run `/mystats`
3. Run `/mystats user:@OtherUser`

**Expected:**
- ✅ Embed shows:
  - Weekly points + rank
  - Total points
  - Games played/won
  - Win rate percentage
  - Accuracy (if implemented)
  - Active cosmetics
  - Inventory count
- ✅ Other user's stats displayed correctly
- ✅ New player → "📭 You haven't played any games yet!"

---

### ✅ Test 11: Weekly Leaderboard (`/leaderboard`)

**Steps:**
1. Have multiple players play games
2. Run `/leaderboard`
3. Run `/leaderboard type:total`
4. Run `/leaderboard type:winrate`

**Expected:**
- ✅ Weekly leaderboard shows top 10 by weekly points
- ✅ Total leaderboard shows all-time points
- ✅ Win rate leaderboard shows players with 5+ games
- ✅ Medals displayed (🥇🥈🥉)
- ✅ Prefixes shown for players who have them
- ✅ User's rank shown if outside top 10
- ✅ Time until reset displayed

---

### ✅ Test 12: Shop System (`/shop`)

**Steps:**
1. Run `/shop`
2. Run `/shop category:prefix`
3. Run `/shop category:theme`

**Expected:**
- ✅ All items displayed with prices
- ✅ User's points shown
- ✅ Items grouped by category
- ✅ Affordable items marked ✅
- ✅ Unaffordable items marked ❌
- ✅ Footer shows how to purchase

---

### ✅ Test 13: Purchase Item (`/buy`)

**Steps:**
1. Earn points by playing
2. Run `/buy item:fire_prefix`
3. Try buying same item again
4. Try buying expensive item without points

**Expected:**
- ✅ Purchase successful → Confirmation embed
- ✅ Points deducted from weekly balance
- ✅ Item added to inventory
- ❌ Already owned → "Item already owned"
- ❌ Insufficient points → "Insufficient points. You have X, need Y"
- ✅ Autocomplete shows available items

---

### ✅ Test 14: Inventory (`/inventory`)

**Steps:**
1. Purchase several items
2. Run `/inventory`
3. Run `/inventory user:@OtherUser`

**Expected:**
- ✅ All owned items displayed
- ✅ Grouped by type (Prefixes, Themes, etc.)
- ✅ Active cosmetics marked with ⭐
- ✅ Current weekly points shown
- ✅ Empty inventory → "No items yet. Visit the shop!"

---

### ✅ Test 15: Weekly Reset

**Manual Test:**
```bash
# In Node.js REPL or test script
const WeeklyReset = require('./utils/weeklyReset');
const { Player } = require('./database/db').getDatabase();

const reset = new WeeklyReset(Player);
reset.forceResetAll().then(count => {
  console.log(`Reset ${count} players`);
});
```

**Expected:**
- ✅ All players' weekly points reset to 0
- ✅ lastWeeklyReset updated to current Monday
- ✅ Scheduler runs every hour
- ✅ Automatic reset on Monday 00:00

**Verify:**
- Check player stats before/after
- Check leaderboard clears

---

### ✅ Test 16: Data Migration

**Steps:**
```bash
# Preview migration
npm run migrate:preview

# Run migration
npm run migrate:run

# Verbose mode
npm run migrate:verbose
```

**Expected:**
- ✅ Python JSON file loaded successfully
- ✅ Player count correct
- ✅ Sample data shown
- ✅ Backup created in `backups/` folder
- ✅ All fields migrated correctly:
  - userId → userId (string)
  - username → username
  - weekly_points → weeklyPoints
  - total_points → totalPoints
  - games_played → gamesPlayed
  - games_won → gamesWon
  - shop_items → shopItems (transformed)
  - prefix → activePrefix (transformed)
  - theme → activeTheme
- ✅ Summary shows correct stats

---

## Performance Tests

### Test 17: Concurrent Games

**Steps:**
1. Start games in 5 different channels simultaneously
2. Have players guess letters rapidly
3. Monitor console for errors

**Expected:**
- ✅ All games run independently
- ✅ No database conflicts
- ✅ No race conditions
- ✅ Correct stats updates

---

### Test 18: Large Shop Inventory

**Steps:**
1. Purchase 10+ items
2. Run `/inventory`
3. Run `/shop`

**Expected:**
- ✅ Fast response times (< 2 seconds)
- ✅ No truncation issues
- ✅ Proper pagination if needed

---

### Test 19: Weekly Reset with Many Players

**Setup:** Create 50+ test players

**Expected:**
- ✅ Reset completes < 10 seconds
- ✅ All players reset correctly
- ✅ No database timeouts

---

## Error Handling Tests

### Test 20: Database Failure

**Steps:**
1. Stop MongoDB (if using)
2. Try commands

**Expected:**
- ✅ Automatic fallback to JSON storage
- ✅ No crashes
- ✅ User-friendly error messages

---

### Test 21: Invalid Commands

**Test:**
- `/hangman start` (no word)
- `/hangman guess` (no letter)
- `/buy` (no item)

**Expected:**
- ✅ Discord shows "Required option" error
- ✅ No bot errors

---

### Test 22: Permission Errors

**Steps:**
1. Try `/hangman end` as non-starter
2. Try starting game in read-only channel

**Expected:**
- ✅ Clear permission denied messages
- ✅ No crashes

---

## Integration Tests

### Test 23: Full Game Flow

**End-to-end test:**
1. Start game
2. Have 3 players join
3. Start the game
4. Play until win
5. Check leaderboard
6. Purchase shop item
7. View inventory
8. Start new game

**Expected:**
- ✅ All steps work seamlessly
- ✅ Points persist across games
- ✅ Shop items available
- ✅ Leaderboard updates

---

## Regression Tests

After any code changes, run:

### Quick Regression Suite

```bash
# Test all commands
/hangman start word:TEST
/hangman guess letter:T
/hangman end
/games
/leaderboard
/mystats
/shop
/buy item:fire_prefix
/inventory
```

**Expected:** All work without errors

---

## Testing Checklist

- [ ] Bot starts without errors
- [ ] All 7 commands deployed
- [ ] Start game works
- [ ] Join/start buttons work
- [ ] Guessing works (correct/incorrect)
- [ ] Win condition triggers
- [ ] Lose condition triggers
- [ ] End game works
- [ ] Games list works
- [ ] Stats display works
- [ ] Leaderboard works (all 3 types)
- [ ] Shop displays correctly
- [ ] Purchasing works
- [ ] Inventory works
- [ ] Migration script works
- [ ] Weekly reset works
- [ ] Concurrent games work
- [ ] Error handling works
- [ ] Database fallback works

---

## Bug Reporting

If you find issues:

1. **Console errors:** Copy full stack trace
2. **Command used:** Exact command with options
3. **Expected behavior:** What should happen
4. **Actual behavior:** What actually happened
5. **Database type:** MongoDB or JSON
6. **Environment:** Development or production

---

## Performance Benchmarks

**Target metrics:**
- Command response: < 500ms
- Database queries: < 100ms
- Migration: < 5 seconds for 100 players
- Weekly reset: < 10 seconds for 1000 players

---

**Testing completed! ✅**
