"""Contribution stats command."""

import logging

from discord.ext import commands
from services.contribution_tracker import ContributionTracker
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_contribution_stats_embed, create_error_embed

import discord
from discord import app_commands

logger = logging.getLogger(__name__)


class StatsCommand(commands.Cog):
    """Contribution stats command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.github = GitHubService()
        self.data = DataManager()
        self.tracker = None  # Will be set in on_ready

    def set_tracker(self, tracker: ContributionTracker):
        """Set the contribution tracker."""
        self.tracker = tracker

    @app_commands.command(
        name="stats", description="Get GitHub contribution statistics"
    )
    @app_commands.describe(
        username="GitHub username (defaults to your configured username)"
    )
    async def stats(self, interaction: discord.Interaction, username: str = None):
        """Get contribution statistics."""
        try:
            await interaction.response.defer()
        except Exception:
            raise

        # Get username
        if not username:
            username = self.data.get_user_github_username(interaction.user.id)
            if not username:
                embed = create_error_embed(
                    "No GitHub username set. Use `/setusername <username>` or provide a username."
                )
                await interaction.followup.send(embed=embed)
                return

        # Get stats
        try:
            if self.tracker:
                stats = await self.tracker.get_user_contributions(username)
                streak = await self.tracker.calculate_streak(username)
            else:
                # Fallback if tracker not available
                stats = await self._get_stats_fallback(username)
                streak = None

            embed = create_contribution_stats_embed(username, stats, streak)
            await interaction.followup.send(embed=embed)

        except Exception as e:
            error_type = type(e).__name__
            error_module = getattr(type(e), "__module__", "")
            error_msg = str(e)
            if error_module:
                error_details = f"{error_module}.{error_type}: {error_msg}"
            else:
                error_details = f"{error_type}: {error_msg}"
            logger.error(f"Error fetching stats: {error_details}")

            user_msg = error_msg if "asyncio" not in error_msg.lower() else "A temporary error occurred. Please try again."
            embed = create_error_embed(f"Error fetching stats: {user_msg}")
            await interaction.followup.send(embed=embed)

    async def _get_stats_fallback(self, username: str):
        """Fallback method to get stats."""
        tracker = ContributionTracker(self.bot, None, self.data)
        return await tracker.get_user_contributions(username)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(StatsCommand(bot))
