#!/usr/bin/env bash

# Hangman Bot Startup Script
# Run this to start the bot: bash START_BOT.sh

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Try to find conda base dynamically
CONDA_BASE="${CONDA_BASE:-}"
if [[ -z "$CONDA_BASE" ]]; then
    for location in "$HOME/miniconda3" "$HOME/anaconda3" "/opt/homebrew/Caskroom/miniforge/base" "/opt/homebrew/Caskroom/miniconda/base"; do
        if [[ -d "$location" ]]; then
            CONDA_BASE="$location"
            break
        fi
    done

    if [[ -z "$CONDA_BASE" ]] && command -v conda >/dev/null 2>&1; then
        CONDA_BASE=$(conda info --base 2>/dev/null || echo "")
    fi
fi

# Set Python path
if [[ -n "$CONDA_BASE" && -f "$CONDA_BASE/envs/env-active/bin/python" ]]; then
    PYTHON="$CONDA_BASE/envs/env-active/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON=$(command -v python3)
else
    echo "❌ Error: Python not found"
    exit 1
fi

echo "🎮 Starting Hangman Bot..."
echo ""

# Check if bot is already running
if pgrep -f "python.*src/core/__main__.py" > /dev/null; then
    echo "⚠️  Bot is already running (PID: $(pgrep -f 'python.*src/core/__main__.py'))"
    echo "To stop it, run: pkill -f 'python.*src/core/__main__.py'"
    exit 0
fi

# Check for .env file
if [[ ! -f ".env" ]]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env with BOT_TOKEN_HANGMAN"
    exit 1
fi

# Ensure logs directory exists
mkdir -p logs

# Start the bot in the background
nohup "$PYTHON" -m src.core > logs/hangman.log 2>&1 &
BOT_PID=$!

echo "✅ Bot started with PID: $BOT_PID"
echo "📝 Logs are being written to: logs/hangman.log"
echo ""
echo "To view logs: tail -f logs/hangman.log"
echo "To stop bot: kill $BOT_PID"
