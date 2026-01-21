# New Hangman Features - Quick Visual Guide

## 1️⃣ Early Exit (No Points)

```
Scenario: Game in progress but you want to cancel early

BEFORE (Old System):
Player A: /hangman start "MONKEY"
Player B joins
Player A: /hangman end
Result: ❌ Game ends but no message about points

AFTER (New System):
Player A: /hangman start "MONKEY"
Player B joins
Player C joins
After 2 rounds...
Player A: /hangman end

Discord Message:
┌─────────────────────────────────────┐
│ 🛑 Game Cancelled                   │
│ Player A ended the game early.      │
├─────────────────────────────────────┤
│ 📝 The Word Was: MONKEY             │
│ 💡 Status: No points awarded ❌    │
└─────────────────────────────────────┘

✅ Result: Game logged as "cancelled" - no points to anyone
```

---

## 2️⃣ Momentum System (Bonus Guess)

```
Scenario: Player guesses correct letter gets another turn

BEFORE (Old System):
Player A guesses 'E' (correct)
System: "✅ E is in the word!"
→ Turn passes to Player B (no bonus)

AFTER (New System - Momentum!):
Player A guesses 'E' (correct)
System: "✅ E is in the word! (+1 pt, bonus guess!)"
→ Player A gets ANOTHER guess immediately
→ Player A guesses 'A' (correct again)
System: "✅ A is in the word! (+1 pt, bonus guess!)"
→ Player A still has the turn!
→ Player A guesses 'T' (wrong)
System: "❌ T is not in the word."
→ NOW turn passes to Player B

Visual in Discord:
═══════════════════════════════════════════
Round 1: Player A guesses 'E'
Result: ✅ CORRECT
Word: _ _ P L E _
🌟 Bonus Guess! You get another guess!
═══════════════════════════════════════════

Round 1b (Bonus): Player A guesses 'Z'
Result: ❌ WRONG (Mistakes: 1/6)
Turn: → Player B

═══════════════════════════════════════════
```

**Benefits:**

- 🎯 Rewards good guessing
- 🔄 Keeps good players engaged
- ⚡ More exciting gameplay
- 🎮 Like Hot Hands in other games

---

## 3️⃣ Letter Bonus Points (Scrabble-Style)

```
Letter Values (Rarity-Based):

┌──────────────────────────────────┐
│ 💎 RARE LETTERS (High Value)    │
├──────────────────────────────────┤
│ Z = 10 pts   Q = 10 pts         │
│ X = 8 pts    J = 8 pts          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🟡 UNCOMMON (Medium Value)      │
├──────────────────────────────────┤
│ K = 5 pts    W = 4 pts          │
│ F = 4 pts    H = 4 pts          │
│ B = 3 pts    P = 3 pts          │
│ V = 4 pts    G = 2 pts          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🟢 COMMON (Low Value)           │
├──────────────────────────────────┤
│ E = 1 pt     A = 1 pt           │
│ T = 1 pt     R = 1 pt           │
│ O = 1 pt     I = 1 pt           │
│ N = 1 pt     S = 1 pt           │
└──────────────────────────────────┘
```

**Scoring Example:**

```
Game: PUZZLE (6 letters)
Mistakes: 2
Result: WIN ✅

BASE SCORE (Team):
= 100 (base) + (6 × 10 word bonus) - (2 × 20 mistake penalty)
= 100 + 60 - 40
= 120 points

DIVIDE BY 3 PLAYERS:
= 120 ÷ 3 = 40 points base each

LETTER BONUSES (Individual):
Player A guessed: E, L, S
= 1 + 1 + 1 = +3 bonus points
Total: 40 + 3 = 43 points

Player B guessed: U, Z, P
= 1 + 10 + 3 = +14 bonus points ⭐
Total: 40 + 14 = 54 points

Player C guessed: P, Z, E
= 3 + 10 + 1 = +14 bonus points ⭐
Total: 40 + 14 = 54 points

FINAL SCORES DISPLAY:
┌────────────────────────────┐
│ 🎉 Game Won!               │
├────────────────────────────┤
│ 🏆 Final Scores:           │
│ Player B: 54 points ⭐    │
│ Player C: 54 points ⭐    │
│ Player A: 43 points       │
└────────────────────────────┘
```

