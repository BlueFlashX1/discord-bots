"""Pause monitoring command."""

from discord.ext import commands
from utils.data_manager import DataManager
import discord
from discord import app_commands


class PauseCommand(commands.Cog):
    """Pause monitoring command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="pause", description="Pause repository monitoring (stops checking but keeps bot active)")
    async def pause(self, interaction: discord.Interaction):
        """Pause monitoring."""
        await interaction.response.defer()

        status = self.data.get_monitor_status()
        if status.get("paused", False):
            embed = discord.Embed(
                title="⏸️ Already Paused",
                description="Monitoring is already paused.",
                color=discord.Color.orange(),
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        self.data.set_monitor_paused(True)
        
        # Also pause repo monitor if available
        if hasattr(self.bot, 'repo_monitor'):
            self.bot.repo_monitor.pause()

        embed = discord.Embed(
            title="⏸️ Monitoring Paused",
            description="Repository monitoring is paused. Bot remains active but will not check for new releases.",
            color=discord.Color.orange(),
        )
        embed.add_field(
            name="ℹ️ Note",
            value="Use `/resume` to start monitoring again.",
            inline=False,
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(PauseCommand(bot))
