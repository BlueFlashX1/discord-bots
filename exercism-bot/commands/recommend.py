"""Exercise recommendation command based on difficulty."""

import discord
from discord import app_commands
from discord.ext import commands
import random

from services.exercism_cli import ExercismCLI
from services.exercism_api import get_exercism_api
from utils.embeds import create_exercise_embed, create_error_embed
from utils.data_manager import DataManager


class RecommendCommand(commands.Cog):
    """Exercise recommendation command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.api = get_exercism_api()  # Use API for reliable recommendations
        self.data = DataManager()

    async def _get_recommendations(
        self, user_id: int, track: str, difficulty: str | None = None
    ) -> list:
        """Get exercise recommendations based on user progress and difficulty.
        
        Uses API for real unlocked exercises instead of hardcoded lists.
        """
        # Get user's completed exercises (from local tracking)
        exercises = self.data.get_user_exercises(user_id)
        completed = {
            e.get("exercise")
            for e in exercises
            if e.get("track") == track
        }
        
        # Get exercises already in workspace
        in_workspace = set(await self.cli.get_exercises_for_track(track))

        # Get unlocked exercises from API
        available = []
        try:
            if difficulty:
                available = await self.api.get_unlocked_exercises_by_difficulty(
                    track, difficulty.lower()
                )
            else:
                unlocked = await self.api.get_unlocked_exercises(track)
                available = list(unlocked)
        except Exception:
            pass  # API failed, available stays empty

        # Filter out completed and in-progress exercises
        recommendations = [
            ex
            for ex in available
            if ex not in completed and ex not in in_workspace
        ]

        # If no recommendations at this difficulty, try other difficulties
        if not recommendations and difficulty:
            try:
                # Get all unlocked exercises
                all_unlocked = await self.api.get_unlocked_exercises(track)
                recommendations = [
                    ex for ex in all_unlocked
                    if ex not in completed and ex not in in_workspace
                ][:5]
            except Exception:
                pass

        return recommendations[:5]  # Return top 5

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
        name="recommend",
        description="Get exercise recommendations based on your progress and difficulty",
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level: beginner, intermediate, or advanced",
    )
    @app_commands.autocomplete(track=track_autocomplete)
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
        difficulty: str | None = None,
    ):
        """Get exercise recommendations."""
        await interaction.response.defer()

        track = track.lower().strip()
        user_id = interaction.user.id

        # Get recommendations (now async with API)
        recommendations = await self._get_recommendations(user_id, track, difficulty)

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

        # Use requested difficulty or "Mixed" if not specified
        actual_difficulty = difficulty.title() if difficulty else "Mixed"

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
