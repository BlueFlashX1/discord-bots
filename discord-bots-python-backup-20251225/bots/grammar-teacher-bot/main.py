#!/usr/bin/env python3
"""
Grammar Teacher Bot - Main Entry Point
=======================================

Starts the Discord bot with AI-powered grammar checking.
"""

import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# Import required modules
from dotenv import load_dotenv

# Import and run the bot
from src.core.bot_auto_detect import bot

if __name__ == "__main__":
    print("🚀 Starting Grammar Teacher Bot...")
    load_dotenv()

    # Get Discord token
    BOT_TOKEN = os.getenv("BOT_TOKEN_GRAMMAR")
    if not BOT_TOKEN:
        print("❌ Error: BOT_TOKEN_GRAMMAR not found in .env file")
        sys.exit(1)

    # Run the bot
    bot.run(BOT_TOKEN)
