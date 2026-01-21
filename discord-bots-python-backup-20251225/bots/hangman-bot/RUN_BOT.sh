#!/usr/bin/env bash

# Hangman Bot Launcher

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BOT_DIR="$SCRIPT_DIR"

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
    PYTHON_ENV="$CONDA_BASE/envs/env-active/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_ENV=$(command -v python3)
    echo "⚠️  Warning: Using system python3 instead of conda env-active"
else
    echo "❌ Error: Python not found"
    exit 1
fi

echo "🎮 Starting Hangman Bot..."
echo "📁 Directory: $BOT_DIR"
echo "🐍 Python: $PYTHON_ENV"
echo ""

# Validate directory
if [[ ! -d "$BOT_DIR" ]]; then
    echo "❌ Error: Bot directory not found: $BOT_DIR"
    exit 1
fi

cd "$BOT_DIR"

# Check for .env file
if [[ ! -f ".env" ]]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Bot may not start without configuration"
fi

# Kill any existing instances
pkill -9 -f "python.*src.core.*hangman" 2>/dev/null || true

# Start the bot in foreground (LaunchAgent will manage it)
echo "✅ Hangman Bot starting..."
exec "$PYTHON_ENV" -m src.core
