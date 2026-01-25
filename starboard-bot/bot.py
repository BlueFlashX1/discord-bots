"""Main Starboard Discord Bot."""

import logging
import os
import sys
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from services.starboard_service import StarboardService
from utils.data_manager import DataManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Suppress discord.py verbose logging
logging.getLogger("discord").setLevel(logging.WARNING)
logging.getLogger("discord.http").setLevel(logging.WARNING)
logging.getLogger("discord.gateway").setLevel(logging.WARNING)
logging.getLogger("aiohttp").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# Bot configuration
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN not found in environment variables")
    sys.exit(1)


class StarboardBot(commands.Bot):
    """Starboard Discord Bot."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.reactions = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            application_id=CLIENT_ID,
        )

    async def setup_hook(self):
        """Called when the bot is starting up."""
        logger.info("Setting up bot...")

        # Load all command cogs
        cogs_dir = Path("commands")
        loaded_cogs = []
        for file in cogs_dir.glob("*.py"):
            if file.stem != "__init__":
                try:
                    cog_name = f"commands.{file.stem}"
                    await self.load_extension(cog_name)
                    loaded_cogs.append(cog_name)
                    logger.info(f"✓ Loaded cog: {cog_name}")
                except Exception as e:
                    logger.error(f"✗ Failed to load cog {file.stem}: {e}", exc_info=True)

        logger.info(f"Loaded {len(loaded_cogs)} command cogs: {loaded_cogs}")

        # Sync commands globally
        logger.info("Syncing commands with Discord...")
        try:
            synced = await self.tree.sync()
            logger.info(f"✓ Synced {len(synced)} global commands")
            for cmd in synced:
                logger.debug(f"  - {cmd.name}")
        except Exception as e:
            logger.error(f"✗ Failed to sync commands: {e}", exc_info=True)

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Bot connected: {self.user} (ID: {self.user.id})")
        logger.info(f"Bot is in {len(self.guilds)} guild(s)")

        # Log guild information
        for guild in self.guilds:
            logger.info(f"  - {guild.name} (ID: {guild.id})")
            # Check if configured
            data = DataManager()
            config = data.get_guild_config(guild.id)
            if config and config.get("forum_channel_id"):
                logger.info(f"    ✓ Configured: Forum channel {config.get('forum_channel_id')}, Threshold: {config.get('star_threshold', 1)}")
            else:
                logger.warning(f"    ⚠ Not configured: Use /starboard-set-channel to set up")

        # Initialize services
        data = DataManager()
        self.starboard_service = StarboardService(self, data)

        logger.info("Starboard service initialized and ready")

    async def on_reaction_add(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a reaction is added."""
        logger.debug(
            f"Reaction add event: {reaction.emoji} by {user} "
            f"(bot: {user.bot}) on message {reaction.message.id}"
        )

        # Ignore bot's own reactions
        if user.bot:
            logger.debug(f"Ignoring bot reaction from {user}")
            return

        try:
            await self.starboard_service.handle_reaction_add(reaction, user)
        except Exception as e:
            logger.error(
                f"Error handling reaction add: {e}",
                exc_info=True
            )

    async def on_reaction_remove(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a reaction is removed."""
        logger.debug(
            f"Reaction remove event: {reaction.emoji} by {user} "
            f"(bot: {user.bot}) on message {reaction.message.id}"
        )

        # Ignore bot's own reactions
        if user.bot:
            logger.debug(f"Ignoring bot reaction removal from {user}")
            return

        try:
            await self.starboard_service.handle_reaction_remove(reaction, user)
        except Exception as e:
            logger.error(
                f"Error handling reaction remove: {e}",
                exc_info=True
            )

    async def on_command_error(self, ctx, error):
        """Handle command errors."""
        if isinstance(error, commands.CommandNotFound):
            return
        logger.error(f"Command error: {error}")


def main():
    """Main entry point."""
    bot = StarboardBot()
    bot.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
