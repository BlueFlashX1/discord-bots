"""Deploy slash commands to Discord."""

import asyncio
import os
import sys

import discord
from discord import app_commands
from dotenv import load_dotenv

from logging_utils.python_logging import init_logging

load_dotenv()

RUN_ID = init_logging("reminder-bot-deploy")
logger = logging.getLogger(__name__)

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN required")
    sys.exit(1)
if not CLIENT_ID:
    logger.error("CLIENT_ID required")
    sys.exit(1)

# Type narrowing: after checks, these are guaranteed to be str
assert DISCORD_TOKEN is not None
assert CLIENT_ID is not None


async def deploy():
    """Deploy commands to Discord."""
    # Type narrowing: DISCORD_TOKEN is guaranteed to be str after module-level checks
    assert DISCORD_TOKEN is not None
    
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
    try:
        logger.info("deploy_commands_start", extra={"data": {"run_id": RUN_ID}})
        asyncio.run(deploy())
        logger.info("deploy_commands_complete", extra={"data": {"run_id": RUN_ID}})
    except Exception as exc:
        logger.exception(
            "deploy_commands_failed", extra={"data": {"run_id": RUN_ID, "error": str(exc)}}
        )
        raise
