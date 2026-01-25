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

        # Sync commands globally (no guild-specific syncing needed)
        await tree.sync()
        logger.info("Synced global commands")

        await bot.close()

    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(deploy())
