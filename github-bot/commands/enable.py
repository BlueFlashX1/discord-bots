"""Enable/disable repository tracking command."""

from discord.ext import commands
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed
import discord
from discord import app_commands


class EnableCommand(commands.Cog):
    """Enable/disable repository tracking command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.github = GitHubService()
        self.data = DataManager()

    @app_commands.command(name="enable", description="Enable or disable tracking for a repository")
    @app_commands.describe(
        repository="Repository to enable/disable (owner/repo format)",
        enabled="Enable or disable tracking",
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        repository: str,
        enabled: bool = True,
    ):
        """Enable or disable repository tracking."""
        await interaction.response.defer()

        # Parse repository
        owner, repo = self.github.parse_repo_name(repository)
        if not owner or not repo:
            embed = create_error_embed(
                "Invalid repository format. Use:\n"
                "• URL: `https://github.com/owner/repo`\n"
                "• Short: `owner/repo`"
            )
            await interaction.followup.send(embed=embed)
            return

        repo_full = f"{owner}/{repo}"

        # Check if repository is tracked
        repos = self.data.get_tracked_repos()
        if repo_full not in repos:
            embed = create_error_embed(f"Repository `{repo_full}` is not being tracked. Use `/track` first.")
            await interaction.followup.send(embed=embed)
            return

        # Check if user owns this tracking
        if repos[repo_full]["user_id"] != interaction.user.id:
            embed = create_error_embed("You can only enable/disable repositories you're tracking.")
            await interaction.followup.send(embed=embed)
            return

        # Update enabled status
        self.data.set_repo_enabled(repo_full, enabled)

        status = "enabled" if enabled else "disabled"
        embed = create_success_embed(
            f"Repository `{repo_full}` tracking has been {status}."
        )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(EnableCommand(bot))
