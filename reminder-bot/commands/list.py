"""List reminders command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_reminder_list_embed
import discord
from discord import app_commands


class ListCommand(commands.Cog):
    """List reminders command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="reminders", description="List all your reminders")
    async def reminders(self, interaction: discord.Interaction):
        """List all reminders."""
        await interaction.response.defer()

        reminders = self.data.get_user_reminders(interaction.user.id)
        embed = create_reminder_list_embed(reminders)
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(ListCommand(bot))
