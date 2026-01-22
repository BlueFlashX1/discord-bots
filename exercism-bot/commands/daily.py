"""Daily problem command."""

import random

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
        difficulty: str = None,
    ):
        """Get today's daily problem."""
        await interaction.response.defer()

        track = track.lower().strip()

        # Get exercise based on difficulty
        if difficulty:
            exercises = EXERCISE_DIFFICULTY.get(
                difficulty.lower(), EXERCISE_DIFFICULTY["beginner"]
            )
            track_exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
            available = [e for e in exercises if e in track_exercises]
            exercise = (
                random.choice(available)
                if available
                else random.choice(track_exercises)
            )
            actual_difficulty = difficulty.title()
        else:
            exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
            exercise = random.choice(exercises)
            # Determine difficulty
            actual_difficulty = "Beginner"
            for diff, ex_list in EXERCISE_DIFFICULTY.items():
                if exercise in ex_list:
                    actual_difficulty = diff.title()
                    break

        embed = create_daily_problem_embed(
            exercise=exercise,
            track=track,
            description=f"**Difficulty:** {actual_difficulty}\n\nReady to solve {exercise.replace('-', ' ')}?",
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(DailyCommand(bot))
