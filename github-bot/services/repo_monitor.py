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

    def is_paused(self) -> bool:
        """Check if monitoring is paused."""
        status = self.data.get_monitor_status()
        return status.get("paused", False)

    def pause(self):
        """Pause monitoring."""
        self.data.set_monitor_paused(True)
        logger.info("Repository monitoring paused")

    def resume(self):
        """Resume monitoring."""
        self.data.set_monitor_paused(False)
        logger.info("Repository monitoring resumed")

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
        # Check if paused
        if self.is_paused():
            logger.debug("Monitoring is paused")
            return

        repos = self.data.get_tracked_repos()
        if not repos:
            logger.debug("No repositories to monitor")
            return

        # Filter to enabled repos only
        enabled_repos = {
            repo: config
            for repo, config in repos.items()
            if config.get("enabled", True)
        }

        if not enabled_repos:
            logger.debug("No enabled repositories to monitor")
            return

        logger.debug(f"Monitoring {len(enabled_repos)} repositories")
        for repo_name, config in enabled_repos.items():
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
                    # Apply release filter
                    release_filter = config.get("release_filter", "all")
                    is_prerelease = latest_release.get("prerelease", False)

                    if release_filter == "stable" and is_prerelease:
                        logger.debug(f"Skipping pre-release for {repo_name} (filter: stable)")
                        continue

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
                                    is_prerelease=is_prerelease,
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
                error_msg = str(e)
                user_msg = error_msg if "asyncio" not in error_msg.lower() else "Error monitoring repository"
                logger.error(f"Error monitoring {repo_name}: {user_msg}")
        
        # Update global last check time
        status = self.data.get_monitor_status()
        status["last_check"] = datetime.utcnow().isoformat()
        status_file = self.data.data_dir / "monitor_status.json"
        self.data._save_json(status_file, status)

    @monitor_repos.before_loop
    async def before_monitor_repos(self):
        """Wait until bot is ready."""
        await self.bot.wait_until_ready()
