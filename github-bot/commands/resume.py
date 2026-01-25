"""Resume monitoring command."""

from discord.ext import commands
from utils.data_manager import DataManager
import discord
from discord import app_commands


class ResumeCommand(commands.Cog):
    """Resume monitoring command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="resume", description="Resume repository monitoring (starts checking for releases again)")
    async def resume(self, interaction: discord.Interaction):
        """Resume monitoring."""
        await interaction.response.defer()

        status = self.data.get_monitor_status()
        if not status.get("paused", False):
            embed = discord.Embed(
                title="✅ Already Running",
                description="Monitoring is already active.",
                color=discord.Color.green(),
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        self.data.set_monitor_paused(False)
        
        # Also resume repo monitor if available
        if hasattr(self.bot, 'repo_monitor'):
            self.bot.repo_monitor.resume()

        embed = discord.Embed(
            title="✅ Monitoring Resumed",
            description="Repository monitoring has resumed. Bot will now check for new releases every 15 minutes.",
            color=discord.Color.green(),
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(ResumeCommand(bot))
