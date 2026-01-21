#!/usr/bin/env bash
# Simple, consistent bot launcher
# Run from anywhere, always works

set -euo pipefail
IFS=$'\n\t'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_ROOT="${BOT_DIR:-$SCRIPT_DIR}"

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
    PYTHON="$CONDA_BASE/envs/env-active/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON=$(command -v python3)
    echo "⚠️  Warning: Using system python3 instead of conda env-active"
else
    echo "❌ Error: Python not found"
    exit 1
fi

# Validate directory
if [[ ! -d "$BOT_ROOT" ]]; then
    echo "❌ Error: Bot directory not found: $BOT_ROOT"
    exit 1
fi

cd "$BOT_ROOT"

# Check for .env file
if [[ ! -f ".env" ]]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Bot may not start without configuration"
fi

echo "🎮 Starting Grammar Teacher Bot..."
echo "📁 Directory: $BOT_ROOT"
echo "🐍 Python: $PYTHON"
echo ""

exec "$PYTHON" -m src.core.bot_auto_detect
