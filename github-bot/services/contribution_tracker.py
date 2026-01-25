"""Contribution tracking service."""

import asyncio  # Required for exception formatting and asyncio.sleep()
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from discord.ext import tasks
from utils.data_manager import DataManager

from services.github_service import GitHubService

logger = logging.getLogger(__name__)


class ContributionTracker:
    """Tracks GitHub contributions and stats."""

    def __init__(self, bot, github_token: Optional[str], data_manager: DataManager):
        self.bot = bot
        self.github = GitHubService(github_token)
        self.data = data_manager
        self.tracker_task = None

    def start(self):
        """Start tracking contributions."""
        if not self.tracker_task or self.tracker_task.done():
            self.tracker_task = self.update_contributions.start()
            logger.info("Contribution tracking started")

    def stop(self):
        """Stop tracking contributions."""
        if self.tracker_task and not self.tracker_task.done():
            self.tracker_task.cancel()
            logger.info("Contribution tracking stopped")

    async def get_user_contributions(self, username: str) -> Dict:
        """Get contribution statistics for a user."""
        stats = {
            "total_contributions": 0,
            "commits": 0,
            "pull_requests": 0,
            "issues": 0,
            "repositories": 0,
        }

        # Get user events
        events = await self.github.get_user_events(username)
        for event in events:
            event_type = event.get("type", "")
            stats["total_contributions"] += 1

            if event_type == "PushEvent":
                stats["commits"] += len(event.get("payload", {}).get("commits", []))
            elif event_type == "PullRequestEvent":
                stats["pull_requests"] += 1
            elif event_type == "IssuesEvent":
                stats["issues"] += 1

        # Get repository count
        repos = await self.github.get_user_repos(username)
        stats["repositories"] = len(repos)

        return stats

    async def calculate_streak(self, username: str) -> Optional[int]:
        """Calculate contribution streak (simplified)."""
        events = await self.github.get_user_events(username, per_page=100)
        if not events:
            return 0

        # Group events by date
        dates = set()
        for event in events:
            created = event.get("created_at")
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    dates.add(dt.date())
                except:
                    pass

        # Calculate streak (days with at least one contribution)
        today = datetime.utcnow().date()
        streak = 0
        current_date = today

        while current_date in dates:
            streak += 1
            current_date -= timedelta(days=1)

        return streak

    @tasks.loop(hours=1)
    async def update_contributions(self):
        """Periodically update contribution stats for all configured users."""
        # Get all users with GitHub usernames
        import json
        from pathlib import Path

        user_config_file = Path("data/user_config.json")
        if user_config_file.exists():
            with open(user_config_file, "r") as f:
                configs = json.load(f)
        else:
            configs = {}

        if not configs:
            logger.debug("No users configured for contribution tracking")
            return

        logger.debug(f"Updating contributions for {len(configs)} users")
        for user_id_str, config in configs.items():
            if not user_id_str or not config:
                continue
            github_username = config.get("github_username")
            if github_username and isinstance(github_username, str) and github_username.strip():
                try:
                    import asyncio as _aio
                    user_id = int(user_id_str)
                    stats = await self.get_user_contributions(github_username.strip())
                    if stats:
                        self.data.save_contributions(user_id, stats)
                    logger.debug(f"Updated contributions for {github_username}")
                    await _aio.sleep(2)  # Rate limiting
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid user_id format '{user_id_str}': {e}")
                except Exception as e:
                    error_msg = str(e)
                    user_msg = error_msg if "asyncio" not in error_msg.lower() else "Error updating contributions"
                    logger.error(f"Error updating contributions for {github_username}: {user_msg}")

    @update_contributions.before_loop
    async def before_update_contributions(self):
        """Wait until bot is ready."""
        await self.bot.wait_until_ready()
