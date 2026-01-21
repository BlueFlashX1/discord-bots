"""Exercise recommendation command based on difficulty."""

import discord
from discord import app_commands
from discord.ext import commands
import random

from services.exercism_cli import ExercismCLI
from utils.embeds import create_exercise_embed, create_error_embed
from utils.data_manager import DataManager

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
        "acronym",
    ],
    "intermediate": [
        "hamming",
        "word-count",
        "anagram",
        "scrabble-score",
        "roman-numerals",
        "phone-number",
        "diamond",
        "beer-song",
    ],
    "advanced": [
        "sieve",
        "nth-prime",
        "largest-series-product",
        "allergies",
        "crypto-square",
        "robot-name",
        "queen-attack",
        "binary-search-tree",
    ],
}

TRACK_EXERCISES = {
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
    "go": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
    "java": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
}


class RecommendCommand(commands.Cog):
    """Exercise recommendation command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.data = DataManager()

    def _get_recommendations(
        self, user_id: int, track: str, difficulty: str = None
    ) -> list:
        """Get exercise recommendations based on user progress and difficulty."""
        # Get user's completed exercises
        exercises = self.data.get_user_exercises(user_id)
        completed = {
            (e.get("exercise"), e.get("track"))
            for e in exercises
            if e.get("track") == track
        }

        # Get available exercises for track
        available = TRACK_EXERCISES.get(track, TRACK_EXERCISES["python"])

        # Filter out completed
        recommendations = [
            ex
            for ex in available
            if (ex, track) not in completed
        ]

        # Filter by difficulty if specified
        if difficulty:
            difficulty_exercises = EXERCISE_DIFFICULTY.get(
                difficulty.lower(), EXERCISE_DIFFICULTY["beginner"]
            )
            recommendations = [
                ex for ex in recommendations if ex in difficulty_exercises
            ]

        # If no recommendations, suggest next difficulty level
        if not recommendations and difficulty:
            if difficulty == "beginner":
                next_level = "intermediate"
            elif difficulty == "intermediate":
                next_level = "advanced"
            else:
                next_level = "beginner"  # Cycle back

            next_exercises = EXERCISE_DIFFICULTY.get(next_level, [])
            recommendations = [
                ex for ex in available if ex in next_exercises and (ex, track) not in completed
            ]

        return recommendations[:5]  # Return top 5

    @app_commands.command(
        name="recommend",
        description="Get exercise recommendations based on your progress and difficulty",
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level: beginner, intermediate, or advanced",
    )
    @app_commands.choices(
        difficulty=[
            app_commands.Choice(name="Beginner", value="beginner"),
            app_commands.Choice(name="Intermediate", value="intermediate"),
            app_commands.Choice(name="Advanced", value="advanced"),
        ]
    )
    async def recommend(
        self,
        interaction: discord.Interaction,
        track: str = "python",
        difficulty: str = None,
    ):
        """Get exercise recommendations."""
        await interaction.response.defer()

        track = track.lower().strip()
        user_id = interaction.user.id

        # Get recommendations
        recommendations = self._get_recommendations(user_id, track, difficulty)

        if not recommendations:
            embed = create_error_embed(
                f"No recommendations found for {track} track.\n"
                "You may have completed all exercises at this difficulty level!\n"
                "Try a different difficulty or track."
            )
            await interaction.followup.send(embed=embed)
            return

        # Pick random recommendation
        exercise = random.choice(recommendations)

        # Determine actual difficulty
        actual_difficulty = "beginner"
        for diff, exercises in EXERCISE_DIFFICULTY.items():
            if exercise in exercises:
                actual_difficulty = diff
                break

        embed = create_exercise_embed(
            exercise=exercise,
            track=track,
            description=f"**Recommended for you!**\n\n**Difficulty:** {actual_difficulty.title()}\n\n"
            f"Based on your progress, this exercise is a good next challenge.",
        )

        embed.add_field(
            name="💡 More Recommendations",
            value=f"Found {len(recommendations)} exercises. Use `/recommend {track} {difficulty or ''}` again for more!",
            inline=False,
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(RecommendCommand(bot))
