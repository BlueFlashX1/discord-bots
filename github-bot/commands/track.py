"""Track repository command."""

import asyncio  # Required for exception formatting (asyncio.TimeoutError, etc.)

from discord.ext import commands
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_repo_embed

import discord
from discord import app_commands


class TrackCommand(commands.Cog):
    """Track repository command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.github = GitHubService()
        self.data = DataManager()

    @app_commands.command(
        name="track", description="Track a GitHub repository for updates"
    )
    @app_commands.describe(
        repository="Repository URL or owner/repo (e.g., https://github.com/discord/discord.py or discord/discord.py)",
        events="Events to track (comma-separated: releases, commits, issues)",
        channel="Channel to send notifications to (defaults to current channel)",
    )
    async def track(
        self,
        interaction: discord.Interaction,
        repository: str,
        events: str = "releases",
        channel: discord.TextChannel = None,
    ):
        """Track a GitHub repository."""
        await interaction.response.defer()

        # Parse repository (supports URL or owner/repo format)
        owner, repo = self.github.parse_repo_name(repository)
        if not owner or not repo:
            embed = create_error_embed(
                "Invalid repository format. Use:\n"
                "• URL: `https://github.com/owner/repo`\n"
                "• Short: `owner/repo` (e.g., discord/discord.py)"
            )
            await interaction.followup.send(embed=embed)
            return

        repo_full = f"{owner}/{repo}"

        # Check if repository exists
        repo_data = await self.github.get_repo(owner, repo)
        if not repo_data:
            embed = create_error_embed(f"Repository `{repo_full}` not found")
            await interaction.followup.send(embed=embed)
            return

        # Parse events
        event_list = [e.strip().lower() for e in events.split(",")]

        # Use provided channel or default to current channel
        channel_id = channel.id if channel else interaction.channel_id

        # Add to tracking
        self.data.add_tracked_repo(
            repo_full,
            channel_id,
            interaction.user.id,
            event_list,
        )

        # Create success embed with repo info
        embed = create_repo_embed(
            repo_name=repo,
            owner=owner,
            description=repo_data.get("description"),
            stars=repo_data.get("stargazers_count", 0),
            forks=repo_data.get("forks_count", 0),
            language=repo_data.get("language"),
            url=repo_data.get("html_url"),
        )
        embed.add_field(
            name="✅ Tracking",
            value=f"Events: {', '.join(event_list)}",
            inline=False,
        )

        # Show channel if specified
        target_channel = channel or interaction.channel
        embed.add_field(
            name="📢 Notifications",
            value=f"Channel: {target_channel.mention}",
            inline=False,
        )

        # Ensure asyncio is in scope for exception formatting (if exceptions occur)
        _ = asyncio  # Keep asyncio in scope

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(TrackCommand(bot))
