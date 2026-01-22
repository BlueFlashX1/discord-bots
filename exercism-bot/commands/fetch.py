"""Fetch exercise command."""

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_exercise_embed

import discord
from discord import app_commands


class FetchCommand(commands.Cog):
    """Fetch exercise from Exercism."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.data = DataManager()

    async def track_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        """Autocomplete for track parameter."""
        tracks = await self.cli.list_tracks()
        # Filter tracks that match current input (case-insensitive)
        current_lower = current.lower()
        matching = [track for track in tracks if current_lower in track.lower()]
        # Return top 25 matches (Discord limit)
        return [
            app_commands.Choice(name=track.title(), value=track)
            for track in sorted(matching)[:25]
        ]

    @app_commands.command(
        name="fetch", description="Download an exercise from Exercism"
    )
    @app_commands.describe(
        exercise="Exercise name (e.g., 'hello-world')",
        track="Programming track (e.g., 'python', 'javascript')",
    )
    @app_commands.autocomplete(track=track_autocomplete)
    async def fetch(
        self,
        interaction: discord.Interaction,
        exercise: str,
        track: str = "python",
    ):
        """Download an exercise from Exercism."""
        await interaction.response.defer()

        # Validate inputs
        if not exercise:
            await interaction.followup.send(
                embed=create_error_embed("Exercise name is required")
            )
            return

        track = track.lower().strip()

        # Download exercise
        success, message, exercise_path = await self.cli.download_exercise(
            exercise, track
        )

        if success:
            # Track the exercise
            self.data.add_exercise(interaction.user.id, exercise, track)

            embed = create_exercise_embed(
                exercise=exercise,
                track=track,
                description=message,
                exercise_path=exercise_path,
            )
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(embed=create_error_embed(message))


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(FetchCommand(bot))
