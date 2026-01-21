#!/bin/bash
# Grammar Bot Launcher Script
# This script ensures the bot runs with the correct Python environment

# Change to bot directory
cd "$(dirname "$0")"

# Python path from conda environment
PYTHON_PATH="/opt/homebrew/Caskroom/miniforge/base/bin/python"

# Bot script
BOT_SCRIPT="bot_auto_detect.py"

echo "======================================"
echo "  Grammar Teacher Bot Launcher"
echo "======================================"
echo ""
echo "Python: $PYTHON_PATH"
echo "Script: $BOT_SCRIPT"
echo "Directory: $(pwd)"
echo ""
echo "Starting bot..."
echo "======================================"
echo ""

# Run the bot
exec "$PYTHON_PATH" "$BOT_SCRIPT"
