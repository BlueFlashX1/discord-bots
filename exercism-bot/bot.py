"""Main Exercism Discord Bot."""

import asyncio
import logging
import os
import sys
from pathlib import Path

from discord.ext import commands
from dotenv import load_dotenv
from services.daily_scheduler import DailyScheduler
from services.exercism_cli import ExercismCLI
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
GUILD_ID = os.getenv("GUILD_ID", "").strip()

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN not found in environment variables")
    sys.exit(1)


class ExercismBot(commands.Bot):
    """Exercism Discord Bot."""

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
        cogs_dir = Path("commands")
        for file in cogs_dir.glob("*.py"):
            if file.stem != "__init__":
                try:
                    cog_name = f"commands.{file.stem}"
                    await self.load_extension(cog_name)
                except Exception as e:
                    logger.error(f"Failed to load cog {file.stem}: {e}")

        guild_ok = (
            GUILD_ID
            and GUILD_ID != "your_guild_id"
            and GUILD_ID.isdigit()
        )
        if guild_ok:
            try:
                guild = discord.Object(id=int(GUILD_ID))
                self.tree.copy_global_to(guild=guild)
                synced_g = await self.tree.sync(guild=guild)
                names = [c.name for c in synced_g]
                logger.info(
                    "Synced guild commands (instant) for guild %s: %d commands %s",
                    GUILD_ID, len(synced_g), names,
                )
            except (ValueError, TypeError) as e:
                logger.warning("Invalid GUILD_ID, skipping guild sync: %s", e)
                guild_ok = False
            except Exception as e:
                logger.exception("Guild sync failed: %s", e)
                guild_ok = False

        try:
            synced = await self.tree.sync()
            names = [c.name for c in synced]
            logger.info(
                "Synced global commands%s: %d commands %s",
                " (up to ~1h to propagate)" if guild_ok else "",
                len(synced), names,
            )
        except Exception as e:
            logger.exception("Global sync failed: %s", e)
            raise

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Bot connected: {self.user} ({len(self.guilds)} guild(s))")

        if os.getenv("DEPLOY_COMMANDS_ONLY"):
            await self.close()
            return

        # Initialize services
        cli = ExercismCLI()
        data = DataManager()
        scheduler = DailyScheduler(self, cli, data)
        self.daily_scheduler = scheduler

        # Start daily problem scheduler
        scheduler.start()
        logger.info("Daily problem scheduler started")

    async def close(self):
        """Clean up resources when bot is closing."""
        try:
            if hasattr(self, 'daily_scheduler'):
                self.daily_scheduler.stop()
        except Exception as e:
            logger.error(f"Error stopping daily scheduler: {e}")
        finally:
            await super().close()

    async def on_command_error(self, ctx, error):
        """Handle command errors."""
        if isinstance(error, commands.CommandNotFound):
            return
        logger.error(f"Command error: {error}")


async def main():
    """Main entry point."""
    bot = ExercismBot()
    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
