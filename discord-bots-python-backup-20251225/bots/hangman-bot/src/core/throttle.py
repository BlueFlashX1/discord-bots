"""
Rate limiting and throttling system for Discord bot commands
Prevents spam and abuse while maintaining good user experience
"""

import time
from collections import defaultdict
from typing import Dict, Tuple

# Per-user command cooldowns (user_id: last_command_time)
command_cooldowns: Dict[int, float] = {}
# Per-user command counts (user_id: [timestamps])
command_counts: Dict[int, list] = defaultdict(list)

# Configuration
COMMAND_COOLDOWN_SECONDS = 2.0  # Minimum 2 seconds between commands per user
COMMAND_RATE_LIMIT = 10  # Max 10 commands per window
COMMAND_RATE_WINDOW = 60  # 60 second window

# Per-channel rate limiting (channel_id: last_action_time)
channel_rate_limits: Dict[int, float] = {}
CHANNEL_COOLDOWN_SECONDS = 1.0  # Minimum 1 second between actions per channel


def check_command_cooldown(user_id: int) -> Tuple[bool, float]:
    """
    Check if user is on cooldown for commands

    Returns:
        (allowed: bool, remaining_seconds: float)
    """
    now = time.time()

    # Check per-user cooldown
    if user_id in command_cooldowns:
        time_since_last = now - command_cooldowns[user_id]
        if time_since_last < COMMAND_COOLDOWN_SECONDS:
            remaining = COMMAND_COOLDOWN_SECONDS - time_since_last
            return False, remaining

    # Check rate limit (commands per window)
    now_window = now - COMMAND_RATE_WINDOW
    user_commands = command_counts[user_id]

    # Remove old commands outside window
    user_commands[:] = [ts for ts in user_commands if ts > now_window]

    if len(user_commands) >= COMMAND_RATE_LIMIT:
        # User exceeded rate limit
        oldest_command = min(user_commands)
        remaining = COMMAND_RATE_WINDOW - (now - oldest_command)
        return False, remaining

    # Update cooldown and rate limit tracking
    command_cooldowns[user_id] = now
    user_commands.append(now)

    return True, 0.0


def check_channel_cooldown(channel_id: int) -> Tuple[bool, float]:
    """
    Check if channel is on cooldown (prevents rapid game creation)

    Returns:
        (allowed: bool, remaining_seconds: float)
    """
    now = time.time()

    if channel_id in channel_rate_limits:
        time_since_last = now - channel_rate_limits[channel_id]
        if time_since_last < CHANNEL_COOLDOWN_SECONDS:
            remaining = CHANNEL_COOLDOWN_SECONDS - time_since_last
            return False, remaining

    channel_rate_limits[channel_id] = now
    return True, 0.0


def reset_user_cooldown(user_id: int):
    """Reset cooldown for a user (useful for admin commands)"""
    if user_id in command_cooldowns:
        del command_cooldowns[user_id]
    if user_id in command_counts:
        command_counts[user_id].clear()


def cleanup_old_entries():
    """Clean up old entries to prevent memory leaks"""
    now = time.time()
    window_start = now - COMMAND_RATE_WINDOW

    # Clean up old command counts
    for user_id in list(command_counts.keys()):
        command_counts[user_id] = [
            ts for ts in command_counts[user_id] if ts > window_start
        ]
        if not command_counts[user_id]:
            del command_counts[user_id]

    # Clean up old cooldowns (older than 5 minutes)
    cooldown_expiry = now - 300
    for user_id in list(command_cooldowns.keys()):
        if command_cooldowns[user_id] < cooldown_expiry:
            del command_cooldowns[user_id]

    # Clean up old channel cooldowns (older than 1 minute)
    channel_expiry = now - 60
    for channel_id in list(channel_rate_limits.keys()):
        if channel_rate_limits[channel_id] < channel_expiry:
            del channel_rate_limits[channel_id]
