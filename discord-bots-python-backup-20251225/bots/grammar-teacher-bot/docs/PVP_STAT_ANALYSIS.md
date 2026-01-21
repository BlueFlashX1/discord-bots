# 📊 PvP Combat & Stat System Integration

## How Stats Affect PvP Combat

### 🎯 Complete Stat Breakdown

Each of the 5 stats has **dual purpose** - they help in grammar gameplay AND in PvP combat:

| Stat              | Grammar Effect          | PvP Effect              | Max Bonus (9 points)     |
| ----------------- | ----------------------- | ----------------------- | ------------------------ |
| 💪 **Durability** | +10 max HP              | Survive more attacks    | 190 HP (vs 100 base)     |
| 🔥 **Efficiency** | +5% points earned       | +2% attack damage       | +18% damage              |
| ⚡ **Learning**   | +5% XP earned           | +1% dodge chance        | 14% dodge (5% base + 9%) |
| 🛡️ **Resilience** | -5% HP loss from errors | -3% incoming PvP damage | -27% damage taken        |
| 💎 **Fortune**    | 3% shop discount        | +1% critical hit chance | 14% crit (5% base + 9%)  |

---

## 🔢 Combat Math Examples

### Example 1: Unmodded Players (No Stats Allocated)

**Attacker:** Level 5, no stats  
**Defender:** Level 3, no stats

```
ATTACKER'S TURN:
├─ Base Damage: 15 + (5 × 2) = 25
├─ Efficiency Bonus: ×1.0 (no points allocated)
├─ Variance Roll: ×1.0 (average luck)
├─ Raw Damage: 25
│
├─ DEFENDER CALCULATION:
│  ├─ Resilience: ×1.0 (no defense)
│  └─ Final Damage: 25
│
├─ Crit Check: 5% chance → MISS
├─ Dodge Check: 5% chance → MISS
│
└─ RESULT:
   ├─ Defender takes 25 damage
   ├─ Attacker earns 12 points (25 ÷ 2)
   └─ Attacker loses 10 HP (stamina)
```

---

### Example 2: Berserker vs Tank

**Attacker:** Level 10, **9 Efficiency** (max damage build)  
**Defender:** Level 10, **9 Resilience** (max defense build)

```
ATTACKER'S TURN:
├─ Base Damage: 15 + (10 × 2) = 35
├─ Efficiency Bonus: ×1.18 (+18% from 9 points)
├─ Variance Roll: ×1.1 (good RNG)
├─ Raw Damage: 35 × 1.18 × 1.1 = 45
│
├─ DEFENDER CALCULATION:
│  ├─ Resilience: ×0.73 (-27% from 9 points)
│  └─ Final Damage: 45 × 0.73 = 33
│
├─ Crit Check: 5% chance → MISS
├─ Dodge Check: 5% chance → MISS
│
└─ RESULT:
   ├─ Tank takes 33 damage (absorbed 12!)
   ├─ Berserker earns 16 points
   └─ Berserker loses 10 HP
```

**Analysis:**

- Berserker's 9 Efficiency added +10 damage (+18% boost)
- Tank's 9 Resilience blocked -12 damage (-27% reduction)
- Net effect: Tank survived significantly better than undefended player (33 vs 45)

---

### Example 3: Critical Hit Build

**Attacker:** Level 8, **6 Fortune, 3 Efficiency**  
**Defender:** Level 6, no stats

```
ATTACKER'S TURN:
├─ Base Damage: 15 + (8 × 2) = 31
├─ Efficiency Bonus: ×1.06 (+6% from 3 points)
├─ Variance Roll: ×1.0
├─ Raw Damage: 31 × 1.06 = 33
│
├─ DEFENDER CALCULATION:
│  ├─ Resilience: ×1.0 (no defense)
│  └─ Pre-Crit Damage: 33
│
├─ Crit Check: 11% chance (5% base + 6%) → **HIT! 💥**
│  └─ Critical Multiplier: ×1.5
│
├─ Dodge Check: 5% chance → MISS
│
└─ RESULT:
   ├─ Defender takes **49 damage** (33 × 1.5) 💥
   ├─ Attacker earns 24 points
   └─ Massive damage spike!
```

**Analysis:**

- 6 Fortune = 11% crit chance (up from 5% base)
- When crit triggers: 1.5× damage multiplier
- Turned 33 damage into 49 damage (+48% spike!)
- High risk, high reward playstyle

---

### Example 4: Evasion Tank

**Attacker:** Level 10, **9 Efficiency**  
**Defender:** Level 10, **6 Learning, 3 Resilience**

