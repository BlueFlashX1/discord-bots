# Hangman Gameplay Mechanics Design

## Question 1: Early Exit & Point System

### Current Problem

- No way to leave if no one joins
- No mechanism to stop mid-game without points being awarded
- Starter forced to wait or end game prematurely

### Solution: Early Exit & Timeout System

**Scenario 1: Start but no one joins (Timeout)**

```
Timeline:
- Player A starts game with /hangman start "computer"
- Waits 3 minutes... no one joins
- Game auto-cancels with: "Game cancelled due to inactivity (no players joined)"
- No points awarded to anyone
- Game deleted from active games
```

**Scenario 2: Mid-game exit (Early End - No Points)**

```
- Player A starts game with Player B and C
- After a few guesses, Player A wants to end early: /hangman end
- Message: "Game ended by starter - no points awarded"
- Game state: "cancelled"
- No one gets points
- Game cleaned up
```

**Scenario 3: Normal completion (Points Awarded)**

- Game won: All players get points based on performance
- Game lost: No one gets points (but stats still tracked)

### Implementation Details

- **Lobby timeout**: 5 minutes (can be configured)
- **Abandoned game**: If starter leaves mid-game → auto-end → no points
- **Points awarded**: ONLY if game reaches "won" state
- **Tracking**: Losses and abandoned games tracked for stats but no point rewards

---

## Question 2: Fairness - Turn Mechanics

### Option A: Pass on ANY guess (Current System)

```
Player A guesses 'E' → Correct → Turn passes to Player B
Player B guesses 'A' → Wrong → Turn passes to Player C
Player C guesses 'R' → Correct → Turn passes to Player A

Effect: More democratic, everyone has equal contribution chances
```

### Option B: Keep playing if correct

```
Player A guesses 'E' → Correct → Player A gets ANOTHER guess
Player A guesses 'A' → Wrong → Turn passes to Player B
Player B guesses 'R' → Correct → Player B gets ANOTHER guess

Effect: Rewards good guessing, luck-based advantage for hot players
```

### Recommendation: **HYBRID - "Momentum System"**

**Best Balance of Fair + Fun:**

```
Rule: One correct guess = one automatic bonus guess (no turn pass)
      One wrong guess = turn passes to next player immediately

Example Game Flow:
1. Player A guesses 'E' (correct) → Gets immediate bonus guess
2. Player A guesses 'A' (wrong) → Turn passes to Player B
3. Player B guesses 'R' (correct) → Gets immediate bonus guess
4. Player B guesses 'O' (wrong) → Turn passes to Player C

Benefits:
✅ Rewards skill/luck equally
✅ Momentum-based (exciting!)
✅ Fair: everyone gets chances
✅ Interactive: keeps good players engaged
✅ Strategic: players learn probability
```

**Point Distribution (Momentum System):**

```
Base game win = 100 points (shared by all players)

Individual bonuses:
- Correct guess: +10 points (per correct letter)
- Bonus guess (due to correct): +5 points
- Perfect game (0 mistakes): +50 points bonus (all players)
- Word length: Base + (length × 10) shared by all

Example: 6-letter word, 2 mistakes, Player A got 3 correct + 1 bonus
- Team share: 100 + (6×10) - (2×20) = 120 points base
- Player A gets: 30 + (3×10) + (1×5) = 65 points
- Other players split remaining: 55 points combined
```

---

## Question 3: Letter Point System (Scrabble-Style)

### Concept: Rare Letters Worth More

**Letter Values (Based on Scrabble + Game Difficulty):**

```
High-Value (Rare) Letters:
Z = 10 points    Q = 10 points    X = 8 points
J = 8 points     K = 5 points     V = 4 points

Mid-Value (Less Common):
W = 4 points     Y = 4 points     B = 3 points
F = 4 points     G = 2 points     H = 4 points
C = 3 points     P = 3 points

Low-Value (Common):
D = 1 point      L = 1 point      S = 1 point
T = 1 point      N = 1 point      E = 1 point
A = 1 point      I = 1 point      O = 1 point
U = 1 point      R = 1 point      M = 1 point

Vowels:
A, E, I, O, U = 1-2 points each (strategic but common)
```

### Implementation in Hangman:

**Scoring Formula:**

```
Total Game Points = Base Game Points + Letter Difficulty Bonus

Base Game Points (all players share):
- Win: 100 points
- Word length: word_length × 10
- Perfect game: +50 bonus
- Mistakes penalty: -mistakes × 20

Letter Difficulty Bonus (individual):
- Each correct letter guess: +letter_value
- If player guesses Z and it's in word: +10 points
- If player guesses A and it's in word: +1 point

Example: Player guesses rare letter 'Z' correctly
- Base win points shared with team
- PLUS +10 bonus for guessing rare letter
```

### Example Game Calculation:

```
Word: "PUZZLE" (6 letters, 2 mistakes, game won)

Base Points (shared by all 3 players):
= 100 (base) + (6 × 10) - (2 × 20)
= 100 + 60 - 40
= 120 points base (divided by 3 = 40 each)

Individual Letters Guessed:
Player A: E(1), L(1), S(1) = 3 points bonus → 40 + 3 = 43 total
Player B: U(2), Z(10), P(3) = 15 points bonus → 40 + 15 = 55 total
Player C: P(3), Z(10), E(1) = 14 points bonus → 40 + 14 = 54 total

Total distributed: 43 + 55 + 54 = 152 points
(120 base + 32 letter bonuses)
```

### Why This System Works:

✅ **Rewards skill**: Guessing rare letters shows game knowledge
✅ **Fair**: Everyone still gets base points even if guessing common letters
✅ **Engaging**: Adds strategy (guess uncommon letters more?)
✅ **Scalable**: Works with any word difficulty
✅ **Competitive**: Individual skill differentiation shown in points
✅ **Psychology**: Makes lucky guesses feel more rewarding

---

## Summary: Recommended Implementation

### Mechanic Choices:

1. **Exit System**: Auto-timeout (5 min) + /hangman end with no points
2. **Turn System**: HYBRID (one bonus guess if correct, else pass turn)
3. **Points**: Base team points + individual letter rarity bonuses

### Implementation Steps:

1. Add `letter_values` dictionary to game.py
2. Modify `guess_letter()` to return letter value
3. Implement turn logic: if correct → don't pass turn, add bonus guess
4. Modify `calculate_score()` to include individual letter bonuses
5. Track individual player contributions
6. Update views.py to show individual scores at end
7. Add timeout handler for inactive games
8. Update /hangman end to check if mid-game → no points
