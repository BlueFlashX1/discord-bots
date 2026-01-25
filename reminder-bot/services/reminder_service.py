"""Reminder service for checking and sending reminders."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from dateutil import parser
from dateutil.relativedelta import relativedelta
from discord.ext import tasks
from utils.data_manager import DataManager
from utils.retry import retry_discord_api

import discord

logger = logging.getLogger(__name__)


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
            logger.info("Reminder checker task started")

    def stop(self):
        """Stop checking reminders."""
        if self.checker_task and not self.checker_task.done():
            self.checker_task.cancel()
            logger.info("Reminder checker task stopped")

    def _parse_time_input(self, time_str: str) -> Optional[datetime]:
        """Parse various time input formats."""
        if not time_str or not isinstance(time_str, str):
            return None
        
        try:
            # Handle relative times like "30m", "2h", "1d"
            time_str = time_str.lower().strip()
            
            if not time_str:
                return None

            if time_str.endswith("m"):
                minutes = int(time_str[:-1])
                if minutes < 0:
                    return None
                return datetime.utcnow() + timedelta(minutes=minutes)
            elif time_str.endswith("h"):
                hours = int(time_str[:-1])
                if hours < 0:
                    return None
                return datetime.utcnow() + timedelta(hours=hours)
            elif time_str.endswith("d"):
                days = int(time_str[:-1])
                if days < 0:
                    return None
                return datetime.utcnow() + timedelta(days=days)
            elif time_str.endswith("w"):
                weeks = int(time_str[:-1])
                if weeks < 0:
                    return None
                return datetime.utcnow() + timedelta(weeks=weeks)

            # Try parsing as ISO format or natural language
            return parser.parse(time_str, default=datetime.utcnow())
        except (ValueError, TypeError, AttributeError) as e:
            logger.debug(f"Time parsing failed for '{time_str}': {e}")
            return None

    def _get_next_recurrence(self, remind_at: str, recurring: str) -> Optional[str]:
        """Calculate next occurrence for recurring reminder."""
        if not remind_at or not recurring:
            return None
        
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
        except (ValueError, TypeError, AttributeError) as e:
            logger.warning(f"Recurrence calculation failed for '{remind_at}' ({recurring}): {e}")
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

                # Validate reminder data
                if not user_id or not reminder_id:
                    logger.warning(f"Skipping invalid reminder: missing user_id or id")
                    continue

                # Get user
                user = self.bot.get_user(user_id)
                if not user:
                    logger.debug(f"User {user_id} not found, skipping reminder {reminder_id}")
                    continue

                # Type narrowing: user is guaranteed to be discord.User after None check
                # Store in local variable for lambda capture (Pyright type narrowing)
                user_obj: discord.User = user
                
                # Get user mention safely
                user_mention = getattr(user_obj, 'mention', f"<@{user_id}>")

                # Send reminder
                reminder_text = f"⏰ **Reminder:** {message}"
                if notes:
                    reminder_text += f"\n📝 **Notes:** {notes}"

                if channel_id:
                    # Send to channel if specified
                    try:
                        channel = self.bot.get_channel(channel_id)
                        # Check if channel exists and is Messageable (has send method)
                        # Use isinstance check for type safety
                        if channel and isinstance(channel, discord.abc.Messageable):
                            # Use retry logic for channel send
                            # Store channel in local variable for lambda capture
                            channel_obj: discord.abc.Messageable = channel
                            sent = await retry_discord_api(
                                lambda: channel_obj.send(f"{user_mention} {reminder_text}"),
                                operation_name=f"Send reminder to channel {channel_id}"
                            )
                            if not sent:
                                # Fallback to DM if channel send failed
                                logger.debug(f"Channel send failed, falling back to DM for user {user_id}")
                                await retry_discord_api(
                                    lambda: user_obj.send(reminder_text),
                                    operation_name=f"Send reminder DM to user {user_id}"
                                )
                        else:
                            # Channel not found or not sendable, send DM
                            logger.debug(f"Channel {channel_id} not found or not sendable, sending DM to user {user_id}")
                            await retry_discord_api(
                                lambda: user_obj.send(reminder_text),
                                operation_name=f"Send reminder DM to user {user_id}"
                            )
                    except Exception as e:
                        logger.warning(f"Error accessing channel {channel_id}: {e}, sending DM instead")
                        await retry_discord_api(
                            lambda: user_obj.send(reminder_text),
                            operation_name=f"Send reminder DM to user {user_id}"
                        )
                else:
                    # Send DM
                    sent = await retry_discord_api(
                        lambda: user_obj.send(reminder_text),
                        operation_name=f"Send reminder DM to user {user_id}"
                    )
                    if not sent:
                        logger.warning(f"Failed to send reminder DM to user {user_id}")

                # Handle recurring reminders
                if recurring:
                    remind_at = reminder.get("remind_at")
                    # Only process if remind_at is not None
                    if remind_at is not None:
                        next_time = self._get_next_recurrence(remind_at, recurring)
                        if next_time:
                            self.data.update_reminder_time(reminder_id, next_time)
                        else:
                            # Invalid recurring format, remove reminder
                            self.data.remove_reminder(reminder_id, user_id)
                    else:
                        # Missing remind_at, remove reminder
                        logger.warning(f"Reminder {reminder_id} has recurring but no remind_at, removing")
                        self.data.remove_reminder(reminder_id, user_id)
                else:
                    # One-time reminder, remove it
                    self.data.remove_reminder(reminder_id, user_id)

                # Rate limiting
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Error processing reminder {reminder.get('id')}: {e}", exc_info=True)

    @check_reminders.before_loop
    async def before_check_reminders(self):
        """Wait until bot is ready."""
        await self.bot.wait_until_ready()
