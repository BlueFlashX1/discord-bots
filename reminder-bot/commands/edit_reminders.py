"""Edit reminder command."""

import discord
from discord.ext import commands
from datetime import datetime, timedelta
from dateutil import parser
from utils.data_manager import DataManager
from utils.embeds import create_error_embed


class EditReminderCommand(commands.Cog):
    """Edit existing reminders."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    def _get_reminder_service(self):
        """Get the reminder service from bot."""
        reminder_service = getattr(self.bot, "reminder_service", None)
        if not reminder_service:
            raise RuntimeError(
                "Reminder service not initialized. Bot may not be ready yet."
            )
        return reminder_service

    def parse_time_input(self, time_str: str) -> datetime:
        """Parse time input with basic formats."""
        try:
            time_str = time_str.lower().strip()
            now = datetime.utcnow()

            # Handle relative times
            if time_str.endswith("m"):
                minutes = int(time_str[:-1])
                if minutes > 0:
                    return now + timedelta(minutes=minutes)
            elif time_str.endswith("h"):
                hours = int(time_str[:-1])
                if hours > 0 and hours <= 23:
                    return now + timedelta(hours=hours)
            elif time_str.endswith("d"):
                days = int(time_str[:-1])
                if days > 0 and days <= 365:
                    return now + timedelta(days=days)

            return parser.parse(time_str, default=now)
        except Exception:
            raise ValueError("Invalid time format")

    @commands.command(name="edit_remind", help="Edit an existing reminder")
    async def edit_remind(
        self, ctx: commands.Context, reminder_id: str, new_time: str
    ) -> None:
        """Edit an existing reminder."""
        user_id = str(ctx.author.id)

        # Parse the new time
        try:
            parsed_time = self.parse_time_input(new_time)
        except ValueError:
            await ctx.send(
                "❌ **Invalid time format**. Try formats like: `30m`, `2h`, `1d`, `tomorrow 9am`"
            )
            return

        # Find the reminder
        reminder = self.data.get_reminder(reminder_id, int(user_id))

        if not reminder:
            await ctx.send(f"❌ **Reminder not found**. Check your ID with `!list`")
            return

        # Update reminder
        success = self.data.update_reminder_time(reminder_id, parsed_time.isoformat())

        if not success:
            await ctx.send("❌ **Failed to update reminder**. Please try again.")
            return

        # Create response
        embed = discord.Embed(
            title="✅ Reminder Updated",
            color=discord.Color.green(),
            timestamp=datetime.now(),
        )

        embed.add_field(
            name="📝 Reminder",
            value=reminder.get("message", "No message"),
            inline=False,
        )
        embed.add_field(
            name="⏰ Time Change",
            value=f"**From**: {reminder.get('remind_at', 'Unknown')}\n**To**: {parsed_time.strftime('%Y-%m-%d %H:%M')}",
            inline=False,
        )

        embed.set_footer(
            text=f"Reminder ID: {reminder_id} • Edited by {ctx.author.name}"
        )
        await ctx.send(embed=embed)

    @commands.command(name="cancel_remind", help="Cancel a reminder")
    async def cancel_remind(self, ctx: commands.Context, reminder_id: str) -> None:
        """Cancel a specific reminder."""
        user_id = str(ctx.author.id)

        # Find the reminder
        reminder = self.data.get_reminder(reminder_id, int(user_id))

        if not reminder:
            await ctx.send(f"❌ **Reminder not found**. Check your ID with `!list`")
            return

        # Delete reminder
        success = self.data.remove_reminder(reminder_id, int(user_id))

        if not success:
            await ctx.send("❌ **Failed to cancel reminder**. Please try again.")
            return

        # Create response
        embed = discord.Embed(
            title="✅ Reminder Cancelled",
            color=discord.Color.orange(),
            timestamp=datetime.now(),
        )

        embed.add_field(
            name="📝 Cancelled Reminder",
            value=reminder.get("message", "No message"),
            inline=False,
        )

        embed.add_field(
            name="⏰ Was Scheduled For",
            value=reminder.get("remind_at", "Unknown time"),
            inline=False,
        )

        embed.set_footer(
            text=f"Reminder ID: {reminder_id} • Cancelled by {ctx.author.name}"
        )

        await ctx.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(EditReminderCommand(bot))
