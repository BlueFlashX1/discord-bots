"""Daily problem command."""

import random
from typing import Optional

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from utils.embeds import create_daily_problem_embed

import discord
from discord import app_commands

# Exercise difficulty mapping
EXERCISE_DIFFICULTY = {
    "beginner": [
        "hello-world",
        "two-fer",
        "leap",
        "bob",
        "raindrops",
        "isogram",
        "pangram",
    ],
    "intermediate": [
        "hamming",
        "acronym",
        "word-count",
        "anagram",
        "scrabble-score",
    ],
    "advanced": [
        "sieve",
        "nth-prime",
        "largest-series-product",
    ],
}

COMMON_EXERCISES = {
    "python": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
    "javascript": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
    "rust": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
}


class DailyCommand(commands.Cog):
    """Daily problem command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    async def track_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        """Autocomplete for track parameter - only shows joined tracks."""
        tracks = await self.cli.get_joined_tracks()
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

    @app_commands.command(
        name="daily", description="Get today's recommended coding problem"
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level (optional)",
    )
    @app_commands.autocomplete(track=track_autocomplete)
    @app_commands.choices(
        difficulty=[
            app_commands.Choice(name="Beginner", value="beginner"),
            app_commands.Choice(name="Intermediate", value="intermediate"),
            app_commands.Choice(name="Advanced", value="advanced"),
        ]
    )
    async def daily(
        self,
        interaction: discord.Interaction,
        track: str = "python",
        difficulty: Optional[str] = None,
    ):
        """Get today's daily problem."""
        await interaction.response.defer()

        track = track.lower().strip()

        if difficulty:
            exercises = EXERCISE_DIFFICULTY.get(
                difficulty.lower(), EXERCISE_DIFFICULTY["beginner"]
            )
            track_exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
            available = [e for e in exercises if e in track_exercises]
            unlocked_exercises = []
            for ex in available:
                if await self.cli.is_exercise_unlocked(ex, track):
                    unlocked_exercises.append(ex)
            if unlocked_exercises:
                exercise = random.choice(unlocked_exercises)
                actual_difficulty = difficulty.title()
            else:
                no_unlocked = discord.Embed(
                    title="No Unlocked Exercises",
                    description=(
                        f"No unlocked exercises for **{track.title()}** ({difficulty}).\n\n"
                        "Complete more on [exercism.io](https://exercism.org) to unlock more."
                    ),
                    color=discord.Color.orange(),
                )
                no_unlocked.set_footer(text="Good luck! 🚀")
                await interaction.followup.send(embed=no_unlocked)
                return
        else:
            exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
            unlocked_exercises = []
            for ex in exercises:
                if await self.cli.is_exercise_unlocked(ex, track):
                    unlocked_exercises.append(ex)
            if unlocked_exercises:
                exercise = random.choice(unlocked_exercises)
                actual_difficulty = "Beginner"
                for diff, ex_list in EXERCISE_DIFFICULTY.items():
                    if exercise in ex_list:
                        actual_difficulty = diff.title()
                        break
            else:
                no_unlocked = discord.Embed(
                    title="No Unlocked Exercises",
                    description=(
                        f"No unlocked exercises for **{track.title()}**.\n\n"
                        "Complete more on [exercism.io](https://exercism.org) to unlock more."
                    ),
                    color=discord.Color.orange(),
                )
                no_unlocked.set_footer(text="Good luck! 🚀")
                await interaction.followup.send(embed=no_unlocked)
                return

        embed = create_daily_problem_embed(
            exercise=exercise,
            track=track,
            description=f"**Difficulty:** {actual_difficulty}\n\nReady to solve {exercise.replace('-', ' ')}?",
        )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(DailyCommand(bot))
