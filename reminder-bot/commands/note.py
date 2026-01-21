"""Add/edit notes for reminder command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_reminder_embed

import discord
from discord import app_commands


class NoteCommand(commands.Cog):
    """Add/edit notes for reminder command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(name="note", description="Add or edit notes for a reminder")
    @app_commands.describe(
        reminder_id="Reminder ID (use /reminders to see your reminders)",
        notes="Notes about why you're being reminded",
    )
    async def note(
        self, interaction: discord.Interaction, reminder_id: str, notes: str
    ):
        """Add or edit notes for a reminder."""
        await interaction.response.defer()

        # Get reminder to verify it exists and user owns it
        reminder = self.data.get_reminder(reminder_id, interaction.user.id)
        if not reminder:
            embed = create_error_embed(
                f"Reminder `{reminder_id[:8]}` not found or you don't have permission to edit it"
            )
            await interaction.followup.send(embed=embed)
            return

        # Update notes
        success = self.data.update_reminder_notes(
            reminder_id, interaction.user.id, notes
        )

        if success:
            # Create updated reminder embed
            embed = create_reminder_embed(
                reminder_id=reminder_id,
                message=reminder.get("message", "No message"),
                remind_at=reminder.get("remind_at", ""),
                recurring=reminder.get("recurring"),
                notes=notes,
            )
            embed.title = "✅ Notes Updated"
            await interaction.followup.send(embed=embed)
        else:
            embed = create_error_embed("Failed to update notes")
            await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(NoteCommand(bot))