```
ATTACKER'S TURN:
├─ Base Damage: 15 + (10 × 2) = 35
├─ Efficiency Bonus: ×1.18
├─ Variance Roll: ×1.0
├─ Raw Damage: 35 × 1.18 = 41
│
├─ DEFENDER CALCULATION:
│  ├─ Resilience: ×0.91 (-9% from 3 points)
│  └─ Pre-Dodge Damage: 41 × 0.91 = 37
│
├─ Crit Check: 5% → MISS
├─ Dodge Check: 11% (5% base + 6%) → **HIT! 💨**
│  └─ Dodge Result: 0 damage
│
└─ RESULT:
   ├─ Defender takes **0 damage** (dodged!)
   ├─ Attacker earns 0 points
   └─ Attacker still loses 10 HP (stamina cost)
```

**Analysis:**

- 6 Learning = 11% dodge chance (doubled from 5% base)
- When dodge triggers: Complete damage negation
- Attacker wasted 10 HP and got nothing
- ~1 in 9 attacks will be dodged at this rate

---

### Example 5: Balanced Build vs Balanced Build

**Both Players:** Level 7, **2 Durability, 2 Efficiency, 2 Resilience, 2 Learning, 1 Fortune**

**Player A Attacks:**

```
├─ Base: 15 + (7 × 2) = 29
├─ Efficiency: ×1.04 (+4% from 2 points)
├─ Raw: 29 × 1.04 = 30
├─ Resilience Defense: ×0.94 (-6% from 2 points)
├─ Final: 30 × 0.94 = 28
├─ Crit: 6% chance (5% + 1%)
├─ Dodge: 7% chance (5% + 2%)
└─ Expected: ~26 damage per hit (accounting for dodge chance)
```

**Analysis:**

- Both players have 120 HP (vs 100 base) from 2 Durability
- Combat is fairly even with slight variations from RNG
- Multiple attacks needed to win
- Versatile stats help in grammar AND combat

---

## 🎯 Stat Efficiency in PvP

### Offensive Stats (Attacker)

**Efficiency (Damage):**

```
Points → Bonus → Example (Level 10, base 35 dmg)
1 → +2%  → 35.7 damage (+0.7)
3 → +6%  → 37.1 damage (+2.1)
5 → +10% → 38.5 damage (+3.5)
9 → +18% → 41.3 damage (+6.3)
```

**Fortune (Crit Chance):**

```
Points → Crit % → Expected Damage Boost
1 → 6%   → +3% average damage
3 → 8%   → +4% average damage
5 → 10%  → +5% average damage
9 → 14%  → +7% average damage
```

_Note: 1.5× damage on crit, so 14% crit = 7% average boost (14% × 50%)_

### Defensive Stats (Defender)

**Resilience (Damage Reduction):**

```
Points → Reduction → Example (35 dmg incoming)
1 → -3%  → 34.0 damage (-1)
3 → -9%  → 31.9 damage (-3.1)
5 → -15% → 29.8 damage (-5.2)
9 → -27% → 25.6 damage (-9.4)
```

**Learning (Dodge):**

```
Points → Dodge % → Effective HP Multiplier
1 → 6%   → ×1.06 (6% of attacks miss)
3 → 8%   → ×1.09 (9% of attacks miss)
5 → 10%  → ×1.11 (11% of attacks miss)
9 → 14%  → ×1.16 (16% of attacks miss)
```

**Durability (HP Pool):**

```
Points → Max HP → Attacks Survived (vs 30 dmg)
0 → 100 → 3.3 attacks
3 → 130 → 4.3 attacks (+30%)
6 → 160 → 5.3 attacks (+60%)
9 → 190 → 6.3 attacks (+90%)
```

---

## 🏆 Build Matchups

### Who Wins? (Both Level 10, 100 HP Start)

#### Berserker (9 Efficiency) vs Tank (9 Resilience)

**Berserker Stats:**

- 100 HP
- 41 avg damage per hit
- Takes 35 damage per hit from tank

**Tank Stats:**

- 100 HP
- 25 avg damage per hit
- Takes 30 damage per hit from berserker

**Simulation:**

```
Round 1: Both at 100 HP
├─ Berserker attacks → Tank at 70 HP
└─ Tank attacks → Berserker at 75 HP

Round 2:
├─ Berserker attacks → Tank at 40 HP
└─ Tank attacks → Berserker at 50 HP

Round 3:
├─ Berserker attacks → Tank at 10 HP
└─ Tank attacks → Berserker at 25 HP

Round 4:
└─ Berserker attacks → Tank at -20 HP (DEAD)

WINNER: Berserker (survives with 25 HP)
```

---

#### Durability Tank (9 Durability) vs Resilience Tank (9 Resilience)

**Durability Tank:**