**Why Rare Letters Matter:**

| Scenario           | Points |
| ------------------ | ------ |
| Guess common 'E'   | +1     |
| Guess rare 'Z'     | +10    |
| Guess uncommon 'K' | +5     |

→ Smart players learn to guess rare letters early!
→ More strategic than just random guessing
→ Rewards word knowledge

---

## Complete Game Flow (All Features)

```
1️⃣  SETUP PHASE
    Player A: /hangman start "COMPUTER"
    [Join Game Button] [Start Game Button]
    Player B clicks Join (now 2/4 players)
    Player C clicks Join (now 3/4 players)
    Player A clicks Start

2️⃣  GAME STARTS (Momentum + Bonuses Active)
    "Random first player: Player C 🎯"
    [A] [B] [C] [D] [E] [F] ... [Z]  ← Letter buttons

3️⃣  ROUND 1: Player C's Turn
    C clicks 'E' ✅ (CORRECT)
    "✅ E is in the word! (+1 pt, bonus guess!)"
    "🌟 Bonus Guess! You get another guess!"

    C clicks 'O' ✅ (CORRECT)
    "✅ O is in the word! (+1 pt, bonus guess!)"
    "🌟 Bonus Guess! You get another guess!"

    C clicks 'Q' ❌ (WRONG)
    "❌ Q is not in the word. Mistakes: 1/6"

    → Turn passes to Player A

4️⃣  ROUND 2: Player A's Turn
    A clicks 'Z' ✅ (CORRECT!)
    "✅ Z is in the word! (+10 pts, bonus guess!)"  ⭐⭐⭐
    "🌟 Bonus Guess! You get another guess!"
    A now has +10 letter bonus!

    A clicks 'T' ❌ (WRONG)
    "❌ T is not in the word. Mistakes: 2/6"

    → Turn passes to Player B

5️⃣  CONTINUES...
    (Similar rounds with momentum and letter bonuses)

6️⃣  GAME ENDS: Word Found!
    "🎉 COMPUTER found!"

    Base Score: 100 + (8×10) - (2×20) = 140 ÷ 3 = 46.67 ≈ 46

    Individual Scores:
    ┌──────────────────────────────┐
    │ 🏆 Final Scores:             │
    │ Player A: 56 pts ⭐         │
    │ (46 base + 10 Z bonus)      │
    │ Player C: 48 pts            │
    │ (46 base + 2 bonus)         │
    │ Player B: 47 pts            │
    │ (46 base + 1 bonus)         │
    └──────────────────────────────┘

OR...

6️⃣  GAME CANCELLED EARLY
    Player A: /hangman end

    ┌──────────────────────────────┐
    │ 🛑 Game Cancelled            │
    │ No points awarded ❌        │
    │ The word was: COMPUTER      │
    └──────────────────────────────┘
```

---

## Key Takeaways

| Feature                 | Benefit              | How It Works                             |
| ----------------------- | -------------------- | ---------------------------------------- |
| **Momentum**            | Rewards good guesses | Correct → bonus guess, Wrong → pass turn |
| **Letter Bonuses**      | Encourages strategy  | Rare letters (Z, Q) worth more pts       |
| **No Points on Cancel** | Fair early exit      | Starter can end game anytime, no rewards |

---

## Testing Checklist

- [ ] Test momentum system (correct guess → bonus guess works?)
- [ ] Test letter bonuses (Z guessed → +10 pts added?)
- [ ] Test final score display (shows individual scores?)
- [ ] Test early end (game cancelled → no points?)
- [ ] Test turn passing (wrong guess → turn passes?)
- [ ] Test disabled buttons (already-guessed letters gray out?)

---

Ready to play! 🎮✨
