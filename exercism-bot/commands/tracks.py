"""Tracks command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from utils.embeds import create_tracks_embed


class TracksCommand(commands.Cog):
    """List available tracks."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    @app_commands.command(name="tracks", description="List available programming tracks")
    async def tracks(self, interaction: discord.Interaction):
        """List available tracks."""
        await interaction.response.defer()

        tracks = await self.cli.list_tracks()
        embed = create_tracks_embed(tracks)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(TracksCommand(bot))
