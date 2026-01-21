"""Submit solution command."""

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed

import discord
from discord import app_commands


class SubmitCommand(commands.Cog):
    """Submit solution command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.data = DataManager()

    @app_commands.command(
        name="submit", description="Submit a solution file to Exercism"
    )
    @app_commands.describe(
        file="Solution file to submit",
        exercise="Exercise name (optional, for tracking)",
        track="Track name (optional, for tracking)",
    )
    async def submit(
        self,
        interaction: discord.Interaction,
        file: discord.Attachment,
        exercise: str = None,
        track: str = None,
    ):
        """Submit a solution file."""
        await interaction.response.defer()

        # Download the file
        try:
            file_path = f"/tmp/{file.filename}"
            await file.save(file_path)
        except Exception as e:
            await interaction.followup.send(
                embed=create_error_embed(f"Failed to save file: {e}")
            )
            return

        # Submit via CLI
        success, message = await self.cli.submit_solution(file_path)

        if success:
            # Track submission if exercise/track provided
            if exercise and track:
                self.data.add_submission(
                    interaction.user.id, exercise, track, file_path
                )

            embed = create_success_embed(message)
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(embed=create_error_embed(message))

        # Clean up temp file
        try:
            import os

            os.remove(file_path)
        except Exception:
            pass


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(SubmitCommand(bot))
