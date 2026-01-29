"""Deploy slash commands to Discord.

Uses the real bot (loads cogs), syncs, then exits. Run after adding or changing
slash commands so they register with Discord.

Usage:
  python3 deploy-commands.py

Env:
  DISCORD_TOKEN, CLIENT_ID  Required.
  GUILD_ID                  Optional. If set (your dev server ID), also syncs to
                            that guild for instant updates (global can take ~1h).
"""

import asyncio
import os
import sys

os.environ["DEPLOY_COMMANDS_ONLY"] = "1"

from dotenv import load_dotenv

load_dotenv()

if not os.getenv("DISCORD_TOKEN") or not os.getenv("CLIENT_ID"):
    print("DISCORD_TOKEN and CLIENT_ID required in .env")
    sys.exit(1)

from bot import DISCORD_TOKEN, main

if __name__ == "__main__":
    asyncio.run(main())
