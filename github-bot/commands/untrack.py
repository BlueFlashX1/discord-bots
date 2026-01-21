"""Untrack repository command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed
import discord
from discord import app_commands


class UntrackCommand(commands.Cog):
    """Untrack repository command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="untrack", description="Stop tracking a GitHub repository")
    @app_commands.describe(repository="Repository in format owner/repo")
    async def untrack(self, interaction: discord.Interaction, repository: str):
        """Stop tracking a repository."""
        await interaction.response.defer()

        repos = self.data.get_tracked_repos()
        repo_key = repository.strip()

        if repo_key not in repos:
            embed = create_error_embed(
                f"Repository `{repo_key}` is not being tracked"
            )
            await interaction.followup.send(embed=embed)
            return

        # Verify user owns this tracking entry
        if repos[repo_key]["user_id"] != interaction.user.id:
            embed = create_error_embed(
                "You can only untrack repositories you added"
            )
            await interaction.followup.send(embed=embed)
            return

        self.data.remove_tracked_repo(repo_key)
        embed = create_success_embed(f"Stopped tracking `{repo_key}`")
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(UntrackCommand(bot))
