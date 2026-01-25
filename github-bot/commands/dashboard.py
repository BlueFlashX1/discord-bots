"""Dashboard command for GitHub bot."""

from discord.ext import commands
from utils.data_manager import DataManager
from services.github_service import GitHubService
import discord
from discord import app_commands
from datetime import datetime


class DashboardCommand(commands.Cog):
    """Dashboard command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()
        self.github = GitHubService()

    @app_commands.command(name="dashboard", description="View GitHub bot status and statistics")
    async def dashboard(self, interaction: discord.Interaction):
        """Show bot dashboard."""
        await interaction.response.defer()

        repos = self.data.get_tracked_repos()
        enabled_repos = [r for r, c in repos.items() if c.get("enabled", True)]
        paused_repos = [r for r, c in repos.items() if not c.get("enabled", True)]
        
        status = self.data.get_monitor_status()
        is_paused = status.get("paused", False)
        
        # Get user's repos
        user_repos = {
            repo: config
            for repo, config in repos.items()
            if config.get("user_id") == interaction.user.id
        }

        embed = discord.Embed(
            title="📊 GitHub Bot Dashboard",
            description="Bot status and monitoring statistics",
            color=discord.Color.blue(),
        )

        # Monitoring status
        monitor_status = "⏸️ Paused" if is_paused else "✅ Active"
        embed.add_field(
            name="🔄 Monitoring Status",
            value=monitor_status,
            inline=True,
        )

        # Repository counts
        embed.add_field(
            name="📦 Repositories",
            value=f"Total: {len(repos)}\nActive: {len(enabled_repos)}\nPaused: {len(paused_repos)}",
            inline=True,
        )

        # User's repos
        embed.add_field(
            name="👤 Your Repos",
            value=f"{len(user_repos)} tracked",
            inline=True,
        )

        # Last check time
        last_check = status.get("last_check")
        if last_check:
            try:
                dt = datetime.fromisoformat(last_check.replace("Z", "+00:00"))
                last_check_str = f"<t:{int(dt.timestamp())}:R>"
            except:
                last_check_str = last_check
        else:
            last_check_str = "Never"
        
        embed.add_field(
            name="⏰ Last Check",
            value=last_check_str,
            inline=True,
        )

        # Check interval
        embed.add_field(
            name="🔄 Check Interval",
            value="Every 15 minutes",
            inline=True,
        )

        # GitHub API status
        has_token = self.github.token is not None
        embed.add_field(
            name="🔑 GitHub Token",
            value="✅ Configured" if has_token else "⚠️ Not set (limited features)",
            inline=True,
        )

        if is_paused:
            embed.add_field(
                name="ℹ️ Note",
                value="Use `/resume` to start monitoring again.",
                inline=False,
            )

        embed.set_footer(text="GitHub Bot Dashboard")
        embed.timestamp = datetime.utcnow()

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(DashboardCommand(bot))
