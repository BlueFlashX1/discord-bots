"""Cancel reminder command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed
import discord
from discord import app_commands
from typing import List


class CancelCommand(commands.Cog):
    """Cancel reminder command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    async def reminder_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> List[app_commands.Choice[str]]:
        """Autocomplete handler for reminder selection."""
        reminders = self.data.get_user_reminders(interaction.user.id)

        if not reminders:
            return []

        # Sort by remind_at
        sorted_reminders = sorted(reminders, key=lambda r: r.get("remind_at", ""))

        choices = []
        for i, reminder in enumerate(sorted_reminders[:25], 1):
            message = reminder.get("message", "No message")[:80]
            remind_at = reminder.get("remind_at", "")[:19]  # Truncate timestamp
            reminder_id = reminder.get("id", "")

            # Format: "1. Message... (2026-02-07 21:00)"
            label = f"{i}. {message[:50]} ({remind_at})"

            choices.append(app_commands.Choice(name=label, value=reminder_id))

        return choices

    @app_commands.command(name="cancel", description="Cancel a reminder")
    @app_commands.describe(reminder="Select a reminder to cancel")
    @app_commands.autocomplete(reminder=reminder_autocomplete)
    async def cancel(self, interaction: discord.Interaction, reminder: str):
        """Cancel a reminder."""
        await interaction.response.defer()

        success = self.data.remove_reminder(reminder, interaction.user.id)

        if success:
            embed = create_success_embed(f"Reminder cancelled successfully")
            await interaction.followup.send(embed=embed)
        else:
            embed = create_error_embed(
                f"Reminder not found or you don't have permission to cancel it"
            )
            await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(CancelCommand(bot))
