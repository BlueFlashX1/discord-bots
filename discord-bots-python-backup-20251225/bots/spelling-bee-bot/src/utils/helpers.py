"""Utility helper functions for Discord interactions"""

from typing import Optional

import discord


def get_player_display_name(
    guild: Optional[discord.Guild],
    player_id: int,
    fallback: str = "Unknown Player",
) -> str:
    """
    Safely retrieve a player's display name from a guild.

    Handles cases where guild is None or player is not found.

    Args:
        guild: The Discord guild (can be None)
        player_id: The Discord user ID
        fallback: Default name if player not found

    Returns:
        Player's display name or fallback string
    """
    if not guild:
        return fallback

    member = guild.get_member(player_id)
    if not member:
        return fallback

    return member.display_name
