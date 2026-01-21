"""Helper utilities for Discord bots."""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import discord
import yaml


def load_config(config_file: str = "config/settings.yaml") -> Dict[str, Any]:
    """
    Load configuration from YAML file.

    Args:
        config_file: Path to YAML config file

    Returns:
        Configuration dictionary
    """
    config_path = Path(config_file)

    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_file}")

    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def create_embed(
    title: str,
    description: str = None,
    color: int = 0x3498DB,
    fields: list = None,
    footer: str = None,
    thumbnail: str = None,
    image: str = None,
    timestamp: bool = False,
) -> discord.Embed:
    """
    Create a Discord embed with common formatting.

    Args:
        title: Embed title
        description: Embed description
        color: Embed color (hex)
        fields: List of dicts with 'name', 'value', 'inline' keys
        footer: Footer text
        thumbnail: Thumbnail URL
        image: Image URL
        timestamp: Whether to add current timestamp

    Returns:
        Configured Discord embed
    """
    embed = discord.Embed(title=title, description=description, color=color)

    if fields:
        for field in fields:
            embed.add_field(
                name=field.get("name", "Field"),
                value=field.get("value", "Value"),
                inline=field.get("inline", True),
            )

    if footer:
        embed.set_footer(text=footer)

    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    if image:
        embed.set_image(url=image)

    if timestamp:
        embed.timestamp = datetime.utcnow()

    return embed


def format_time(seconds: int) -> str:
    """
    Format seconds into human-readable time.

    Args:
        seconds: Number of seconds

    Returns:
        Formatted time string (e.g., "2h 30m 15s")
    """
    time_parts = []

    hours = seconds // 3600
    if hours > 0:
        time_parts.append(f"{hours}h")
        seconds %= 3600

    minutes = seconds // 60
    if minutes > 0:
        time_parts.append(f"{minutes}m")
        seconds %= 60

    if seconds > 0 or not time_parts:
        time_parts.append(f"{seconds}s")

    return " ".join(time_parts)


def parse_time(time_str: str) -> Optional[int]:
    """
    Parse time string into seconds.

    Args:
        time_str: Time string (e.g., "2h", "30m", "1h30m")

    Returns:
        Total seconds or None if invalid
    """
    time_str = time_str.lower().strip()
    total_seconds = 0

    import re

    # Match patterns like 2h, 30m, 15s
    patterns = {"h": 3600, "m": 60, "s": 1}

    for unit, multiplier in patterns.items():
        match = re.search(f"(\\d+){unit}", time_str)
        if match:
            total_seconds += int(match.group(1)) * multiplier

    return total_seconds if total_seconds > 0 else None


def chunk_list(lst: list, chunk_size: int) -> list:
    """
    Split a list into chunks of specified size.

    Args:
        lst: List to chunk
        chunk_size: Size of each chunk

    Returns:
        List of chunks
    """
    return [lst[i : i + chunk_size] for i in range(0, len(lst), chunk_size)]


def truncate_string(text: str, max_length: int = 2000, suffix: str = "...") -> str:
    """
    Truncate string to max length (useful for Discord message limits).

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated

    Returns:
        Truncated string
    """
    if len(text) <= max_length:
        return text

    return text[: max_length - len(suffix)] + suffix
