# 💎 Stat Allocation System Guide

## Overview

The stat allocation system is an RPG-style character progression feature that lets you customize your Grammar Bot character by allocating stat points earned through leveling up.

## How to Earn Stat Points

- **Earn 1 stat point per level up**
- Maximum of 9 stat points available (levels 1→10)
- Stat points are shown in level-up notifications
- Check available points with `/profile`

## The Five Stats

### 💪 Durability

- **Effect:** +10 max HP per point
- **Immediate:** Your max HP and current HP both increase when allocated
- **Example:** 9 points = 190 max HP (vs 100 base)
- **Best for:** Players who make frequent errors and need survivability

### 🔥 Efficiency

- **Effect:** +5% points earned per point (multiplicative)
- **Example:** 9 points = +45% points from all sources
- **Best for:** Players who want to buy more shop items

### ⚡ Learning

- **Effect:** +5% XP earned per point (multiplicative)
- **Applies to:** Both error corrections AND clean message XP
- **Example:** 9 points = +45% XP (faster leveling)
- **Best for:** Players who want to level up quickly

### 🛡️ Resilience

- **Effect:** -5% HP loss from errors per point
- **Example:** 9 points = -45% HP loss (take less damage)
- **Best for:** Players who make errors but want to reduce penalties

### 💎 Fortune

- **Effect:** 3% shop discount per point
- **Example:** 9 points = 27% discount on all shop items
- **Best for:** Players who buy lots of shop items

## How to Allocate Stats

### Using the `/allocate` Command

```
/allocate stat:<choose stat> points:<amount>
```

**Examples:**

- `/allocate stat:Durability points:1` - Add 1 point to durability
- `/allocate stat:Learning points:3` - Add 3 points to learning
- `/allocate stat:Efficiency points:5` - Add 5 points to efficiency

### Stat Allocation Rules

1. **Permanent:** Once allocated, stats cannot be changed (except with Stat Reset Scroll)
2. **No Refunds:** Choose carefully!
3. **Immediate Effect:** Bonuses apply instantly after allocation
4. **Validation:** Bot checks if you have enough unallocated points

## Viewing Your Stats

### In `/profile` Command

Your allocated stats appear in the profile display:

```
💎 Stat Allocation:
• Unallocated Points: 2 (Use /allocate)
💪 Durability: 3 (+30 max HP)
🔥 Efficiency: 2 (+10% points)
⚡ Learning: 2 (+10% XP)
```

## Build Strategies

### 🛡️ Tank Build (Max Durability)

- **Stats:** 9 durability
- **Result:** 190 max HP
- **Playstyle:** Survive many errors, perfect for beginners

### ⚡ Speedrun Build (Max Learning)

- **Stats:** 9 learning
- **Result:** +45% XP gain
- **Playstyle:** Level up fastest, reach level 10 quickly

### 💰 Profit Build (Max Efficiency)

- **Stats:** 9 efficiency
- **Result:** +45% points earned
- **Playstyle:** Buy all shop items, maximize wealth

### 🛡️ Survivor Build (Max Resilience)

- **Stats:** 9 resilience
- **Result:** -45% HP loss from errors
- **Playstyle:** Make errors but take minimal damage

### 💎 Lucky Build (Max Fortune)

- **Stats:** 9 fortune
- **Result:** 27% shop discount
- **Playstyle:** Buy items cheaper, save points

### ⚖️ Balanced Build (Mix Stats)

- **Stats:** 2-3 points in multiple stats
- **Result:** Moderate bonuses across the board
- **Playstyle:** Flexible, adapt to any situation

## Advanced Features

### Stat Reset Scroll (Future Shop Item)

- **Cost:** ~2000 points (expensive!)
- **Effect:** Reset all allocated stats, keep the points
- **Use:** Allows you to try different builds
- **Status:** Coming soon to shop

### Stat Synergies

- **Durability + Resilience:** Maximum survivability
- **Efficiency + Fortune:** Maximum profit from messages
- **Learning + Efficiency:** Fast leveling AND good income

## Tips & Tricks

1. **Don't Rush:** You get stat points slowly (1 per level), plan ahead
2. **Match Your Playstyle:** If you write carefully, don't need durability
3. **Think Long-Term:** Stat choices are permanent without respec item
4. **Check Before Allocating:** Use `/profile` to see current stats first
5. **Consider Shop Goals:** If buying items, efficiency/fortune help

## Technical Details

### Stat Point Economy

- **Source:** Leveling up (1 point per level)
- **Total Available:** 9 points (level 2 through level 10)
- **Allocation:** Player choice via `/allocate` command
- **Reset:** Only via Stat Reset Scroll (shop item)

### Bonus Calculations

- **Multiplicative Bonuses:** Stack with base values
- **HP Bonus:** Applies to both max HP and current HP
- **Points Bonus:** `points_earned * (1.0 + efficiency * 0.05)`
- **XP Bonus:** `xp_earned * (1.0 + learning * 0.05)`
- **HP Loss Reduction:** `hp_loss * (1.0 - resilience * 0.05)`
- **Shop Discount:** `item_price * (1.0 - fortune * 0.03)`

### Example Calculations

**9 Efficiency Points:**

- Base: 20 points for clean message
- Bonus: 20 _ (1.0 + 9 _ 0.05) = 20 \* 1.45 = 29 points
- Result: +9 extra points per clean message

**9 Learning Points:**

- Base: 10 XP for error correction
- Bonus: 10 _ (1.0 + 9 _ 0.05) = 10 \* 1.45 = 14.5 XP
- Result: +4.5 extra XP per error

**9 Resilience Points:**

- Base: 10 HP loss per error
- Reduction: 10 _ (1.0 - 9 _ 0.05) = 10 \* 0.55 = 5.5 HP
- Result: Only lose 5.5 HP instead of 10

## FAQ

**Q: Can I reset my stats?**
A: Currently no, but a Stat Reset Scroll will be added to the shop soon.

**Q: What happens if I allocate more points than I have?**
A: The command will fail with an error message telling you how many points you have.

**Q: Do stat bonuses stack?**
A: Yes! All bonuses are multiplicative and stack with base values.

**Q: Can I allocate 0.5 points?**
A: No, only whole numbers. Minimum allocation is 1 point.

**Q: Which stat is the best?**
A: Depends on your playstyle! No single "best" stat exists.

**Q: Do stats affect achievements?**
A: Indirectly - learning helps you level up faster for level achievements.

**Q: Can I split points across multiple stats?**
A: Yes! You can mix and match however you like.

**Q: What if I make a mistake allocating?**
A: Stats are permanent unless you buy the Stat Reset Scroll (coming soon).

## Updates & Future Features

### Implemented ✅

- 5 stats with unique bonuses
- `/allocate` command with stat choices
- Stat display in `/profile`
- Stat bonuses applied to all gameplay
- Stat points awarded at level up

### Coming Soon 🔜

- Stat Reset Scroll in shop
- Fortune discount applied to shop purchases
- `/mystats` quick view command
- More stat-based achievements
- Possible 6th stat (Luck for crits?)

---

**Last Updated:** 2025-01-XX
**System Version:** 1.0
**Status:** Fully Operational
