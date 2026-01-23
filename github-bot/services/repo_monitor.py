"""Repository monitoring service."""

import asyncio  # Required for exception formatting and asyncio.sleep()
import logging
from typing import Dict, Optional
from datetime import datetime
from discord.ext import tasks
from services.github_service import GitHubService
from utils.data_manager import DataManager
from utils.embeds import create_release_embed, create_repo_embed
import discord

logger = logging.getLogger(__name__)


class RepoMonitor:
    """Monitors tracked repositories for updates."""

    def __init__(self, bot: discord.Client, github_token: Optional[str], data_manager: DataManager):
        self.bot = bot
        self.github = GitHubService(github_token)
        self.data = data_manager
        self.monitor_task = None

    def start(self):
        """Start monitoring repositories."""
        if not self.monitor_task or self.monitor_task.done():
            self.monitor_task = self.monitor_repos.start()
            logger.info("Repository monitoring started")

    def stop(self):
        """Stop monitoring repositories."""
        if self.monitor_task and not self.monitor_task.done():
            self.monitor_task.cancel()
            logger.info("Repository monitoring stopped")

    @tasks.loop(minutes=15)
    async def monitor_repos(self):
        """Monitor all tracked repositories."""
        repos = self.data.get_tracked_repos()
        if not repos:
            logger.debug("No repositories to monitor")
            return

        logger.debug(f"Monitoring {len(repos)} repositories")
        for repo_name, config in repos.items():
            try:
                if not repo_name or not isinstance(repo_name, str):
                    continue
                owner, repo = self.github.parse_repo_name(repo_name)
                if not owner or not repo:
                    logger.warning(f"Invalid repo name format: {repo_name}")
                    continue

                # Check for new releases
                latest_release = await self.github.get_latest_release(owner, repo)
                if latest_release:
                    cached = self.data.get_repo_updates(repo_name)
                    cached_tag = cached.get("latest_release_tag")

                    if cached_tag != latest_release.get("tag_name"):
                        # New release found!
                        logger.info(f"New release detected: {repo_name} {latest_release.get('tag_name')}")
                        channel_id = config.get("channel_id")
                        if channel_id:
                            channel = self.bot.get_channel(channel_id)
                            if channel:
                                embed = create_release_embed(
                                    repo_name=repo_name,
                                    release_name=latest_release.get("name", "Untitled"),
                                    tag=latest_release.get("tag_name", ""),
                                    body=latest_release.get("body"),
                                    author=latest_release.get("author", {}).get("login"),
                                    published_at=latest_release.get("published_at"),
                                    url=latest_release.get("html_url"),
                                )
                                await channel.send(
                                    f"🚀 **New Release Detected!**",
                                    embed=embed,
                                )

                        # Update cache
                        updates = cached.copy() if cached else {}
                        updates["latest_release_tag"] = latest_release.get("tag_name")
                        updates["latest_release_time"] = latest_release.get("published_at")
                        self.data.save_repo_updates(repo_name, updates)

                # Update last check time
                self.data.update_repo_last_check(
                    repo_name, datetime.utcnow().isoformat()
                )

                # Rate limiting - sleep between checks
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Error monitoring {repo_name}: {e}", exc_info=True)

    @monitor_repos.before_loop
    async def before_monitor_repos(self):
        """Wait until bot is ready."""
        await self.bot.wait_until_ready()
