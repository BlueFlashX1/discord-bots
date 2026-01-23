"""Deploy slash commands to Discord."""

import asyncio
import logging
import os
import sys

import discord
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
GUILD_ID = os.getenv("GUILD_ID")

if not DISCORD_TOKEN or not CLIENT_ID:
    logger.error("DISCORD_TOKEN and CLIENT_ID required")
    sys.exit(1)


async def deploy():
    """Deploy commands to Discord."""
    bot = discord.Client(intents=discord.Intents.default())
    tree = app_commands.CommandTree(bot)

    @bot.event
    async def on_ready():
        logger.info(f"Logged in as {bot.user}")

        # Handle GUILD_ID edge cases: None, empty string, whitespace, placeholder, non-digit
        if GUILD_ID and GUILD_ID.strip() and GUILD_ID.strip() != 'your_guild_id' and GUILD_ID.strip().isdigit():
            try:
                guild = discord.Object(id=int(GUILD_ID.strip()))
                tree.copy_global_to(guild=guild)
                await tree.sync(guild=guild)
                logger.info(f"Synced commands to guild {GUILD_ID.strip()}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid GUILD_ID format, syncing globally: {e}")
                await tree.sync()
                logger.info("Synced global commands")
        else:
            await tree.sync()
            logger.info("Synced global commands")

        await bot.close()

    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(deploy())
