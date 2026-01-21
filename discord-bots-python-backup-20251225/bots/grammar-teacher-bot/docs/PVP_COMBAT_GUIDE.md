# ⚔️ PvP Combat System Guide

## Overview

The PvP (Player vs Player) combat system lets you attack other Grammar Bot users in epic battles! Use your stats strategically to dominate opponents and climb the PvP rankings.

## How to Attack

### Using the `/attack` Command

```
/attack target:<@user> attack_type:<type>
```

**Attack Types:**

- ⚔️ **Grammar Strike** (default) - Classic grammar-based attack
- ✏️ **Spelling Slam** - Spelling-focused assault
- 📌 **Punctuation Punch** - Punctuation-powered strike

**Examples:**

```
/attack target:@friend attack_type:Grammar Strike
/attack target:@rival attack_type:Spelling Slam
```

## Combat Mechanics

### Attack Requirements

- **Minimum HP:** 20 HP to initiate attack
- **Stamina Cost:** Every attack costs 10 HP (win or lose)
- **No Self-Attack:** You can't attack yourself

### Damage Calculation

**Base Damage Formula:**

```
Base Damage = 15 + (Your Level × 2)
```

**Attack Multiplier:**

```
Attack Power = Base × (1.0 + Efficiency Stat × 0.02) × Random(0.8 to 1.2)
```

**Defense Reduction:**

```
Final Damage = Attack Power × (1.0 - Defender's Resilience × 0.03)
Minimum Damage: 5 HP
```

### Special Mechanics

#### 💥 Critical Hits

- **Base Chance:** 5%
- **Fortune Bonus:** +1% per fortune point
- **Effect:** 1.5× damage (50% bonus)
- **Example:** 9 fortune = 14% crit chance

#### 💨 Dodges

- **Base Chance:** 5%
- **Learning Bonus:** +1% per learning point
- **Effect:** Completely avoid all damage
- **Example:** 9 learning = 14% dodge chance

### Rewards & Costs

**If Attack Hits:**

- Earn points = Damage dealt ÷ 2
- Example: 30 damage = 15 points earned
- You lose 10 HP (stamina cost)
- Opponent loses HP equal to damage

**If Attack Dodged:**

- No points earned
- You still lose 10 HP (stamina cost)
- Opponent takes no damage

**Victory (Opponent reaches 0 HP):**

- +1 PvP Win recorded
- Opponent gets +1 PvP Loss
- Bonus victory points (coming soon!)

## Stat Synergies for PvP

### 🔥 Efficiency (Offensive)

- **Effect:** +2% attack damage per point
- **Max Bonus:** +18% damage at 9 points
- **Best For:** Pure damage dealers

### 🛡️ Resilience (Defensive)

- **Effect:** -3% incoming damage per point
- **Max Reduction:** -27% damage at 9 points
- **Best For:** Tanks who want to survive

### 💎 Fortune (Critical Strikes)

- **Effect:** +1% crit chance per point
- **Max Bonus:** 14% crit chance at 9 points (5% base + 9%)
- **Best For:** High-risk, high-reward players

### ⚡ Learning (Evasion)

- **Effect:** +1% dodge chance per point
- **Max Bonus:** 14% dodge chance at 9 points
- **Best For:** Agile fighters who avoid damage

### 💪 Durability (Survivability)

- **Effect:** +10 max HP per point
- **Max Bonus:** 190 max HP at 9 points
- **Best For:** Prolonged battles, tanking multiple attacks

## PvP Build Strategies

### ⚔️ Berserker Build (Glass Cannon)

**Stats:**

- 9 Efficiency (max damage)
- 0 Resilience (no defense)

**Playstyle:** Maximum offense, one-shot potential
**Pros:** Highest damage output
**Cons:** Vulnerable to counterattacks

### 🛡️ Tank Build (Unkillable)

**Stats:**

- 5 Durability (150 HP)
- 4 Resilience (-12% damage)

**Playstyle:** Outlast opponents in wars of attrition
**Pros:** Extremely hard to kill
**Cons:** Lower damage, slow kills

### 💥 Critical Build (Lucky Strikes)

**Stats:**

- 6 Fortune (11% crit chance)
- 3 Efficiency (+6% damage)

**Playstyle:** Rely on critical hits for burst damage
**Pros:** Explosive damage spikes
**Cons:** RNG-dependent

### 💨 Evasion Build (Untouchable)

**Stats:**

- 6 Learning (11% dodge)
- 3 Resilience (-9% damage)

**Playstyle:** Dodge attacks and wear opponents down
**Pros:** High survival through evasion
**Cons:** Relies on luck

### ⚖️ Balanced Build (Jack of All Trades)

**Stats:**

- 3 Efficiency (+6% damage)
- 2 Resilience (-6% damage taken)
- 2 Durability (120 HP)
- 2 Fortune (7% crit)

