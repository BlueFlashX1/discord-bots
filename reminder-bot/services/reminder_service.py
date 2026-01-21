"""Reminder service for checking and sending reminders."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from dateutil import parser
from dateutil.relativedelta import relativedelta
from discord.ext import tasks
from utils.data_manager import DataManager

import discord


class ReminderService:
    """Service that checks for due reminders and sends notifications."""

    def __init__(self, bot: discord.Client, data_manager: DataManager):
        self.bot = bot
        self.data = data_manager
        self.checker_task = None

    def start(self):
        """Start checking reminders."""
        if not self.checker_task or self.checker_task.done():
            self.checker_task = self.check_reminders.start()

    def stop(self):
        """Stop checking reminders."""
        if self.checker_task and not self.checker_task.done():
            self.checker_task.cancel()

    def _parse_time_input(self, time_str: str) -> Optional[datetime]:
        """Parse various time input formats."""
        try:
            # Handle relative times like "30m", "2h", "1d"
            time_str = time_str.lower().strip()

            if time_str.endswith("m"):
                minutes = int(time_str[:-1])
                return datetime.utcnow() + timedelta(minutes=minutes)
            elif time_str.endswith("h"):
                hours = int(time_str[:-1])
                return datetime.utcnow() + timedelta(hours=hours)
            elif time_str.endswith("d"):
                days = int(time_str[:-1])
                return datetime.utcnow() + timedelta(days=days)
            elif time_str.endswith("w"):
                weeks = int(time_str[:-1])
                return datetime.utcnow() + timedelta(weeks=weeks)

            # Try parsing as ISO format or natural language
            return parser.parse(time_str, default=datetime.utcnow())
        except:
            return None

    def _get_next_recurrence(self, remind_at: str, recurring: str) -> Optional[str]:
        """Calculate next occurrence for recurring reminder."""
        try:
            dt = parser.parse(remind_at)
            if recurring == "daily":
                next_dt = dt + timedelta(days=1)
            elif recurring == "weekly":
                next_dt = dt + timedelta(weeks=1)
            elif recurring == "monthly":
                next_dt = dt + relativedelta(months=1)
            elif recurring == "yearly":
                next_dt = dt + relativedelta(years=1)
            else:
                return None
            return next_dt.isoformat()
        except:
            return None

    @tasks.loop(seconds=30)
    async def check_reminders(self):
        """Check for due reminders and send notifications."""
        current_time = datetime.utcnow().isoformat()
        due_reminders = self.data.get_due_reminders(current_time)

        for reminder in due_reminders:
            try:
                user_id = reminder.get("user_id")
                message = reminder.get("message", "Reminder!")
                channel_id = reminder.get("channel_id")
                reminder_id = reminder.get("id")
                recurring = reminder.get("recurring")
                notes = reminder.get("notes")

                # Get user
                user = self.bot.get_user(user_id)
                if not user:
                    continue

                # Send reminder
                reminder_text = f"⏰ **Reminder:** {message}"
                if notes:
                    reminder_text += f"\n📝 **Notes:** {notes}"

                if channel_id:
                    # Send to channel if specified
                    channel = self.bot.get_channel(channel_id)
                    if channel:
                        try:
                            await channel.send(f"{user.mention} {reminder_text}")
                        except:
                            # Fallback to DM if can't send to channel
                            await user.send(reminder_text)
                    else:
                        # Channel not found, send DM
                        await user.send(reminder_text)
                else:
                    # Send DM
                    await user.send(reminder_text)

                # Handle recurring reminders
                if recurring:
                    next_time = self._get_next_recurrence(
                        reminder.get("remind_at"), recurring
                    )
                    if next_time:
                        self.data.update_reminder_time(reminder_id, next_time)
                    else:
                        # Invalid recurring format, remove reminder
                        self.data.remove_reminder(reminder_id, user_id)
                else:
                    # One-time reminder, remove it
                    self.data.remove_reminder(reminder_id, user_id)

                # Rate limiting
                await asyncio.sleep(1)

            except Exception as e:
                print(f"Error sending reminder {reminder.get('id')}: {e}")

    @check_reminders.before_loop
    async def before_check_reminders(self):
        """Wait until bot is ready."""
        await self.bot.wait_until_ready()
