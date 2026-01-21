#!/usr/bin/env python3
"""
Quick test to verify slash commands are properly registered
"""

import sys

sys.path.insert(0, "/opt/homebrew/Caskroom/miniforge/base/lib/python3.12/site-packages")

import os

import discord
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN_GRAMMAR") or os.getenv("BOT_TOKEN_1")

intents = discord.Intents.default()
bot = discord.Client(intents=intents)
tree = app_commands.CommandTree(bot)


@bot.event
async def on_ready():
    print(f"\n✅ Bot is online: {bot.user}")
    print(f"📊 Bot is in {len(bot.guilds)} guild(s)")

    for guild in bot.guilds:
        print(f"\n🏰 Guild: {guild.name} (ID: {guild.id})")

        # Get current commands in this guild
        commands = await tree.fetch_commands(guild=guild)
        print(f"   Registered commands: {len(commands)}")
        for cmd in commands:
            print(f"   - /{cmd.name}: {cmd.description}")

    # Check global commands
    global_commands = await tree.fetch_commands()
    print(f"\n🌐 Global commands: {len(global_commands)}")
    for cmd in global_commands:
        print(f"   - /{cmd.name}: {cmd.description}")

    await bot.close()


if __name__ == "__main__":
    print("🔍 Checking slash command registration...")
    bot.run(TOKEN)
