"""Simple reminder command with flexible recurring support."""

import discord
from discord.ext import commands
from discord import app_commands
from datetime import datetime, timedelta
from dateutil import parser
from typing import Optional
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_reminder_embed


class RemindCommand(commands.Cog):
    """Simple reminder command with flexible recurring support."""

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

    def parse_time_input(self, time_str: str) -> Optional[datetime]:
        """Parse various time input formats."""
        if not time_str:
            return None

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
            elif time_str.endswith("w"):
                weeks = int(time_str[:-1])
                if weeks > 0 and weeks <= 52:
                    return now + timedelta(weeks=weeks)

            return parser.parse(time_str, default=now)
        except Exception:
            return None

    def parse_recurring_input(self, recurring_str: str) -> Optional[str]:
        """Parse recurring reminder format with flexible day selection."""
        if not recurring_str:
            return None

        recurring_str = recurring_str.lower().strip()

        # Simple formats
        if recurring_str in ["daily", "everyday"]:
            return "daily at {time}"
        elif recurring_str in ["weekly", "everyweek"]:
            return "weekly at {time}"
        elif recurring_str in ["monthly", "everymonth"]:
            return "monthly at {time}"

        # Weekly with specific days: "weekly on monday,wednesday,friday"
        if recurring_str.startswith("weekly on"):
            return f"{recurring_str} at {{time}}"

        # Monthly with specific day: "monthly on 15th"
        if recurring_str.startswith("monthly on"):
            return f"{recurring_str} at {{time}}"

        # Enhanced monthly patterns:
        # "monthly on first monday", "monthly on second tuesday", "monthly on last friday"
        if recurring_str.startswith("monthly on ") and any(
            word in recurring_str
            for word in ["first", "second", "third", "fourth", "fifth", "last"]
        ):
            return f"{recurring_str} at {{time}}"

        # Daily/weekly/monthly with time: "daily at 9am", "weekly on monday at 2pm"
        if " at " in recurring_str:
            return recurring_str

        return None

    @commands.command(name="remind", description="Set a reminder")
    async def remind_command(
        self,
        ctx,
        message: str,
        time: str = None,
        recurring: str = None,
    ) -> None:
        """Set a reminder."""
        reminder_service = self._get_reminder_service()

        # Parse time
        remind_at_dt = self.parse_time_input(time)
        if not remind_at_dt:
            await ctx.send(
                f"❌ Invalid time format: `{time}`\n"
                "Use formats like: `30m`, `2h`, `1d`, `tomorrow 9am`, `2024-01-15 14:30`"
            )
            return

        # Make sure it's in the future
        if remind_at_dt <= datetime.utcnow():
            await ctx.send("❌ Reminder time must be in the future")
            return

        # Parse recurring
        recurring_pattern = None
        if recurring:
            recurring_pattern = self.parse_recurring_input(recurring)
            if not recurring_pattern:
                await ctx.send(
                    f"❌ Invalid recurring format: `{recurring}`\n"
                    "Use formats like: `daily`, `weekly`, `monthly`, `daily at 9am`, "
                    "`weekly on monday,wednesday at 2pm`, `monthly on 15th at 10am`"
                )
                return

            # Insert time into recurring pattern
            time_str = remind_at_dt.strftime("%I:%M%p").lower()
            recurring_pattern = recurring_pattern.format(time=time_str)

        # Create reminder data
        reminder_data = {
            "user_id": str(ctx.author.id),
            "message": message,
            "time": remind_at_dt,
            "channel_id": str(ctx.channel.id),
            "recurring": recurring_pattern,
        }

        reminder_id = await reminder_service.create_reminder(reminder_data)

        # Create response
        response = f"✅ **Reminder Set**: {message}\n"
        response += f"⏰ **Time**: {remind_at_dt.strftime('%Y-%m-%d %I:%M %p')}\n"
        response += f"🆔 **ID**: {reminder_id}"

        if recurring_pattern:
            response += f"\n🔁 **Recurring**: {recurring_pattern}"

        response += f"\n📍 **Location**: {ctx.channel.mention}"

        await ctx.send(response)

    @commands.command(name="time_help", description="Get help with time formats")
    async def time_help(self, ctx):
        """Show help for time parsing."""
        help_text = """
        🕐 **Enhanced Time Format Help**
        
        **Basic Time Formats:**
        • `30m` - 30 minutes from now
        • `2h` - 2 hours from now  
        • `1d` - 1 day from now
        • `1w` - 1 week from now
        • `tomorrow 9am` - Tomorrow at 9 AM
        • `2024-01-15 14:30` - Specific date and time
        
        **Recurring Formats:**
        
        **Daily:**
        • `daily` - Every day at the specified time
        • `daily at 9am` - Every day at 9 AM
        
        **Weekly (Multi-select days):**
        • `weekly` - Every week at the specified time
        • `weekly on monday` - Every Monday
        • `weekly on monday,wednesday,friday` - Mon/Wed/Fri
        • `weekly on tuesday,thursday at 2pm` - Tue/Thu at 2 PM
        • `weekly on saturday,sunday at 10am` - Weekends at 10 AM
        
        **Monthly (Flexible patterns):**
        • `monthly` - Every month on the same day
        • `monthly on 15th at 10am` - Every 15th at 10 AM
        • `monthly on 1st at 9am` - Every 1st at 9 AM
        • `monthly on first monday at 2pm` - First Monday of each month
        • `monthly on second tuesday at 3pm` - Second Tuesday of each month
        • `monthly on third wednesday at 4pm` - Third Wednesday of each month
        • `monthly on last friday at 5pm` - Last Friday of each month
        • `monthly on last sunday at 6pm` - Last Sunday of each month
        
        **Examples:**
        `!remind "Take medicine" daily at 8am`
        `!remind "Gym workout" weekly on monday,wednesday,friday at 6pm`
        `!remind "Team meeting" weekly on monday at 2pm`
        `!remind "Pay rent" monthly on 1st at 9am`
        `!remind "Book club" monthly on first thursday at 7pm`
        `!remind "Project review" monthly on last friday at 4pm`
        `!remind "Call doctor" tomorrow 3pm`
        """

        await ctx.send(help_text)

    @app_commands.command(name="remind", description="Set a reminder")
    async def remind_slash(
        self,
        interaction: discord.Interaction,
        message: str,
        time: str,
        recurring: Optional[str] = None,
    ):
        """Set a reminder via slash command."""
        await interaction.response.defer()

        reminder_service = self._get_reminder_service()
        remind_at_dt = self.parse_time_input(time)

        if not remind_at_dt:
            embed = create_error_embed(
                f"Invalid time format: `{time}`\n"
                "Use formats like: `30m`, `2h`, `1d`, `tomorrow 9am`, or ISO date"
            )
            await interaction.followup.send(embed=embed)
            return

        if remind_at_dt <= datetime.utcnow():
            embed = create_error_embed("Reminder time must be in the future")
            await interaction.followup.send(embed=embed)
            return

        # Parse recurring
        recurring_pattern = None
        if recurring:
            recurring_pattern = self.parse_recurring_input(recurring)
            if not recurring_pattern:
                embed = create_error_embed(
                    f"Invalid recurring format: `{recurring}`\n"
                    "Use formats like: `daily`, `weekly`, `monthly`, `daily at 9am`, "
                    "`weekly on monday,wednesday at 2pm`, `monthly on 15th at 10am`"
                )
                await interaction.followup.send(embed=embed)
                return

            # Insert time into recurring pattern
            time_str = remind_at_dt.strftime("%I:%M%p").lower()
            recurring_pattern = recurring_pattern.format(time=time_str)

        # Create reminder data
        reminder_data = {
            "user_id": str(interaction.user.id),
            "message": message,
            "time": remind_at_dt,
            "channel_id": str(interaction.channel.id)
            if interaction.channel and interaction.guild
            else None,
            "recurring": recurring_pattern,
        }

        reminder_id = await reminder_service.create_reminder(reminder_data)

        # Create confirmation embed
        embed = create_reminder_embed(
            str(reminder_id), message, remind_at_dt.isoformat(), recurring_pattern
        )
        embed.title = "✅ Reminder Set"

        location = (
            interaction.channel.mention
            if (interaction.channel and hasattr(interaction.channel, "mention"))
            else "Direct Message"
        )
        embed.add_field(name="📍 Location", value=location, inline=False)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(RemindCommand(bot))
