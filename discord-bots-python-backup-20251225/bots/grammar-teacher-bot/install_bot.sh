#!/bin/bash
# Grammar Bot - Installation Script
# Installs and configures the bot to auto-start on login

set -e

BOT_DIR="/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot"
PLIST_FILE="$BOT_DIR/com.grammarbot.launcher.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LAUNCH_AGENTS_DIR/com.grammarbot.launcher.plist"

echo "🤖 Grammar Bot Installation Script"
echo "===================================="
echo ""

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Stop existing service if running
echo "🛑 Stopping existing bot service (if any)..."
launchctl stop com.grammarbot.launcher 2>/dev/null || true
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# Copy plist file
echo "📋 Installing launch agent..."
cp "$PLIST_FILE" "$PLIST_DEST"

# Set proper permissions
chmod 644 "$PLIST_DEST"

# Load the service
echo "🚀 Loading bot service..."
launchctl load "$PLIST_DEST"

# Start the service
echo "▶️  Starting bot..."
launchctl start com.grammarbot.launcher

# Wait a moment for startup
sleep 3

# Check if it's running
if pgrep -f "python.*main.py" > /dev/null; then
    echo ""
    echo "✅ Grammar Bot installed successfully!"
    echo ""
    echo "📊 Service Status:"
    echo "  - Auto-start on login: ✓ Enabled"
    echo "  - Current status: ✓ Running"
    echo "  - Process ID: $(pgrep -f "python.*main.py")"
    echo ""
    echo "📝 Logs:"
    echo "  - Standard output: ~/Library/Logs/grammarbot.log"
    echo "  - Error output: ~/Library/Logs/grammarbot.error.log"
    echo ""
    echo "🔧 Management Commands:"
    echo "  - Stop:    launchctl stop com.grammarbot.launcher"
    echo "  - Start:   launchctl start com.grammarbot.launcher"
    echo "  - Restart: launchctl stop com.grammarbot.launcher && launchctl start com.grammarbot.launcher"
    echo "  - Disable: launchctl unload ~/Library/LaunchAgents/com.grammarbot.launcher.plist"
    echo "  - Enable:  launchctl load ~/Library/LaunchAgents/com.grammarbot.launcher.plist"
    echo ""
    echo "📖 View logs: tail -f ~/Library/Logs/grammarbot.log"
else
    echo ""
    echo "⚠️  Bot service loaded but not running. Checking logs..."
    echo ""
    echo "Last 20 lines of error log:"
    tail -20 ~/Library/Logs/grammarbot.error.log 2>/dev/null || echo "No error log found"
    echo ""
    echo "Last 20 lines of output log:"
    tail -20 ~/Library/Logs/grammarbot.log 2>/dev/null || echo "No output log found"
    exit 1
fi
