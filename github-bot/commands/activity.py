"""Recent activity command."""

from discord.ext import commands
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_activity_embed, create_error_embed
import discord
from discord import app_commands


class ActivityCommand(commands.Cog):
    """Recent activity command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.github = GitHubService()
        self.data = DataManager()

    @app_commands.command(name="activity", description="Get recent GitHub activity")
    @app_commands.describe(
        username="GitHub username (defaults to your configured username)",
        limit="Number of activities to show (default: 10, max: 30)"
    )
    async def activity(
        self,
        interaction: discord.Interaction,
        username: str = None,
        limit: int = 10,
    ):
        """Get recent GitHub activity."""
        await interaction.response.defer()

        # Get username
        if not username:
            username = self.data.get_user_github_username(interaction.user.id)
            if not username:
                embed = create_error_embed(
                    "No GitHub username set. Use `/setusername <username>` or provide a username."
                )
                await interaction.followup.send(embed=embed)
                return

        # Clamp limit
        limit = max(1, min(limit, 30))

        try:
            activities = await self.github.get_user_events(username, per_page=limit)
            embed = create_activity_embed(username, activities, limit)
            await interaction.followup.send(embed=embed)

        except Exception as e:
            error_msg = str(e)
            user_msg = error_msg if "asyncio" not in error_msg.lower() else "A temporary error occurred. Please try again."
            embed = create_error_embed(f"Error fetching activity: {user_msg}")
            await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(ActivityCommand(bot))
