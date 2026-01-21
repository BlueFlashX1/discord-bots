#!/usr/bin/env bash
# Grammar Teacher Bot Control Script
# Manages the Discord bot using LaunchAgent

set -euo pipefail
IFS=$'\n\t'

PLIST_PATH="$HOME/Library/LaunchAgents/com.grammarbot.launcher.plist"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="${BOT_DIR:-$SCRIPT_DIR}"

# Try to find conda base dynamically
CONDA_BASE="${CONDA_BASE:-}"
if [[ -z "$CONDA_BASE" ]]; then
    # Try common locations
    for location in "$HOME/miniconda3" "$HOME/anaconda3" "/opt/homebrew/Caskroom/miniforge/base" "/opt/homebrew/Caskroom/miniconda/base"; do
        if [[ -d "$location" ]]; then
            CONDA_BASE="$location"
            break
        fi
    done

    # Try conda command
    if [[ -z "$CONDA_BASE" ]] && command -v conda >/dev/null 2>&1; then
        CONDA_BASE=$(conda info --base 2>/dev/null || echo "")
    fi
fi

# Set Python path
if [[ -n "$CONDA_BASE" && -f "$CONDA_BASE/envs/env-active/bin/python" ]]; then
    PYTHON_PATH="$CONDA_BASE/envs/env-active/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_PATH=$(command -v python3)
    echo "⚠️  Warning: Using system python3 instead of conda env-active"
else
    echo "❌ Error: Python not found"
    exit 1
fi

show_help() {
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║       Grammar Teacher Bot Control Script            ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: ./bot_control.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start        Start the bot"
    echo "  stop         Stop the bot"
    echo "  restart      Restart the bot"
    echo "  status       Check bot status"
    echo "  logs         View bot logs"
    echo "  errors       View error logs"
    echo "  install      Install auto-start on login"
    echo "  uninstall    Remove auto-start"
    echo "  manual       Run bot manually (foreground)"
    echo "  help         Show this help"
    echo ""
}

start_bot() {
    if [[ ! -f "$PLIST_PATH" ]]; then
        echo "❌ Error: LaunchAgent plist not found: $PLIST_PATH"
        echo "   Run './bot_control.sh install' first"
        return 1
    fi

    echo "🚀 Starting bot..."
    launchctl load "$PLIST_PATH" 2>/dev/null || echo "⚠️  Already running or error occurred"
    sleep 2
    status_bot
}

stop_bot() {
    echo "🛑 Stopping bot..."
    launchctl unload "$PLIST_PATH" 2>/dev/null
    pkill -f "bot_auto_detect" 2>/dev/null
    echo "✅ Bot stopped"
}

restart_bot() {
    echo "🔄 Restarting bot..."
    stop_bot
    sleep 2
    start_bot
}

status_bot() {
    echo "📊 Bot Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if launchctl list | grep -q "grammarbot"; then
        echo "✅ LaunchAgent: Running"
        launchctl list | grep grammarbot
    else
        echo "❌ LaunchAgent: Not running"
    fi
    echo ""
    if pgrep -f "bot_auto_detect" > /dev/null; then
        echo "✅ Bot Process: Active"
        ps aux | grep "[b]ot_auto_detect" | awk '{print "   PID: "$2" | CPU: "$3"% | Memory: "$4"%"}'
    else
        echo "❌ Bot Process: Not running"
    fi
}

view_logs() {
    echo "📝 Bot Logs (last 50 lines):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -f "$HOME/Library/Logs/grammarbot.log" ]; then
        tail -50 "$HOME/Library/Logs/grammarbot.log"
    else
        echo "No logs found"
    fi
}

view_errors() {
    echo "⚠️  Error Logs (last 50 lines):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -f "$HOME/Library/Logs/grammarbot.error.log" ]; then
        tail -50 "$HOME/Library/Logs/grammarbot.error.log"
    else
        echo "No error logs found"
    fi
}

install_autostart() {
    echo "🔧 Installing auto-start on login..."
    cp "$BOT_DIR/com.grammarbot.launcher.plist" "$PLIST_PATH"
    launchctl load "$PLIST_PATH"
    echo "✅ Bot will now start automatically on login!"
}

uninstall_autostart() {
    echo "🔧 Removing auto-start..."
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm -f "$PLIST_PATH"
    echo "✅ Auto-start removed"
}

run_manual() {
    if [[ ! -d "$BOT_DIR" ]]; then
        echo "❌ Error: Bot directory not found: $BOT_DIR"
        return 1
    fi

    if [[ ! -f "$BOT_DIR/.env" ]]; then
        echo "⚠️  Warning: .env file not found"
        echo "   Bot may not start without configuration"
    fi

    echo "🎮 Running bot manually (press Ctrl+C to stop)..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$BOT_DIR" || exit 1
    PYTHONPATH="$BOT_DIR" "$PYTHON_PATH" -m src.core.bot_auto_detect
}

# Main
case "${1:-help}" in
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
        status_bot
        ;;
    logs)
        view_logs
        ;;
    errors)
        view_errors
        ;;
    install)
        install_autostart
        ;;
    uninstall)
        uninstall_autostart
        ;;
    manual)
        run_manual
        ;;
    help|*)
        show_help
        ;;
esac
