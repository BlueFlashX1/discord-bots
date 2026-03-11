"""Deploy slash commands to Discord with cogs loaded."""

import asyncio
import os
import sys
import logging

import discord
from discord.ext import commands
from discord import app_commands
from dotenv import load_dotenv

# Simple logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN required")
    sys.exit(1)


class DebugBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        """Load all cogs and sync commands."""
        # Load all cogs
        cogs_dir = "commands"
        for file in os.listdir(cogs_dir):
            if file.endswith(".py") and file != "__init__.py":
                try:
                    cog_name = f"commands.{file[:-3]}"
                    await self.load_extension(cog_name)
                    logger.info(f"Loaded cog: {file[:-3]}")
                except Exception as e:
                    logger.error(f"Failed to load cog {file}: {e}")

        # Sync commands
        await self.tree.sync()
        logger.info("Commands synced globally")

        # List all commands
        commands = self.tree.get_commands()
        command_names = [cmd.name for cmd in commands]
        logger.info(f"Registered commands: {command_names}")

        await self.close()


async def deploy():
    """Deploy commands to Discord."""
    bot = DebugBot()
    await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    try:
        asyncio.run(deploy())
    except Exception as exc:
        logger.exception(f"Deploy failed: {exc}")
        raise
