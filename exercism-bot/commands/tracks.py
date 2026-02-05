"""Tracks command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from services.exercism_api import get_exercism_api
from utils.embeds import create_tracks_embed


class TracksCommand(commands.Cog):
    """List available tracks."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.api = get_exercism_api()

    @app_commands.command(name="tracks", description="List available programming tracks")
    async def tracks(self, interaction: discord.Interaction):
        """List available tracks with user's joined tracks highlighted."""
        await interaction.response.defer()

        # Get all tracks and user's joined tracks
        all_tracks = await self.cli.list_tracks()
        
        # Try to get user's joined tracks from API
        user_tracks = []
        try:
            joined = await self.api.get_user_tracks()
            user_tracks = [t.get("slug") for t in joined if t.get("slug")]
        except Exception:
            pass
        
        embed = create_tracks_embed(all_tracks, user_tracks)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(TracksCommand(bot))
