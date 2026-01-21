"""Discord embed utilities for Exercism bot."""

import discord
from typing import Optional, Dict


def create_exercise_embed(
    exercise: str,
    track: str,
    description: Optional[str] = None,
    exercise_path: Optional[str] = None,
) -> discord.Embed:
    """Create an embed for an exercise."""
    embed = discord.Embed(
        title=f"{exercise.replace('-', ' ').title()}",
        description=f"**Track:** {track.title()}\n{description or 'Ready to solve!'}",
        color=discord.Color.blue(),
    )

    if exercise_path:
        embed.add_field(
            name="📁 Location",
            value=f"`{exercise_path}`",
            inline=False,
        )

    embed.add_field(
        name="💡 Next Steps",
        value="1. Open the exercise directory\n2. Read the README.md\n3. Write your solution\n4. Test with `/submit`",
        inline=False,
    )

    embed.set_footer(text="Exercism - Practice coding with mentorship")
    return embed


def create_progress_embed(
    username: str, track: Optional[str] = None, stats: Optional[Dict] = None
) -> discord.Embed:
    """Create an embed for user progress."""
    embed = discord.Embed(
        title=f"📊 Exercism Progress",
        description=f"**User:** {username}",
        color=discord.Color.green(),
    )

    if track:
        embed.add_field(name="Current Track", value=track.title(), inline=True)

    if stats:
        if "completed" in stats:
            embed.add_field(
                name="✅ Completed", value=str(stats["completed"]), inline=True
            )
        if "in_progress" in stats:
            embed.add_field(
                name="🔄 In Progress", value=str(stats["in_progress"]), inline=True
            )

    embed.set_footer(text="Use /fetch to get new exercises")
    return embed


def create_tracks_embed(tracks: list) -> discord.Embed:
    """Create an embed listing available tracks."""
    embed = discord.Embed(
        title="🎯 Available Tracks",
        description="Choose a track to start practicing:",
        color=discord.Color.purple(),
    )

    # Split tracks into chunks for fields
    tracks_str = ", ".join([f"`{t}`" for t in tracks[:20]])
    embed.add_field(name="Tracks", value=tracks_str, inline=False)

    if len(tracks) > 20:
        embed.set_footer(text=f"Showing 20 of {len(tracks)} tracks")

    return embed


def create_error_embed(message: str) -> discord.Embed:
    """Create an error embed."""
    return discord.Embed(
        title="❌ Error",
        description=message,
        color=discord.Color.red(),
    )


def create_success_embed(message: str) -> discord.Embed:
    """Create a success embed."""
    return discord.Embed(
        title="✅ Success",
        description=message,
        color=discord.Color.green(),
    )


def create_daily_problem_embed(
    exercise: str, track: str, description: Optional[str] = None
) -> discord.Embed:
    """Create an embed for daily problem."""
    embed = discord.Embed(
        title="📅 Daily Coding Problem",
        description=f"**Today's Challenge:** {exercise.replace('-', ' ').title()}",
        color=discord.Color.orange(),
    )

    embed.add_field(name="Track", value=track.title(), inline=True)
    embed.add_field(
        name="Action",
        value=f"Use `/fetch {exercise} {track}` to download",
        inline=False,
    )

    if description:
        embed.add_field(name="Description", value=description[:500], inline=False)

    embed.set_footer(text="Good luck! 🚀")
    return embed
