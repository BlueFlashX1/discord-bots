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

    @app_commands.command(name="tracked", description="List all tracked repositories")
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

        embed = create_tracked_repos_embed(user_repos)
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(TrackedCommand(bot))
