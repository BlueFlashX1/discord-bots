"""List tracked repositories command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_tracked_repos_embed
import discord
from discord import app_commands


class TrackedCommand(commands.Cog):
    """List tracked repositories command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="tracked", description="List all tracked repositories with status")
    async def tracked(self, interaction: discord.Interaction):
        """List all tracked repositories."""
        await interaction.response.defer()

        repos = self.data.get_tracked_repos()

        # Filter to user's repos only
        user_repos = {
            repo: config
            for repo, config in repos.items()
            if config["user_id"] == interaction.user.id
        }

        if not user_repos:
            embed = discord.Embed(
                title="📋 Tracked Repositories",
                description="No repositories being tracked. Use `/track` to add one.",
                color=discord.Color.blue(),
            )
            await interaction.followup.send(embed=embed)
            return

        embed = discord.Embed(
            title="📋 Tracked Repositories",
            description=f"Currently tracking {len(user_repos)} repository/repositories",
            color=discord.Color.blue(),
        )

        for repo, config in list(user_repos.items())[:20]:
            events = ", ".join(config.get("events", []))
            enabled = config.get("enabled", True)
            status = "✅" if enabled else "⏸️"
            release_filter = config.get("release_filter", "all")
            
            filter_display = {
                "all": "All",
                "stable": "Stable only",
                "pre-release": "Pre-release only",
            }.get(release_filter, "All")
            
            value = f"{status} Events: {events or 'All'}"
            if "releases" in events:
                value += f" | Filter: {filter_display}"
            
            embed.add_field(
                name=f"📦 {repo}",
                value=value,
                inline=False,
            )

        if len(user_repos) > 20:
            embed.set_footer(text=f"Showing 20 of {len(user_repos)} repositories")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(TrackedCommand(bot))
