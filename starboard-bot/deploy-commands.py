"""Deploy slash commands to Discord."""

import asyncio
import logging
import os

import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
GUILD_ID = os.getenv("GUILD_ID")


async def deploy_commands():
    """Deploy slash commands."""
    # For command deployment, we don't need message_content or reactions intents
    # These are only needed when the bot is running
    intents = discord.Intents.default()

    bot = commands.Bot(
        command_prefix="!",
        intents=intents,
        application_id=CLIENT_ID,
    )

    @bot.event
    async def on_ready():
        logger.info(f"Bot ready: {bot.user}")

        # Import and setup commands
        from commands.config import setup

        await setup(bot)

        # Sync commands
        if GUILD_ID:
            # Guild-specific sync (faster for testing)
            guild = discord.Object(id=int(GUILD_ID))
            bot.tree.copy_global_to(guild=guild)
            await bot.tree.sync(guild=guild)
            logger.info(f"Synced commands to guild {GUILD_ID}")
        else:
            # Global sync
            await bot.tree.sync()
            logger.info("Synced commands globally")

        await bot.close()

    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(deploy_commands())
