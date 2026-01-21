#!/bin/bash

# Grammar Teacher Bot - Startup Management Script

PLIST_FILE="$HOME/Library/LaunchAgents/com.user.grammar-teacher-bot.plist"
BOT_DIR="$HOME/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot"

show_help() {
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     Grammar Teacher Bot - Startup Manager            ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: ./manage_startup.sh [command]"
    echo ""
    echo "Commands:"
    echo "  enable       Enable bot to start automatically on login"
    echo "  disable      Disable automatic startup"
    echo "  start        Start the bot now"
    echo "  stop         Stop the bot"
    echo "  restart      Restart the bot"
    echo "  status       Check if bot is running"
    echo "  logs         View recent bot logs"
    echo "  errors       View recent error logs"
    echo "  help         Show this help message"
    echo ""
}

enable_startup() {
    echo "🔧 Enabling automatic startup..."
    launchctl load "$PLIST_FILE" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Bot will now start automatically on login!"
        echo "📊 Checking status..."
        launchctl list | grep grammar-teacher-bot
    else
        echo "⚠️  Already enabled or error occurred"
    fi
}

disable_startup() {
    echo "🔧 Disabling automatic startup..."
    launchctl unload "$PLIST_FILE" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Automatic startup disabled"
    else
        echo "⚠️  Already disabled or error occurred"
    fi
}

start_bot() {
    echo "🚀 Starting bot..."
    launchctl start com.user.grammar-teacher-bot
    sleep 2
    check_status
}

stop_bot() {
    echo "🛑 Stopping bot..."
    launchctl stop com.user.grammar-teacher-bot
    echo "✅ Bot stopped"
}

restart_bot() {
    echo "🔄 Restarting bot..."
    stop_bot
    sleep 1
    start_bot
}

check_status() {
    echo "📊 Checking bot status..."
    if launchctl list | grep -q "grammar-teacher-bot"; then
        echo "✅ Bot is running!"
        launchctl list | grep grammar-teacher-bot
    else
        echo "❌ Bot is not running"
    fi
}

view_logs() {
    echo "📝 Recent bot output (last 50 lines):"
    echo "════════════════════════════════════════"
    if [ -f "$BOT_DIR/logs/bot_output.log" ]; then
        tail -n 50 "$BOT_DIR/logs/bot_output.log"
    else
        echo "No logs found yet"
    fi
}

view_errors() {
    echo "⚠️  Recent errors (last 50 lines):"
    echo "════════════════════════════════════════"
    if [ -f "$BOT_DIR/logs/bot_error.log" ]; then
        tail -n 50 "$BOT_DIR/logs/bot_error.log"
    else
        echo "No error logs found"
    fi
}

# Main script
case "$1" in
    enable)
        enable_startup
        ;;
    disable)
        disable_startup
        ;;
    start)
        start_bot
        ;;
    stop)
        stop_bot
        ;;
    restart)
        restart_bot
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    errors)
        view_errors
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
