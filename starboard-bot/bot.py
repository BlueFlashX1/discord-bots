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
    level=logging.DEBUG,  # Temporarily set to DEBUG for troubleshooting
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
        # Create intents with all required permissions
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True  # Required for guild reactions
        intents.guild_messages = True  # Required to see messages with reactions
        # Note: reactions intent doesn't exist as separate attribute in discord.py
        # Raw reaction events work with guilds + guild_messages intents
        
        logger.debug(f"Intents configured: {intents}")
        logger.debug(f"Intents value: guilds={intents.guilds}, guild_messages={intents.guild_messages}, message_content={intents.message_content}")

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
        
        # Log intents status - verify reactions intent is enabled
        logger.info(f"Intents enabled: reactions={self.intents.reactions}, message_content={self.intents.message_content}, guilds={self.intents.guilds}, guild_messages={self.intents.guild_messages}")
        if not self.intents.reactions:
            logger.error("❌ CRITICAL: reactions intent is NOT enabled! Reaction events will not work!")
        else:
            logger.info("✅ reactions intent is enabled - reaction events should work")

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
        logger.info("✅ Event handlers registered: on_reaction_add, on_raw_reaction_add, on_reaction_remove")
        
        # Test that event handlers are registered
        if hasattr(self, 'on_reaction_add'):
            logger.info("✅ on_reaction_add method exists (for cached messages)")
        else:
            logger.error("❌ on_reaction_add method NOT FOUND!")
        
        if hasattr(self, 'on_raw_reaction_add'):
            logger.info("✅ on_raw_reaction_add method exists (for all messages, including uncached)")
        else:
            logger.error("❌ on_raw_reaction_add method NOT FOUND!")
    
    async def on_message(self, message: discord.Message):
        """Test handler to verify events are working."""
        # Only log occasionally to avoid spam
        if message.id % 100 == 0:  # Log every 100th message
            logger.debug(f"Message event received: {message.id} in {message.channel}")

    async def on_reaction_add(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a reaction is added."""
        logger.info(
            f"⭐ REACTION ADD EVENT RECEIVED: {reaction.emoji} by {user} "
            f"(bot: {user.bot}) on message {reaction.message.id} in channel {reaction.message.channel}"
        )

        # Ignore bot's own reactions
        if user.bot:
            logger.info(f"Ignoring bot reaction from {user}")
            return

        try:
            await self.starboard_service.handle_reaction_add(reaction, user)
        except Exception as e:
            logger.error(
                f"Error handling reaction add: {e}",
                exc_info=True
            )

    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        """Handle raw reaction add events (works for all messages, even if not in cache)."""
        logger.info(
            f"⭐ RAW REACTION ADD EVENT: {payload.emoji} by user {payload.user_id} "
            f"on message {payload.message_id} in channel {payload.channel_id}"
        )
        
        # Ignore bot's own reactions
        if payload.user_id == self.user.id:
            logger.info(f"Ignoring bot's own reaction")
            return
        
        try:
            # Get the channel and message
            channel = self.get_channel(payload.channel_id)
            if not channel:
                logger.warning(f"Channel {payload.channel_id} not found")
                return
            
            # Fetch the message
            try:
                message = await channel.fetch_message(payload.message_id)
            except discord.NotFound:
                logger.warning(f"Message {payload.message_id} not found in channel {payload.channel_id}")
                return
            except discord.Forbidden:
                logger.warning(f"No permission to fetch message {payload.message_id} in channel {payload.channel_id}")
                return
            
            # Get the user
            user = payload.member
            if not user:
                # Fetch user if member not available
                try:
                    user = await self.fetch_user(payload.user_id)
                except discord.NotFound:
                    logger.warning(f"User {payload.user_id} not found")
                    return
            
            if user.bot:
                logger.info(f"Ignoring bot reaction from {user}")
                return
            
            # Find the actual reaction object from the message
            # Refresh message to get latest reactions
            message = await channel.fetch_message(payload.message_id)
            reaction = None
            for r in message.reactions:
                if str(r.emoji) == str(payload.emoji):
                    reaction = r
                    break
            
            if not reaction:
                logger.warning(f"Reaction {payload.emoji} not found on message {payload.message_id} after fetch")
                return
            
            logger.info(f"Processing reaction {payload.emoji} on message {payload.message_id} via on_raw_reaction_add")
            await self.starboard_service.handle_reaction_add(reaction, user)
        except Exception as e:
            logger.error(
                f"Error handling raw reaction add: {e}",
                exc_info=True
            )

    async def on_reaction_remove(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a reaction is removed."""
        logger.info(
            f"Reaction remove event: {reaction.emoji} by {user} "
            f"(bot: {user.bot}) on message {reaction.message.id}"
        )

        # Ignore bot's own reactions
        if user.bot:
            logger.info(f"Ignoring bot reaction removal from {user}")
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