**Playstyle:** Flexible, no major weaknesses
**Pros:** Good at everything
**Cons:** Master of nothing

## PvP Statistics Tracking

Your combat performance is tracked in `/profile`:

```
⚔️ PvP Combat:
• W/L: 15/8 (65% win rate)
• Damage Dealt: 1,247
• Damage Taken: 892
```

### Tracked Stats

- **Wins:** Total victories (opponent HP → 0)
- **Losses:** Total defeats (your HP → 0)
- **Win Rate:** Percentage of battles won
- **Damage Dealt:** Total damage inflicted on opponents
- **Damage Taken:** Total damage received from opponents

## Advanced Tactics

### 1. **HP Management**

- Keep HP above 20 to always be ready to attack
- Use HP Potions from shop before big fights
- Let HP regenerate (10 HP/hour) between battles

### 2. **Target Selection**

- Attack lower-level players for easier wins
- Challenge higher-level players for prestige
- Avoid players with high resilience if you're low damage

### 3. **Timing Attacks**

- Attack when opponents are low HP (check `/profile`)
- Wait for your HP to regenerate before attacking
- Strike after opponent uses stamina on someone else

### 4. **Build Counters**

- **vs. Tank:** Use high efficiency + fortune for crits
- **vs. Glass Cannon:** Use resilience to reduce their damage
- **vs. Evasion:** High attack volume (they can't dodge forever)
- **vs. Critical:** Use durability to survive lucky crits

## PvP Etiquette & Rules

### Allowed:

✅ Attacking anyone in the server
✅ Multiple attacks on same person
✅ Revenge attacks
✅ Testing builds with friends

### Not Allowed (Coming Soon):

⚠️ Attack cooldowns (to prevent spam)
⚠️ PvP protection for new players
⚠️ Revenge multipliers

## Damage Examples

### Level 5 Player (No Stats) vs Level 3 Player (No Stats)

**Attacker:**

- Base: 15 + (5 × 2) = 25 damage
- Multiplier: 1.0 (no efficiency)
- Variance: 0.8–1.2 → let's say 1.0
- Raw Damage: 25

**Defender:**

- Defense: 1.0 (no resilience)
- Final Damage: 25

**Result:** 25 damage dealt, 12 points earned

### Level 10 Berserker (9 Efficiency) vs Level 10 Tank (9 Resilience)

**Attacker:**

- Base: 15 + (10 × 2) = 35 damage
- Multiplier: 1.0 + (9 × 0.02) = 1.18
- Variance: 1.1 (lucky roll)
- Raw Damage: 35 × 1.18 × 1.1 = 45

**Defender:**

- Defense: 1.0 - (9 × 0.03) = 0.73
- Final Damage: 45 × 0.73 = 33

**Result:** 33 damage dealt, 16 points earned

### Critical Hit Example (6 Fortune)

**Normal Hit:** 30 damage
**Critical Hit:** 30 × 1.5 = 45 damage 💥
**Crit Chance:** 5% + (6 × 1%) = 11%

## Leaderboards (Coming Soon!)

Future features:

- 🏆 PvP Win Leaderboard
- 💀 Most Damage Dealt Leaderboard
- 🛡️ Highest Win Rate Leaderboard
- ⚔️ Monthly PvP Champions
- 🎖️ PvP Rank Titles

## FAQ

**Q: Can I attack the same person multiple times?**
A: Yes! No cooldown currently (may change).

**Q: What happens when my HP reaches 0?**
A: You get a loss recorded, but HP regenerates over time.

**Q: Do I lose points if I lose a fight?**
A: No! You only lose 10 HP. Points are safe.

**Q: Can I attack offline players?**
A: Yes! Attacks work even if they're not online.

**Q: What's the best stat for PvP?**
A: Depends on playstyle! Efficiency for offense, Resilience for defense, Fortune for crits.

**Q: How do I see someone else's stats before attacking?**
A: You can't (yet). Choose your targets wisely!

**Q: Can I reset my stats if I don't like my build?**
A: Yes, with the Stat Reset Scroll from shop (coming soon).

**Q: Do attack types (Grammar/Spelling/Punctuation) matter?**
A: Currently cosmetic only. May have effects in future updates!

## Updates & Future Features

### Implemented ✅

- Basic PvP attack system
- Damage calculations with stats
- Critical hits and dodges
- PvP stat tracking
- Win/loss recording

### Coming Soon 🔜

- Attack cooldowns (prevent spam)
- Victory bonus points
- PvP leaderboards
- Rank system (Bronze → Diamond → Legendary)
- Defense mode (auto-counter when attacked)
- Team battles (2v2, 3v3)
- Tournament system
- PvP-exclusive shop items
- Revenge bonuses
- Attack history/battle log

---

**Last Updated:** 2025-10-18
**System Version:** 1.0
**Status:** Fully Operational

**Get out there and dominate the arena! ⚔️**
