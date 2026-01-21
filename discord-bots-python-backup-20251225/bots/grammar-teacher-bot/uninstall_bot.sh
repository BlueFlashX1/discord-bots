#!/bin/bash
# Grammar Bot - Uninstall Script
# Removes the bot from auto-start

set -e

PLIST_DEST="$HOME/Library/LaunchAgents/com.grammarbot.launcher.plist"

echo "🗑️  Grammar Bot Uninstall Script"
echo "================================="
echo ""

# Stop the service
echo "🛑 Stopping bot service..."
launchctl stop com.grammarbot.launcher 2>/dev/null || true

# Unload the service
echo "📤 Unloading launch agent..."
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# Remove plist file
if [ -f "$PLIST_DEST" ]; then
    echo "🗑️  Removing launch agent file..."
    rm "$PLIST_DEST"
fi

# Kill any remaining processes
if pgrep -f "python.*main.py" > /dev/null; then
    echo "🔪 Killing remaining bot processes..."
    pkill -f "python.*main.py"
fi

echo ""
echo "✅ Grammar Bot uninstalled successfully!"
echo ""
echo "Note: This only removes auto-start. Bot files remain in:"
echo "  /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot"
echo ""
echo "To reinstall, run: ./install_bot.sh"
