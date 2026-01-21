"""Player statistics tracking with weekly leaderboard resets"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

STATS_FILE = "data/player_stats.json"


def get_week_number() -> int:
    """Get current ISO week number"""
    return datetime.now().isocalendar()[1]


def get_week_start() -> str:
    """Get Monday of current week (ISO format)"""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    return monday.strftime("%Y-%m-%d")


def ensure_stats_file():
    """Create stats file if it doesn't exist"""
    os.makedirs(os.path.dirname(STATS_FILE), exist_ok=True)
    if not os.path.exists(STATS_FILE):
        with open(STATS_FILE, "w") as f:
            json.dump(
                {"metadata": {"last_reset": get_week_start()}, "players": {}},
                f,
                indent=2,
            )


def check_and_reset_weekly():
    """Check if week has changed, reset leaderboard if needed"""
    ensure_stats_file()

    with open(STATS_FILE, "r") as f:
        data = json.load(f)

    current_week_start = get_week_start()
    last_reset = data.get("metadata", {}).get("last_reset", current_week_start)

    if last_reset != current_week_start:
        # Week has changed - archive old week and reset weekly points
        if "archived_weeks" not in data:
            data["archived_weeks"] = {}

        data["archived_weeks"][last_reset] = {"players": {}}

        # Save top 10 from last week
        old_players = sorted(
            data.get("players", {}).items(),
            key=lambda x: x[1].get("weekly_points", 0),
            reverse=True,
        )[:10]

        for user_id, stats in old_players:
            data["archived_weeks"][last_reset]["players"][user_id] = {
                "name": stats.get("username", f"User {user_id}"),
                "weekly_points": stats.get("weekly_points", 0),
                "games_won": stats.get("games_won", 0),
            }

        # Reset weekly points for all players
        for user_id in data.get("players", {}):
            data["players"][user_id]["weekly_points"] = 0
            data["players"][user_id]["weekly_wins"] = 0

        # Update metadata
        data["metadata"]["last_reset"] = current_week_start
        data["metadata"]["last_reset_week"] = get_week_number()

        # Try to update cache, fallback to direct write
        try:
            from src.core.cache import get_stats_cache
            cache = get_stats_cache()
            cache.update(data)
            # Cache will be saved periodically
        except ImportError:
        with open(STATS_FILE, "w") as f:
            json.dump(data, f, indent=2)


def load_stats(user_id: int) -> Dict:
    """Load or create stats for a user"""
    check_and_reset_weekly()
    ensure_stats_file()

    # Try to use cache first
    try:
        from src.core.cache import get_stats_cache
        data = get_stats_cache()
    except ImportError:
        # Fallback to direct file read if cache not available
    with open(STATS_FILE, "r") as f:
        data = json.load(f)

    user_key = str(user_id)

    if user_key not in data["players"]:
        data["players"][user_key] = {
            "user_id": user_id,
            "username": f"User{user_id}",
            "games_played": 0,
            "games_won": 0,
            "games_lost": 0,
            "total_points": 0,  # All-time points (for potential all-time leaderboard)
            "weekly_points": 0,  # This week's points (resets weekly)
            "weekly_wins": 0,  # This week's wins
            "best_game_score": 0,
            "shop_items": [],  # List of purchased cosmetics
            "theme": "default",  # Current active theme
            "prefix": "🎮",  # Current prefix/icon
            "last_game": None,
            "joined_at": datetime.now().isoformat(),
        }

        # Try to update cache, fallback to direct write
        try:
            from src.core.cache import get_stats_cache
            cache = get_stats_cache()
            cache.update(data)
            # Cache will be saved periodically
        except ImportError:
        # Try to update cache, fallback to direct write
        try:
            from src.core.cache import get_stats_cache
            cache = get_stats_cache()
            cache["players"][user_key] = data["players"][user_key]
            if "metadata" not in cache:
                cache["metadata"] = data.get("metadata", {})
            # Cache will be saved periodically
        except (ImportError, Exception):
        with open(STATS_FILE, "w") as f:
            json.dump(data, f, indent=2)

    return data["players"][user_key]


def save_game_result(
    user_id: int, username: str, word: str, score: int, won: bool, mistakes: int
):
    """Record a completed game and award points"""
    check_and_reset_weekly()
    ensure_stats_file()

    with open(STATS_FILE, "r") as f:
        data = json.load(f)

    user_key = str(user_id)
    if user_key not in data["players"]:
        stats = load_stats(user_id)
        data["players"][user_key] = stats

    player = data["players"][user_key]
    player["username"] = username
    player["games_played"] += 1
    player["last_game"] = datetime.now().isoformat()

    if won:
        player["games_won"] += 1
        player["weekly_wins"] += 1
        player["total_points"] += score
        player["weekly_points"] += score  # Add to weekly points
        player["best_game_score"] = max(player["best_game_score"], score)
    else:
        player["games_lost"] += 1

    with open(STATS_FILE, "w") as f:
        json.dump(data, f, indent=2)

    return score


def get_weekly_leaderboard(limit: int = 10) -> List[Tuple[str, Dict]]:
    """Get top players for current week"""
    check_and_reset_weekly()
    ensure_stats_file()

    with open(STATS_FILE, "r") as f:
        data = json.load(f)

    players = data.get("players", {})

    # Sort by weekly points (descending)
    sorted_players = sorted(
        players.items(), key=lambda x: x[1].get("weekly_points", 0), reverse=True
    )

    return sorted_players[:limit]


def get_all_time_leaderboard(limit: int = 10) -> List[Tuple[str, Dict]]:
    """Get top players all-time"""
    ensure_stats_file()

    with open(STATS_FILE, "r") as f:
        data = json.load(f)

    players = data.get("players", {})

    sorted_players = sorted(
        players.items(), key=lambda x: x[1].get("total_points", 0), reverse=True
    )

    return sorted_players[:limit]


def calculate_win_rate(user_id: int) -> float:
    """Calculate win rate percentage"""
    stats = load_stats(user_id)
    total = stats["games_played"]
    if total == 0:
        return 0.0
    return (stats["games_won"] / total) * 100


def get_player_rank(user_id: int) -> int:
    """Get player's rank in current weekly leaderboard"""
    leaderboard = get_weekly_leaderboard(limit=1000)
    user_key = str(user_id)

    for rank, (uid, _) in enumerate(leaderboard, 1):
        if uid == user_key:
            return rank

    return len(leaderboard) + 1  # Player not in top 1000


def get_weekly_reset_time() -> str:
    """Get when the leaderboard will reset (next Monday)"""
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7  # If today is Monday, next reset is in 7 days

    reset_date = today + timedelta(days=days_until_monday)
    return reset_date.strftime("%A, %B %d at %H:%M UTC")