- 190 HP (+90 from stats)
- 35 base damage
- Takes 25 damage per hit (resilience tank's low damage)

**Resilience Tank:**

- 100 HP
- 35 base damage
- Takes 35 damage per hit (no reduction)

**Simulation:**

```
Durability Tank survives: 190 ÷ 25 = 7.6 hits
Resilience Tank survives: 100 ÷ 35 = 2.9 hits

WINNER: Durability Tank (much tankier!)
```

**Lesson:** Raw HP beats damage reduction when both players do similar damage.

---

#### Critical Build (9 Fortune) vs Evasion Build (9 Learning)

**Critical Build:**

- 14% crit chance
- 35 base damage → 52.5 on crit
- Average: 37.6 damage per hit

**Evasion Build:**

- 14% dodge chance
- 35 base damage
- Effective HP: 100 ÷ (1 - 0.14) = 116 effective HP

**Expected Outcome:**

```
Crit player needs: 116 ÷ 37.6 = 3.1 hits to kill
Dodge player needs: 100 ÷ 35 = 2.9 hits to kill

WINNER: Dodge Build (slightly favored)
```

**Note:** Heavily RNG-dependent! Crit player could get lucky and win in 2 hits, or unlucky and take 5 hits.

---

## 💡 Advanced Strategies

### Multi-Battle Considerations

**HP Regeneration:**

- 10 HP per hour
- Durability builds can attack more frequently
- High-damage builds need rest between battles

**Point Efficiency:**

```
Berserker earns: ~20 points per attack (high damage)
Tank earns: ~12 points per attack (low damage)
Balanced earns: ~15 points per attack

Over 10 battles:
- Berserker: 200 points (if they win)
- Tank: 120 points (slower but consistent)
```

### Counter-Building

**If enemy has:**

- High Efficiency → Build Resilience or Dodge
- High Fortune → Build Durability (survive crits)
- High Resilience → Build Fortune + Efficiency (need burst)
- High Learning → Build Efficiency (dodge doesn't matter if you 2-shot)
- High Durability → Build Efficiency + Fortune (need sustained damage)

### Optimal Allocation

**For Pure PvP Dominance:**

1. **Early Game (Levels 1-5):** 3 Efficiency, 2 Durability
   - Win fights quickly, decent HP
2. **Mid Game (Levels 6-8):** Add 2 Fortune, 1 Resilience
   - Crits start mattering, some defense
3. **Late Game (Level 9-10):** Maximize damage or survivability
   - Either 9 Efficiency OR 5 Durability + 4 Resilience

**For Balanced Gameplay (Grammar + PvP):**

- 3 Learning (XP boost + dodge)
- 3 Efficiency (points + damage)
- 2 Durability (HP buffer)
- 1 Resilience (minor defense)

---

## 🎲 RNG Impact

### Variance Explained

Every attack has randomness:

- **Damage Variance:** 80-120% (±20%)
- **Crit Chance:** 5-14% depending on Fortune
- **Dodge Chance:** 5-14% depending on Learning

**Example: Level 10, 9 Efficiency vs Level 10, No Stats**

**Best Case (Lucky RNG):**

```
35 base × 1.18 efficiency × 1.2 variance = 49 damage
× 1.5 crit = 73 damage 💥💥💥
```

**Worst Case (Unlucky RNG):**

```
35 base × 1.18 efficiency × 0.8 variance = 33 damage
→ Gets dodged = 0 damage 💨
```

**Average:**

```
~41 damage per hit (factoring all probabilities)
```

### Consistency vs Burst

**Efficiency Build:** Consistent damage every hit  
**Fortune Build:** Spiky damage (high variance)  
**Resilience Build:** Consistent survival  
**Learning Build:** Spiky survival (dodge or die)

---

## 📈 Stat Value Rankings (PvP Only)

**For Winning Fights:**

1. **Efficiency** - Direct damage increase, always useful
2. **Durability** - More HP = more attacks survived
3. **Fortune** - Burst damage potential, fight-ending crits
4. **Resilience** - Good defensive option
5. **Learning** - RNG-based survival, unreliable

**For Long-Term PvP:**

1. **Durability** - Sustain multiple battles per day
2. **Efficiency** - More points per victory
3. **Resilience** - Reduce damage accumulation
4. **Fortune** - Occasional huge wins
5. **Learning** - Least useful for prolonged combat

**My Recommendation:**

- **Best Overall:** 5 Efficiency, 4 Durability (balanced damage + HP)
- **Best Tank:** 6 Durability, 3 Resilience (survive everything)
- **Best Damage:** 7 Efficiency, 2 Fortune (high consistent damage + crits)
- **Best Fun:** 9 Fortune (live for the crits!)

---

## 🎯 Summary

**How It Works:**

1. Your allocated stats **directly modify** combat calculations
2. Attacker's stats boost damage/crits
3. Defender's stats reduce damage/add dodge
4. Same stats help in grammar AND PvP (dual benefit!)
5. Build diversity creates interesting matchups

**Key Takeaway:**
Every stat point you allocate affects BOTH your grammar gameplay (points/XP/HP) AND your PvP performance (damage/defense/crits/dodge). Choose wisely! ⚔️
