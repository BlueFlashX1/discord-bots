"""Workspace command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from utils.embeds import create_success_embed, create_error_embed


class WorkspaceCommand(commands.Cog):
    """Show Exercism workspace location."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    @app_commands.command(
        name="workspace", description="Show your Exercism workspace location"
    )
    async def workspace(self, interaction: discord.Interaction):
        """Show workspace location."""
        await interaction.response.defer()

        workspace = await self.cli.get_workspace()

        if workspace:
            embed = create_success_embed(f"Your Exercism workspace:\n`{workspace}`")
        else:
            embed = create_error_embed(
                "Could not find workspace. Make sure Exercism CLI is configured."
            )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(WorkspaceCommand(bot))
