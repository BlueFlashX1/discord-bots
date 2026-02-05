"""Discord embed utilities for Exercism bot."""

from typing import Dict, Optional

import discord


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
        title="📊 Exercism Progress",
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


def create_tracks_embed(
    tracks: list, user_tracks: Optional[list] = None
) -> discord.Embed:
    """Create an embed listing available tracks with user's joined tracks highlighted."""
    embed = discord.Embed(
        title="🎯 Available Tracks",
        description="Choose a track to start practicing:",
        color=discord.Color.purple(),
    )

    # Show user's joined tracks first if available
    if user_tracks:
        joined_str = ", ".join([f"**{t}**" for t in sorted(user_tracks)])
        embed.add_field(
            name="✅ Your Joined Tracks",
            value=joined_str or "None",
            inline=False,
        )

    # Show all available tracks
    tracks_str = ", ".join([f"`{t}`" for t in tracks[:25]])
    embed.add_field(name="All Tracks", value=tracks_str, inline=False)

    if len(tracks) > 25:
        embed.set_footer(text=f"Showing 25 of {len(tracks)} tracks")
    else:
        embed.set_footer(text="Use /fetch <exercise> <track> to get started")

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
    exercise: str,
    track: str,
    description: Optional[str] = None,
    exercise_path: Optional[str] = None,
    readme: Optional[str] = None,
    starter_code: Optional[str] = None,
    starter_file: Optional[str] = None,
    test_file: Optional[str] = None,
    cli_installed: bool = True,
    cli_message: Optional[str] = None,
) -> discord.Embed:
    """Create an embed for daily problem with full details."""
    embed = discord.Embed(
        title="📅 Daily Coding Problem",
        description=f"**Today's Challenge:** {exercise.replace('-', ' ').title()}",
        color=discord.Color.orange(),
    )

    embed.add_field(name="Track", value=track.title(), inline=True)

    # CLI installation status
    if not cli_installed:
        embed.add_field(
            name="⚠️ CLI Not Found",
            value="Exercism CLI is not installed on the server.",
            inline=False,
        )
        embed.add_field(
            name="📥 Installation Help",
            value=(
                "**To install Exercism CLI:**\n"
                "1. Visit: https://exercism.org/cli-walkthrough\n"
                "2. Follow instructions for your OS\n"
                "3. Run `/check` to verify installation\n\n"
                f"**Manual download:** Use `/fetch {exercise} {track}` after installing CLI"
            ),
            inline=False,
        )
        if cli_message:
            embed.add_field(name="Error Details", value=cli_message[:200], inline=False)
    else:
        # Problem description
        if description:
            # Clean up description (remove markdown links, format nicely)
            import re

            # Remove markdown links but keep text: [text](url) -> text
            clean_desc = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", description)
            # Remove standalone URLs
            clean_desc = re.sub(r"https?://[^\s]+", "", clean_desc)
            # Clean up extra whitespace
            clean_desc = " ".join(clean_desc.split())
            # Limit to 1000 chars for Discord embed field limit
            if len(clean_desc) > 1000:
                clean_desc = clean_desc[:997] + "..."
            embed.add_field(name="📝 Description", value=clean_desc, inline=False)

        # Exercise path
        if exercise_path:
            embed.add_field(
                name="📁 Location",
                value=f"`{exercise_path}`",
                inline=False,
            )

        # Starter code preview
        if starter_code and starter_file:
            code_preview = starter_code
            if len(code_preview) > 500:
                code_preview = code_preview[:497] + "..."
            embed.add_field(
                name=f"💻 Starter Code ({starter_file})",
                value=f"```{track}\n{code_preview}\n```",
                inline=False,
            )

        # Test file info
        if test_file:
            embed.add_field(
                name="🧪 Test File",
                value=f"`{test_file}` - Run tests to verify your solution",
                inline=False,
            )

        # Next steps
        next_steps = "1. Open the exercise directory\n2. Read the README.md for full instructions\n3. Write your solution\n4. Test with `/submit`"
        if not exercise_path:
            next_steps = f"Use `/fetch {exercise} {track}` to download the exercise"

        embed.add_field(name="💡 Next Steps", value=next_steps, inline=False)

    embed.set_footer(text="Good luck! 🚀")
    return embed
