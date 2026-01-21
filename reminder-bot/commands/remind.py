"""Set reminder command."""

from datetime import datetime

from discord.ext import commands
from services.reminder_service import ReminderService
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_reminder_embed

import discord
from discord import app_commands


class RemindCommand(commands.Cog):
    """Set reminder command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    def _get_reminder_service(self) -> ReminderService:
        """Get the reminder service from bot."""
        return self.bot.reminder_service

    @app_commands.command(name="remind", description="Set a reminder")
    @app_commands.describe(
        message="What to remind you about",
        time="When to remind (e.g., '30m', '2h', '1d', 'tomorrow 9am', ISO date)",
        channel="Channel to send reminder to (optional, uses server default if set)",
        recurring="Recurring frequency (daily, weekly, monthly, yearly)",
        notes="Optional notes about why you're being reminded",
    )
    @app_commands.choices(
        recurring=[
            app_commands.Choice(name="Daily", value="daily"),
            app_commands.Choice(name="Weekly", value="weekly"),
            app_commands.Choice(name="Monthly", value="monthly"),
            app_commands.Choice(name="Yearly", value="yearly"),
        ]
    )
    async def remind(
        self,
        interaction: discord.Interaction,
        message: str,
        time: str,
        channel: discord.TextChannel = None,
        recurring: str = None,
        notes: str = None,
    ):
        """Set a reminder."""
        await interaction.response.defer()

        # Parse time
        reminder_service = self._get_reminder_service()
        remind_at_dt = reminder_service._parse_time_input(time)

        if not remind_at_dt:
            embed = create_error_embed(
                f"Invalid time format: `{time}`\n"
                "Use formats like: `30m`, `2h`, `1d`, `tomorrow 9am`, or ISO date"
            )
            await interaction.followup.send(embed=embed)
            return

        # Make sure it's in the future
        if remind_at_dt <= datetime.utcnow():
            embed = create_error_embed("Reminder time must be in the future")
            await interaction.followup.send(embed=embed)
            return

        remind_at = remind_at_dt.isoformat()

        # Use specified channel, or default channel, or None (DM)
        if channel:
            channel_id = channel.id
        elif interaction.guild:
            # Check for default channel in guild
            default_channel_id = self.data.get_guild_default_channel(
                interaction.guild.id
            )
            channel_id = default_channel_id
        else:
            # DM context, no channel
            channel_id = None

        # Add reminder
        reminder_id = self.data.add_reminder(
            interaction.user.id,
            message,
            remind_at,
            channel_id,
            recurring,
            notes,
        )

        # Create confirmation embed
        embed = create_reminder_embed(reminder_id, message, remind_at, recurring, notes)
        embed.title = "✅ Reminder Set"

        # Determine where reminder will be sent
        if channel:
            location = f"Channel: {channel.mention}"
        elif channel_id and interaction.guild:
            default_channel = interaction.guild.get_channel(channel_id)
            if default_channel:
                location = f"Default Channel: {default_channel.mention}"
            else:
                location = "Direct Message (default channel not found)"
        else:
            location = "Direct Message"

        embed.add_field(
            name="📢 Location",
            value=location,
            inline=False,
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(RemindCommand(bot))
