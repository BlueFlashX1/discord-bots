#!/usr/bin/env python3
"""
Force sync slash commands to all guilds
"""

import sys
sys.path.insert(0, "/opt/homebrew/Caskroom/miniforge/base/lib/python3.12/site-packages")

import os
from dotenv import load_dotenv
load_dotenv()

# Import the bot from the main script
from bot_auto_detect import bot, TOKEN

@bot.event
async def on_ready():
    print(f"\n✅ {bot.user} is online!")
    print(f"📊 Found {len(bot.guilds)} guild(s)\n")
    
    # Sync to each guild
    for guild in bot.guilds:
        print(f"🔄 Syncing to guild: {guild.name}")
        try:
            synced = await bot.tree.sync(guild=guild)
            print(f"   ✅ Synced {len(synced)} commands:")
            for cmd in synced:
                print(f"      - /{cmd.name}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Also sync globally
    print(f"\n🌐 Syncing globally...")
    try:
        global_synced = await bot.tree.sync()
        print(f"   ✅ Synced {len(global_synced)} global commands")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n✨ Done! Commands should appear in Discord now.")
    print("   Try typing '/' in your server to see them.")
    print("   If not visible immediately, reload Discord (Ctrl+R / Cmd+R)\n")
    
    await bot.close()

if __name__ == "__main__":
    print("🚀 Force syncing slash commands...")
    print("=" * 60)
    bot.run(TOKEN)
