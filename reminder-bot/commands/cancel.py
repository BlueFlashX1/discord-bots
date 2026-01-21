"""Cancel reminder command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed
import discord
from discord import app_commands


class CancelCommand(commands.Cog):
    """Cancel reminder command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="cancel", description="Cancel a reminder")
    @app_commands.describe(reminder_id="Reminder ID (use /list to see your reminders)")
    async def cancel(self, interaction: discord.Interaction, reminder_id: str):
        """Cancel a reminder."""
        await interaction.response.defer()

        success = self.data.remove_reminder(reminder_id, interaction.user.id)

        if success:
            embed = create_success_embed(f"Reminder `{reminder_id[:8]}` cancelled")
            await interaction.followup.send(embed=embed)
        else:
            embed = create_error_embed(
                f"Reminder `{reminder_id[:8]}` not found or you don't have permission to cancel it"
            )
            await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(CancelCommand(bot))
