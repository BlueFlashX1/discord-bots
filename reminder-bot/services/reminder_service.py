"""Reminder service for managing reminders."""

import asyncio
import logging
import discord
import pytz
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from discord.ext import commands

UTC = pytz.UTC

logger = logging.getLogger(__name__)


class ReminderService:
    """Service for managing and sending reminders."""

    def __init__(self, bot: commands.Bot, data_manager):
        self.bot = bot
        self.data = data_manager
        self._running = False
        self._task = None

    def start(self):
        """Start the reminder checker."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._check_reminders())
            logger.info("Reminder service started")

    def stop(self):
        """Stop the reminder checker."""
        if self._running:
            self._running = False
            if self._task:
                self._task.cancel()
            logger.info("Reminder service stopped")

    async def create_reminder(self, reminder_data: Dict[str, Any]) -> str:
        """Create a new reminder."""
        # Convert datetime to string if needed
        time_value = reminder_data["time"]
        if isinstance(time_value, datetime):
            time_value = time_value.isoformat()

        reminder_id = self.data.add_reminder(
            user_id=int(reminder_data["user_id"]),
            message=reminder_data["message"],
            remind_at=time_value,
            channel_id=int(reminder_data["channel_id"])
            if reminder_data.get("channel_id")
            else None,
            recurring=reminder_data.get("recurring"),
            notes=reminder_data.get("notes"),
        )
        return str(reminder_id)

    async def _check_reminders(self):
        """Check for due reminders and send them."""
        while self._running:
            try:
                # Get all reminders
                reminders = self.data.get_all_reminders()
                # Use timezone-aware UTC so we can compare with stored remind_at (also UTC-aware)
                now = datetime.now(UTC)

                for reminder in reminders:
                    try:
                        # Parse reminder time (stored as UTC ISO from remind command)
                        raw = reminder["remind_at"]
                        remind_at = datetime.fromisoformat(
                            raw.replace("Z", "+00:00")
                        )
                        if remind_at.tzinfo is None:
                            remind_at = UTC.localize(remind_at)

                        if remind_at <= now:
                            await self._send_reminder(reminder)

                            # Handle recurring reminders
                            if reminder.get("recurring"):
                                next_time = self._get_next_recurring_time(
                                    remind_at, reminder["recurring"]
                                )
                                if next_time.tzinfo is None:
                                    next_time = UTC.localize(next_time)
                                reminder["remind_at"] = next_time.isoformat()
                                self.data.update_reminder(reminder)
                            else:
                                # Delete one-time reminder
                                self.data.delete_reminder(reminder["id"])

                    except Exception as e:
                        logger.error(
                            f"Error processing reminder {reminder.get('id')}: {e}"
                        )

                # Sleep for 30 seconds before next check
                await asyncio.sleep(30)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in reminder checker: {e}")
                await asyncio.sleep(60)  # Wait longer if there's an error

    async def _send_reminder(self, reminder: Dict[str, Any]):
        """Send a reminder to the appropriate channel/user."""
        try:
            user_id = int(reminder["user_id"])
            user = self.bot.get_user(user_id)
            if not user:
                try:
                    user = await self.bot.fetch_user(user_id)
                except Exception as fetch_e:
                    logger.warning(
                        f"User {user_id} not found for reminder {reminder['id']}: {fetch_e}"
                    )
                    return
            if not user:
                return

            # Create embed for reminder
            from utils.embeds import create_reminder_embed

            embed = create_reminder_embed(
                reminder_id=reminder["id"],
                message=reminder["message"],
                remind_at=reminder["remind_at"],
                recurring=reminder.get("recurring"),
                notes=reminder.get("notes"),
            )
            embed.title = "⏰ Reminder!"
            embed.color = discord.Color.blue()

            # Try to send to channel first, then DM
            channel_id = reminder.get("channel_id")
            if channel_id:
                channel = self.bot.get_channel(int(channel_id))
                if channel and isinstance(channel, discord.TextChannel):
                    try:
                        await channel.send(f"{user.mention}", embed=embed)
                        logger.info(
                            f"Sent reminder {reminder['id']} to channel {channel_id}"
                        )
                        return
                    except Exception as e:
                        logger.warning(
                            f"Failed to send reminder {reminder['id']} to channel: {e}"
                        )
                        return

            # Fallback to DM
            try:
                await user.send(embed=embed)
                logger.info(f"Sent reminder {reminder['id']} via DM to user {user_id}")
            except Exception as dm_e:
                logger.error(f"Failed to send reminder {reminder['id']} via DM: {dm_e}")

        except Exception as e:
            logger.error(f"Failed to send reminder {reminder.get('id')}: {e}")

    def _get_next_recurring_time(
        self, current_time: datetime, recurring: str
    ) -> datetime:
        """Calculate the next time for a recurring reminder."""
        if recurring.startswith("daily"):
            return current_time + timedelta(days=1)
        elif recurring.startswith("weekly"):
            # Parse specific days: "weekly on monday,wednesday,friday at 2pm"
            if " on " in recurring:
                days_part = recurring.split(" on ")[1].split(" at ")[0]
                days = [d.strip().lower() for d in days_part.split(",")]
                return self._get_next_weekday_time(current_time, days)
            else:
                return current_time + timedelta(weeks=1)
        elif recurring.startswith("monthly"):
            # Parse different monthly patterns
            return self._parse_monthly_recurring(current_time, recurring)
        else:
            # Default to daily if unknown
            return current_time + timedelta(days=1)

    def _parse_monthly_recurring(
        self, current_time: datetime, recurring: str
    ) -> datetime:
        """Parse monthly recurring patterns."""
        # Pattern: "monthly on 15th at 10am"
        if " on " in recurring and "th" in recurring:
            day_part = recurring.split(" on ")[1].split(" at ")[0]
            try:
                day = int(
                    day_part.replace("st", "")
                    .replace("nd", "")
                    .replace("rd", "")
                    .replace("th", "")
                )
                return self._get_next_monthly_time(current_time, day)
            except ValueError:
                pass

        # Pattern: "monthly on first monday at 10am"
        if " on " in recurring and any(
            week in recurring.lower()
            for week in [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]
        ):
            return self._parse_monthly_weekday_pattern(current_time, recurring)

        # Pattern: "monthly on last friday at 2pm"
        if " on " in recurring and "last" in recurring.lower():
            return self._parse_monthly_last_pattern(current_time, recurring)

        # Default to same day next month
        return current_time + timedelta(days=30)

    def _parse_monthly_weekday_pattern(
        self, current_time: datetime, recurring: str
    ) -> datetime:
        """Parse patterns like 'first monday', 'second tuesday', etc."""
        import re

        # Extract the pattern: "monthly on first monday at 10am"
        pattern_match = re.search(
            r"on (first|second|third|fourth|fifth) (\w+) at", recurring.lower()
        )
        if pattern_match:
            ordinal, weekday = pattern_match.groups()
            week_num = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5}[
                ordinal
            ]

            day_mapping = {
                "monday": 0,
                "tuesday": 1,
                "wednesday": 2,
                "thursday": 3,
                "friday": 4,
                "saturday": 5,
                "sunday": 6,
            }

            target_weekday = day_mapping.get(weekday)
            if target_weekday is not None:
                return self._get_next_monthly_weekday_time(
                    current_time, target_weekday, week_num
                )

        return current_time + timedelta(days=30)

    def _parse_monthly_last_pattern(
        self, current_time: datetime, recurring: str
    ) -> datetime:
        """Parse patterns like 'last friday', 'last tuesday', etc."""
        import re

        # Extract the pattern: "monthly on last friday at 2pm"
        pattern_match = re.search(r"on last (\w+) at", recurring.lower())
        if pattern_match:
            weekday = pattern_match.group(1)

            day_mapping = {
                "monday": 0,
                "tuesday": 1,
                "wednesday": 2,
                "thursday": 3,
                "friday": 4,
                "saturday": 5,
                "sunday": 6,
            }

            target_weekday = day_mapping.get(weekday)
            if target_weekday is not None:
                return self._get_next_monthly_last_weekday_time(
                    current_time, target_weekday
                )

        return current_time + timedelta(days=30)

    def _get_next_monthly_weekday_time(
        self, current_time: datetime, target_weekday: int, week_num: int
    ) -> datetime:
        """Get next occurrence of Nth weekday of month (e.g., 3rd Monday)."""
        # Move to next month
        next_month = current_time.replace(day=1)
        if next_month.month == 12:
            next_month = next_month.replace(year=next_month.year + 1, month=1)
        else:
            next_month = next_month.replace(month=next_month.month + 1)

        # Find the Nth occurrence of the target weekday
        weekday_count = 0
        for day in range(1, 32):
            try:
                test_date = next_month.replace(day=day)
                if test_date.weekday() == target_weekday:
                    weekday_count += 1
                    if weekday_count == week_num:
                        return test_date.replace(
                            hour=current_time.hour,
                            minute=current_time.minute,
                            second=0,
                            microsecond=0,
                        )
            except ValueError:
                break  # Invalid day (e.g., February 30)

        # If not found, go to next month
        return self._get_next_monthly_weekday_time(next_month, target_weekday, week_num)

    def _get_next_monthly_last_weekday_time(
        self, current_time: datetime, target_weekday: int
    ) -> datetime:
        """Get next occurrence of last weekday of month (e.g., last Friday)."""
        # Move to next month
        next_month = current_time.replace(day=1)
        if next_month.month == 12:
            next_month = next_month.replace(year=next_month.year + 1, month=1)
        else:
            next_month = next_month.replace(month=next_month.month + 1)

        # Find the last occurrence of the target weekday
        last_occurrence = None
        for day in range(1, 32):
            try:
                test_date = next_month.replace(day=day)
                if test_date.weekday() == target_weekday:
                    last_occurrence = test_date
            except ValueError:
                break  # Invalid day (e.g., February 30)

        if last_occurrence:
            return last_occurrence.replace(
                hour=current_time.hour,
                minute=current_time.minute,
                second=0,
                microsecond=0,
            )

        # Fallback
        return next_month + timedelta(days=30)

    def _get_next_weekday_time(
        self, current_time: datetime, days: List[str]
    ) -> datetime:
        """Get next occurrence for specific weekdays."""
        day_mapping = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }

        target_days = [day_mapping[d] for d in days if d in day_mapping]
        if not target_days:
            return current_time + timedelta(weeks=1)  # Fallback

        current_day = current_time.weekday()
        days_ahead = min((day - current_day) % 7 for day in target_days)
        if days_ahead == 0:
            days_ahead = 7  # Next week if today

        return current_time + timedelta(days=days_ahead)

    def _get_next_monthly_time(self, current_time: datetime, day: int) -> datetime:
        """Get next occurrence for specific day of month."""
        next_month = current_time.replace(day=1)
        if next_month.month == 12:
            next_month = next_month.replace(year=next_month.year + 1, month=1)
        else:
            next_month = next_month.replace(month=next_month.month + 1)

        # Handle cases where day doesn't exist (e.g., February 30)
        max_day = (
            next_month.replace(
                month=next_month.month + 1 if next_month.month < 12 else 1,
                year=next_month.year + 1 if next_month.month == 12 else next_month.year,
                day=1,
            )
            - timedelta(days=1)
        ).day

        target_day = min(day, max_day)
        return next_month.replace(day=target_day)
