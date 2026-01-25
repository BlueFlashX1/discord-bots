#!/bin/bash
# Verify .env files exist on VPS
# Run this ON YOUR VPS

set -e

VPS_DIR="${1:-/root/discord-bots}"

echo "🔍 Verifying .env Files on VPS"
echo "=============================="
echo ""
echo "Checking directory: $VPS_DIR"
echo ""

# List of bots
BOTS=(
    "coding-practice-bot"
    "command-control-bot"
    "exercism-bot"
    "github-bot"
    "hangman-bot"
    "spelling-bee-bot"
    "grammar-bot"
    "news-bots/MonitoRSS"
    "reminder-bot"
    "todoist bot"
    "reddit-filter-bot"
    "youtube-monitor-bot"
)

# Check if directory exists
if [ ! -d "$VPS_DIR" ]; then
    echo "❌ Directory not found: $VPS_DIR"
    echo ""
    echo "Make sure you've cloned the repository:"
    echo "  git clone git@github.com:BlueFlashX1/discord-bots.git $VPS_DIR"
    exit 1
fi

cd "$VPS_DIR"

echo "Checking for .env files..."
echo ""

ALL_GOOD=1
FOUND_COUNT=0
MISSING_LIST=()

for bot in "${BOTS[@]}"; do
    ENV_PATH="$bot/.env"

    if [ -f "$ENV_PATH" ]; then
        # Check if file has content
        if [ -s "$ENV_PATH" ]; then
            # Check for common tokens
            if grep -q "DISCORD_TOKEN\|DISCORD_BOT_TOKEN" "$ENV_PATH" 2>/dev/null; then
                echo "✅ $bot/.env - EXISTS and has token"
                FOUND_COUNT=$((FOUND_COUNT + 1))
            else
                echo "⚠️  $bot/.env - EXISTS but might be missing token"
                echo "   Check: grep -i token $ENV_PATH"
            fi
        else
            echo "❌ $bot/.env - EXISTS but is EMPTY"
            MISSING_LIST+=("$bot")
            ALL_GOOD=0
        fi
    else
        echo "❌ $bot/.env - MISSING"
        MISSING_LIST+=("$bot")
        ALL_GOOD=0
    fi
done

echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Found: $FOUND_COUNT / ${#BOTS[@]} .env files"

if [ ${#MISSING_LIST[@]} -gt 0 ]; then
    echo "❌ Missing or empty:"
    for bot in "${MISSING_LIST[@]}"; do
        echo "   - $bot/.env"
    done
    echo ""
    echo "To fix:"
    echo "1. Copy from Mac: ./scripts/copy-env-to-vps.sh (run on Mac)"
    echo "2. Or create manually: nano $VPS_DIR/[bot-name]/.env"
fi

echo ""

if [ $ALL_GOOD -eq 1 ] && [ $FOUND_COUNT -eq ${#BOTS[@]} ]; then
    echo "✅✅✅ All .env files are present and configured! ✅✅✅"
    echo ""
    echo "You can now:"
    echo "1. Run deployment: ./deploy.sh"
    echo "2. Or start bots: pm2 start ecosystem.config.js"
    echo "3. Save PM2: pm2 save"
else
    echo "⚠️  Some .env files are missing or empty"
    echo "Fix them before starting bots"
fi

echo ""
