"""Contribution stats command."""

import asyncio  # noqa: F401 - Required for exception type resolution
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
        import sys

        print(
            f"[DEBUG] /stats command invoked at {__import__('datetime').datetime.now()}",
            file=sys.stderr,
            flush=True,
        )

        try:
            await interaction.response.defer()
            print("[DEBUG] defer() succeeded", file=sys.stderr, flush=True)
        except Exception as defer_err:
            print(
                f"[DEBUG] defer() FAILED: {type(defer_err).__name__}: {defer_err}",
                file=sys.stderr,
                flush=True,
            )
            raise  # Re-raise to let discord.py handle it

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
            # EXPLICIT DEBUG: Print to stdout to ensure it shows in logs
            import sys

            print(
                f"[DEBUG STATS] Exception caught: {type(e).__name__}: {e}",
                file=sys.stderr,
                flush=True,
            )

            # Ensure asyncio is in scope for exception formatting
            _ = asyncio  # noqa: F841 - Keep asyncio in scope for exception type resolution
            # Avoid traceback.format_exception which may trigger asyncio NameError
            # when formatting asyncio exception types
            error_type = type(e).__name__
            error_module = getattr(type(e), "__module__", "")
            error_msg = str(e)

            if error_module:
                error_details = f"{error_module}.{error_type}: {error_msg}"
            else:
                error_details = f"{error_type}: {error_msg}"

            print(
                f"[DEBUG STATS] Sending error embed: {error_msg}",
                file=sys.stderr,
                flush=True,
            )
            logger.error(f"Error fetching stats: {error_details}")

            embed = create_error_embed(f"Error fetching stats: {error_msg}")
            await interaction.followup.send(embed=embed)

    async def _get_stats_fallback(self, username: str):
        """Fallback method to get stats."""
        tracker = ContributionTracker(self.bot, None, self.data)
        return await tracker.get_user_contributions(username)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(StatsCommand(bot))
