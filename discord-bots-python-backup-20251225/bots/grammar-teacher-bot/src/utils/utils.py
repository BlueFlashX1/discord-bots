"""
Data Management Utilities
=========================

Handles user statistics, settings, and data persistence.
"""

import json
from datetime import datetime
from pathlib import Path

from src.core.config import DATA_DIR, SETTINGS_FILE, STATS_FILE


def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    Path(DATA_DIR).mkdir(exist_ok=True)


def load_stats():
    """Load user statistics from file."""
    ensure_data_dir()
    stats_path = Path(DATA_DIR) / STATS_FILE

    if stats_path.exists():
        with open(stats_path, "r") as f:
            return json.load(f)
    return {}


def save_stats(stats):
    """Save user statistics to file."""
    ensure_data_dir()
    stats_path = Path(DATA_DIR) / STATS_FILE

    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)


def load_settings():
    """Load user settings from file."""
    ensure_data_dir()
    settings_path = Path(DATA_DIR) / SETTINGS_FILE

    if settings_path.exists():
        with open(settings_path, "r") as f:
            return json.load(f)
    return {}


def save_settings(settings):
    """Save user settings to file."""
    ensure_data_dir()
    settings_path = Path(DATA_DIR) / SETTINGS_FILE

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)


def update_user_stats(user_id, stat_type, value=1):
    """
    Update statistics for a user.

    Args:
        user_id: User ID
        stat_type: Type of stat to update
        value: Value to add (default 1)

    Returns:
        dict: Updated user stats
    """
    stats = load_stats()
    user_id = str(user_id)

    if user_id not in stats:
        stats[user_id] = {
            "auto_corrections": 0,
            "manual_checks": 0,
            "errors_found": 0,
            "messages_monitored": 0,
            "last_active": None,
            "error_patterns": {},
            "error_history": [],
        }

    stats[user_id][stat_type] = stats[user_id].get(stat_type, 0) + value
    stats[user_id]["last_active"] = datetime.now().isoformat()
    save_stats(stats)
    return stats[user_id]


def track_error_pattern(user_id, error_type, error_message):
    """
    Track error patterns for trend analysis.

    Args:
        user_id: User ID
        error_type: Type of error
        error_message: Error message
    """
    stats = load_stats()
    user_id = str(user_id)

    if user_id not in stats:
        update_user_stats(user_id, "messages_monitored", 0)
        stats = load_stats()

    # Ensure structures exist
    if "error_patterns" not in stats[user_id]:
        stats[user_id]["error_patterns"] = {}
    if "error_history" not in stats[user_id]:
        stats[user_id]["error_history"] = []

    # Track pattern count
    pattern_key = f"{error_type}:{error_message[:50]}"
    stats[user_id]["error_patterns"][pattern_key] = (
        stats[user_id]["error_patterns"].get(pattern_key, 0) + 1
    )

    # Track history (keep last 100)
    stats[user_id]["error_history"].append(
        {
            "type": error_type,
            "message": error_message[:50],
            "timestamp": datetime.now().isoformat(),
        }
    )
    stats[user_id]["error_history"] = stats[user_id]["error_history"][-100:]

    save_stats(stats)


def is_auto_check_enabled(user_id):
    """Check if auto-check is enabled for user."""
    settings = load_settings()
    user_id = str(user_id)
    return settings.get(user_id, {}).get("auto_check", True)


def set_auto_check(user_id, enabled):
    """Set auto-check enabled/disabled for user."""
    settings = load_settings()
    user_id = str(user_id)

    if user_id not in settings:
        settings[user_id] = {}

    settings[user_id]["auto_check"] = enabled
    save_settings(settings)
