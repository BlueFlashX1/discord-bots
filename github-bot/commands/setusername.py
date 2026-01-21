"""Set GitHub username command."""

from discord.ext import commands
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed

import discord
from discord import app_commands


class SetUsernameCommand(commands.Cog):
    """Set GitHub username command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.github = GitHubService()
        self.data = DataManager()

    @app_commands.command(
        name="setusername", description="Set your GitHub username for stats tracking"
    )
    @app_commands.describe(username="Your GitHub username")
    async def setusername(self, interaction: discord.Interaction, username: str):
        """Set GitHub username."""
        await interaction.response.defer()

        # Verify username exists
        user_data = await self.github.get_user(username)
        if not user_data:
            embed = create_error_embed(f"GitHub user `{username}` not found")
            await interaction.followup.send(embed=embed)
            return

        # Save username
        self.data.set_user_github_username(interaction.user.id, username)

        embed = create_success_embed(
            f"GitHub username set to `{username}`. Use `/stats` to see your contributions!"
        )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(SetUsernameCommand(bot))
