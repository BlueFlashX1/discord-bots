"""Main GitHub Discord Bot."""

import asyncio
import logging
import os
import sys
from pathlib import Path

from discord.ext import commands
from dotenv import load_dotenv
from services.contribution_tracker import ContributionTracker
from services.repo_monitor import RepoMonitor
from utils.data_manager import DataManager

import discord

# Load environment variables
load_dotenv()

# Configure logging (strategic debugging, no verbose spam)
logging.basicConfig(
    level=logging.INFO,  # INFO for critical operations, WARNING/ERROR for issues
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Suppress discord.py verbose logging
logging.getLogger("discord").setLevel(logging.WARNING)
logging.getLogger("discord.http").setLevel(logging.WARNING)
logging.getLogger("discord.gateway").setLevel(logging.WARNING)
# Suppress aiohttp unclosed connector warnings
logging.getLogger("aiohttp").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# Bot configuration
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
GUILD_ID = os.getenv("GUILD_ID")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN not found in environment variables")
    sys.exit(1)

if not GITHUB_TOKEN:
    logger.warning("GITHUB_TOKEN not set - some features will be limited")


class GitHubBot(commands.Bot):
    """GitHub Discord Bot."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            application_id=CLIENT_ID,
        )

    async def setup_hook(self):
        """Called when the bot is starting up."""
        # Load all command cogs
        cogs_dir = Path("commands")
        for file in cogs_dir.glob("*.py"):
            if file.stem != "__init__":
                try:
                    cog_name = f"commands.{file.stem}"
                    await self.load_extension(cog_name)
                except Exception as e:
                    logger.error(f"Failed to load cog {file.stem}: {e}")

        # Sync commands
        # Handle GUILD_ID edge cases: None, empty string, whitespace, placeholder, non-digit
        if GUILD_ID and GUILD_ID.strip() and GUILD_ID.strip() != 'your_guild_id' and GUILD_ID.strip().isdigit():
            try:
                guild = discord.Object(id=int(GUILD_ID.strip()))
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid GUILD_ID format, syncing globally: {e}")
                await self.tree.sync()
        else:
            await self.tree.sync()

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Bot connected: {self.user} ({len(self.guilds)} guild(s))")

        # Initialize services
        data = DataManager()
        self.repo_monitor = RepoMonitor(self, GITHUB_TOKEN, data)
        self.contribution_tracker = ContributionTracker(self, GITHUB_TOKEN, data)

        # Set tracker in stats command
        stats_cog = self.get_cog("StatsCommand")
        if stats_cog:
            stats_cog.set_tracker(self.contribution_tracker)

        # Start monitoring services
        if GITHUB_TOKEN:
            self.repo_monitor.start()
            logger.info("Repository monitor started")
            self.contribution_tracker.start()
            logger.info("Contribution tracker started")
        else:
            logger.warning("GitHub token not set - monitoring disabled")

    async def close(self):
        """Clean up resources when bot is closing."""
        try:
            if hasattr(self, 'repo_monitor'):
                self.repo_monitor.stop()
            if hasattr(self, 'contribution_tracker'):
                self.contribution_tracker.stop()
            # Close GitHub service sessions
            if hasattr(self, 'repo_monitor') and hasattr(self.repo_monitor, 'github'):
                try:
                    await self.repo_monitor.github.close()
                except Exception as e:
                    logger.error(f"Error closing repo_monitor GitHub session: {e}")
            if hasattr(self, 'contribution_tracker') and hasattr(self.contribution_tracker, 'github'):
                try:
                    await self.contribution_tracker.github.close()
                except Exception as e:
                    logger.error(f"Error closing contribution_tracker GitHub session: {e}")
        except Exception as e:
            logger.error(f"Error during bot cleanup: {e}")
        finally:
            await super().close()

    async def on_command_error(self, ctx, error):
        """Handle command errors."""
        if isinstance(error, commands.CommandNotFound):
            return
        logger.error(f"Command error: {error}")


async def main():
    """Main entry point."""
    bot = GitHubBot()
    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
