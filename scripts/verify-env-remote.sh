#!/bin/bash
# Verify .env files on VPS from your Mac
# Run this on your Mac

set -e

VPS_IP="${1:-64.23.179.177}"
VPS_USER="${2:-root}"
VPS_DIR="${3:-/root/discord-bots}"
KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "🔍 Verifying .env Files on VPS (Remote)"
echo "========================================"
echo ""
echo "VPS: $VPS_USER@$VPS_IP"
echo "Directory: $VPS_DIR"
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
    "reminder-bot"
    "todoist bot"
    "reddit-filter-bot"
    "youtube-monitor-bot"
)

# MonitoRSS (special handling - .env at root of MonitoRSS directory)
MONITORSS_ENV="news-bots/MonitoRSS/.env"

echo "Checking for .env files on VPS..."
echo ""

ALL_GOOD=1
FOUND_COUNT=0
MISSING_LIST=()

for bot in "${BOTS[@]}"; do
    ENV_PATH="$VPS_DIR/$bot/.env"

    # Check if file exists and has content (properly quote path with spaces)
    if ssh -i "$KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$VPS_USER@$VPS_IP" \
        "test -f '$ENV_PATH' && test -s '$ENV_PATH'" 2>/dev/null; then
        # Check if it has a token (properly quote path with spaces)
        if ssh -i "$KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$VPS_USER@$VPS_IP" \
            "grep -q 'DISCORD_TOKEN\|DISCORD_BOT_TOKEN' '$ENV_PATH'" 2>/dev/null; then
            echo "✅ $bot/.env - EXISTS and has token"
            FOUND_COUNT=$((FOUND_COUNT + 1))
        else
            echo "⚠️  $bot/.env - EXISTS but might be missing token"
            echo "   Check: ssh -i $KEY_PATH $VPS_USER@$VPS_IP 'grep -i token $ENV_PATH'"
        fi
    else
        echo "❌ $bot/.env - MISSING or EMPTY"
        MISSING_LIST+=("$bot")
        ALL_GOOD=0
    fi
done

# Check MonitoRSS .env (special handling)
if ssh -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "$VPS_USER@$VPS_IP" \
    "test -f '$VPS_DIR/$MONITORSS_ENV' && test -s '$VPS_DIR/$MONITORSS_ENV'" 2>/dev/null; then
    if ssh -i "$KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$VPS_USER@$VPS_IP" \
        "grep -q 'DISCORD_TOKEN\|DISCORD_BOT_TOKEN\|MONGODB_URI' '$VPS_DIR/$MONITORSS_ENV'" 2>/dev/null; then
        echo "✅ MonitoRSS/.env - EXISTS and has config"
        FOUND_COUNT=$((FOUND_COUNT + 1))
    else
        echo "⚠️  MonitoRSS/.env - EXISTS but might be missing config"
    fi
else
    echo "❌ MonitoRSS/.env - MISSING or EMPTY"
    MISSING_LIST+=("MonitoRSS")
    ALL_GOOD=0
fi

TOTAL_BOTS=$((${#BOTS[@]} + 1))  # +1 for MonitoRSS

echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Found: $FOUND_COUNT / $TOTAL_BOTS .env files"

if [ ${#MISSING_LIST[@]} -gt 0 ]; then
    echo "❌ Missing or empty:"
    for bot in "${MISSING_LIST[@]}"; do
        echo "   - $bot/.env"
    done
    echo ""
    echo "To fix, run on your Mac:"
    echo "  ./scripts/copy-env-to-vps.sh"
fi

echo ""

if [ $ALL_GOOD -eq 1 ] && [ $FOUND_COUNT -eq $TOTAL_BOTS ]; then
    echo "✅✅✅ All .env files verified! ✅✅✅"
    echo ""
    echo "Next steps on VPS:"
    echo "1. cd $VPS_DIR"
    echo "2. ./deploy.sh"
    echo "3. pm2 restart all"
    echo "4. pm2 save"
else
    echo "⚠️  Some .env files need to be copied"
    echo "Run: ./scripts/copy-env-to-vps.sh"
fi

echo ""
