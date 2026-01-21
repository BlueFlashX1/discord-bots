# 🎮 Gamification - Quick Implementation Guide

## 🎯 My Top Recommendation: Player Stats + Scoring

**Why?**

- Easy to implement (1-2 hours)
- Immediate player engagement boost
- Foundation for all future features
- Foundation for leaderboards

---

## 📋 What to Implement First

### Step 1: Add Scoring to Game Logic

**File to modify**: `src/gamification/game.py`

Add this method to HangmanGame class:

```python
def calculate_score(self) -> int:
    """Calculate points for completing this game"""
    if self.game_state != "won":
        return 0  # No points for losses

    word_length = len([c for c in self.word if c.isalpha()])

    # Base scoring
    base_score = 100
    word_bonus = word_length * 10  # Longer words = more points

    # Mistake deduction
    mistake_penalty = self.mistakes * 20  # -20 per mistake

    # Perfect game bonus
    perfect_bonus = 50 if self.mistakes == 0 else 0

    # Total
    total = max(50, base_score + word_bonus + perfect_bonus - mistake_penalty)
    return total
```

---

### Step 2: Create Stats File Handler

**New file**: `src/gamification/player_stats.py`

```python
"""Player statistics tracking and management"""

import json
import os
from datetime import datetime
from typing import Dict, Optional

STATS_FILE = "data/player_stats.json"

def ensure_stats_file():
    """Create stats file if it doesn't exist"""
    os.makedirs(os.path.dirname(STATS_FILE), exist_ok=True)
    if not os.path.exists(STATS_FILE):
        with open(STATS_FILE, 'w') as f:
            json.dump({}, f)

def load_stats(user_id: int) -> Dict:
    """Load stats for a specific user"""
    ensure_stats_file()

    with open(STATS_FILE, 'r') as f:
        all_stats = json.load(f)

    user_key = str(user_id)
    if user_key not in all_stats:
        all_stats[user_key] = {
            "games_played": 0,
            "games_won": 0,
            "games_lost": 0,
            "total_points": 0,
            "best_score": 0,
            "worst_score": 0,
            "games": []
        }

    return all_stats[user_key]

def save_game_result(user_id: int, word: str, score: int, won: bool, mistakes: int):
    """Record a completed game"""
    ensure_stats_file()

    with open(STATS_FILE, 'r') as f:
        all_stats = json.load(f)

    user_key = str(user_id)
    if user_key not in all_stats:
        all_stats[user_key] = {
            "games_played": 0,
            "games_won": 0,
            "games_lost": 0,
            "total_points": 0,
            "best_score": 0,
            "worst_score": 0,
            "games": []
        }

    user_stats = all_stats[user_key]
    user_stats["games_played"] += 1

    if won:
        user_stats["games_won"] += 1
        user_stats["total_points"] += score
        user_stats["best_score"] = max(user_stats["best_score"], score)
    else:
        user_stats["games_lost"] += 1
        user_stats["worst_score"] = min(user_stats.get("worst_score", 0), score)

    # Record game
    user_stats["games"].append({
        "word": word,
        "score": score,
        "won": won,
        "mistakes": mistakes,
        "timestamp": datetime.now().isoformat()
    })

    # Keep only last 100 games to prevent file size explosion
    if len(user_stats["games"]) > 100:
        user_stats["games"] = user_stats["games"][-100:]

    # Save
    with open(STATS_FILE, 'w') as f:
        json.dump(all_stats, f, indent=2)

def get_all_stats() -> Dict:
    """Get all player stats for leaderboard"""
    ensure_stats_file()

    with open(STATS_FILE, 'r') as f:
        return json.load(f)

def calculate_win_rate(user_id: int) -> float:
    """Calculate win rate percentage"""
    stats = load_stats(user_id)
    total = stats["games_played"]
    if total == 0:
        return 0.0
    return (stats["games_won"] / total) * 100
```

---

### Step 3: Add Stats Commands

**File to modify**: `src/core/__main__.py`

Add these imports at the top:

```python
from src.gamification.player_stats import (
    load_stats,
    save_game_result,
    get_all_stats,
    calculate_win_rate
)
```

Add these commands:

```python
@bot.tree.command(name="mystats", description="View your personal game statistics")
async def mystats_command(interaction: discord.Interaction):
    """Show personal statistics"""
    try:
        log_command("mystats", interaction.user.id, interaction.user.name)

        stats = load_stats(interaction.user.id)
        win_rate = calculate_win_rate(interaction.user.id)

        embed = discord.Embed(
            title="📊 Your Hangman Stats",
            color=0x5865F2,
            description=f"Tracked stats for {interaction.user.display_name}"
        )

        embed.add_field(name="Games Played", value=stats["games_played"], inline=True)
        embed.add_field(name="Games Won", value=stats["games_won"], inline=True)
        embed.add_field(name="Games Lost", value=stats["games_lost"], inline=True)

        embed.add_field(name="Win Rate", value=f"{win_rate:.1f}%", inline=True)
        embed.add_field(name="Total Points", value=stats["total_points"], inline=True)
        embed.add_field(name="Best Score", value=stats["best_score"], inline=True)

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        log_error_traceback(e, "mystats_command")
        await interaction.response.send_message(f"❌ Error: {str(e)}", ephemeral=True)


@bot.tree.command(name="leaderboard", description="View the global leaderboard")
async def leaderboard_command(interaction: discord.Interaction):
    """Show global leaderboard"""
    try:
        log_command("leaderboard", interaction.user.id, interaction.user.name)

        all_stats = get_all_stats()

        # Sort by total points
        sorted_players = sorted(
            all_stats.items(),
            key=lambda x: x[1]["total_points"],
            reverse=True
        )[:10]

        embed = discord.Embed(
            title="🏆 TOP 10 PLAYERS",
            color=0xFFD700
        )

        if not sorted_players:
            embed.description = "No games played yet!"
        else:
            for rank, (user_id, stats) in enumerate(sorted_players, 1):
                medal = ["🥇", "🥈", "🥉"][rank-1] if rank <= 3 else f"{rank}."
                value = f"**{stats['total_points']}** points | {stats['games_won']}W-{stats['games_lost']}L"
                embed.add_field(name=f"{medal} <@{user_id}>", value=value, inline=False)

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        log_error_traceback(e, "leaderboard_command")
        await interaction.response.send_message(f"❌ Error: {str(e)}", ephemeral=True)
```

---

### Step 4: Save Stats After Each Game

**File to modify**: `src/core/__main__.py`

In the `hangman_command` where game ends:

```python
if game.game_state == "won":
    embed.color = 0x00FF00
    embed.title = "🎉 Game Won!"
    embed.add_field(
        name="🏆 Winners",
        value="\n".join([f"<@{pid}>" for pid in game.players]),
        inline=False
    )

    # ✨ NEW: Calculate and save score for each player
    score = game.calculate_score()
    for player_id in game.players:
        save_game_result(player_id, game.word, score, True, game.mistakes)
        log_game_action(channel_id, "score_earned", player_id, f"score={score}")

    log_game_end(channel_id, "won", game.word)
    delete_game(channel_id)
    del channel_games[channel_id]

elif game.game_state == "lost":
    embed.color = 0xFF0000
    embed.title = "💀 Game Over!"

    # ✨ NEW: Save loss for all players
    for player_id in game.players:
        save_game_result(player_id, game.word, 0, False, game.mistakes)

    log_game_end(channel_id, "lost", game.word)
    delete_game(channel_id)
    del channel_games[channel_id]
```

---

## 📊 Data Structure

After games, `data/player_stats.json` will look like:

```json
{
  "123456789": {
    "games_played": 5,
    "games_won": 3,
    "games_lost": 2,
    "total_points": 650,
    "best_score": 215,
    "worst_score": 0,
    "games": [
      {
        "word": "PYTHON",
        "score": 200,
        "won": true,
        "mistakes": 1,
        "timestamp": "2025-10-21T14:32:45.123456"
      },
      {
        "word": "DISCORD",
        "score": 0,
        "won": false,
        "mistakes": 6,
        "timestamp": "2025-10-21T14:35:12.654321"
      }
    ]
  }
}
```

---

## 🚀 Testing

After implementing:

1. **Play a game and win**

   - Use `/hangman start python`
   - Use `/hangman guess e`, etc.
   - Check `/mystats` - should show 1 win, X points
   - Check `/leaderboard` - should show you

2. **Play another game**

   - Stats should accumulate
   - Leaderboard should update

3. **Test with multiple users**
   - Have different Discord users play
   - `/leaderboard` should show ranking

---

## 🎯 Next Steps (After This Works)

Once this is working, you can add:

1. **Achievements** (badges for milestones)
2. **Difficulty Levels** (easy/medium/hard words)
3. **Daily Challenges** (special daily puzzle)
4. **Streaks** (consecutive wins)
5. **Seasonal Resets** (monthly leaderboard)

---

## 💡 Quick Tips

- **Storage**: JSON is simple and works for small player bases
- **Scale**: If 1000+ players, consider database
- **Cleanup**: Keep only last 100 games per player
- **Display**: Format large numbers with commas (1,250 not 1250)
- **Logging**: Track stats operations for debugging

---

## Estimated Time

- Stats system: 30 minutes
- Commands: 30 minutes
- Testing: 15 minutes
- **Total: ~1 hour**

Want me to implement this?
