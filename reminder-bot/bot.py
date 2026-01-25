"""Main Reminder Discord Bot."""

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import cast

from discord.ext import commands
from dotenv import load_dotenv
from services.reminder_service import ReminderService
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
CLIENT_ID_STR = os.getenv("CLIENT_ID")

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN not found in environment variables")
    sys.exit(1)

# Type narrowing: after check, DISCORD_TOKEN is guaranteed to be str
# Use cast to help Pyright understand the type after None check
DISCORD_TOKEN = cast(str, DISCORD_TOKEN)

# Convert CLIENT_ID to int if provided, otherwise None
CLIENT_ID: int | None = None
if CLIENT_ID_STR:
    try:
        CLIENT_ID = int(CLIENT_ID_STR)
    except ValueError:
        logger.error(f"CLIENT_ID must be a valid integer, got: {CLIENT_ID_STR}")
        sys.exit(1)


class ReminderBot(commands.Bot):
    """Reminder Discord Bot."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True

        # Conditionally pass application_id only if CLIENT_ID is not None
        kwargs = {
            "command_prefix": "!",
            "intents": intents,
        }
        if CLIENT_ID is not None:
            kwargs["application_id"] = CLIENT_ID

        super().__init__(**kwargs)

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

        # Sync commands globally (no guild-specific syncing needed)
        await self.tree.sync()
        logger.info("Synced global commands")

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Bot connected: {self.user} ({len(self.guilds)} guild(s))")

        # Initialize services
        data = DataManager()
        self.reminder_service = ReminderService(self, data)

        # Start reminder checker
        self.reminder_service.start()
        logger.info("Reminder service started")

    async def close(self):
        """Clean up resources when bot is closing."""
        try:
            if hasattr(self, 'reminder_service'):
                self.reminder_service.stop()
        except Exception as e:
            logger.error(f"Error stopping reminder service: {e}")
        finally:
            await super().close()

    async def on_command_error(self, ctx, error):
        """Handle command errors."""
        if isinstance(error, commands.CommandNotFound):
            return
        logger.error(f"Command error: {error}")


async def main():
    """Main entry point."""
    # Type narrowing: check token inside function for better Pyright recognition
    token = DISCORD_TOKEN
    if not token:
        logger.error("DISCORD_TOKEN not found in environment variables")
        sys.exit(1)
    
    bot = ReminderBot()
    await bot.start(token)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
