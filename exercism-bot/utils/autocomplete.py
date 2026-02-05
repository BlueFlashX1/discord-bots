"""Shared autocomplete utilities for Discord commands."""

from discord import app_commands
import discord

from services.exercism_cli import ExercismCLI


# Shared CLI instance for autocomplete
_cli: ExercismCLI | None = None


def get_cli() -> ExercismCLI:
    """Get shared CLI instance for autocomplete."""
    global _cli
    if _cli is None:
        _cli = ExercismCLI()
    return _cli


async def track_autocomplete(
    interaction: discord.Interaction, current: str
) -> list[app_commands.Choice[str]]:
    """Autocomplete for track parameter - only shows joined tracks.
    
    Use this in commands with:
        @app_commands.autocomplete(track=track_autocomplete)
    """
    cli = get_cli()
    tracks = await cli.get_joined_tracks()
    if not tracks:
        return []
    current_lower = current.lower()
    matching = [
        track
        for track in tracks
        if current_lower in track.lower()
    ]
    return [
        app_commands.Choice(name=track.title(), value=track)
        for track in sorted(matching)[:25]
    ]


async def track_autocomplete_with_all(
    interaction: discord.Interaction, current: str
) -> list[app_commands.Choice[str]]:
    """Autocomplete for track parameter - shows joined tracks + 'all' option.
    
    Use this in commands that support subscribing to all tracks.
    """
    cli = get_cli()
    tracks = await cli.get_joined_tracks()
    current_lower = current.lower()

    choices = []

    # Always include "all" option if user types "all" or "a" or empty
    if "all" in current_lower or current_lower == "" or current_lower == "a":
        choices.append(
            app_commands.Choice(name="All Tracks (Rotate Daily)", value="all")
        )

    # Add joined tracks
    if tracks:
        matching = [
            track
            for track in tracks
            if current_lower in track.lower() and track.lower() != "all"
        ]
        choices.extend(
            [
                app_commands.Choice(name=track.title(), value=track)
                for track in sorted(matching)
            ]
        )

    return choices[:25]  # Discord limit
