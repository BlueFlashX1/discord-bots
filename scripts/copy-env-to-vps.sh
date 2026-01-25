#!/bin/bash
# Copy actual .env files from Mac to VPS
# Run this on your Mac (with user's explicit permission)

set -e

VPS_IP="${1:-64.23.179.177}"
VPS_USER="${2:-root}"
VPS_DIR="/root/discord-bots"
KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "📋 Copy .env Files to VPS"
echo "========================"
echo ""
echo "This will copy your actual .env files from Mac to VPS."
echo "VPS: $VPS_USER@$VPS_IP"
echo "Target: $VPS_DIR"
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

echo "Checking for .env files locally..."
echo ""

FOUND_COUNT=0
MISSING_LIST=()

for bot in "${BOTS[@]}"; do
    if [ -f "$bot/.env" ]; then
        echo "✅ Found: $bot/.env"
        FOUND_COUNT=$((FOUND_COUNT + 1))
    else
        echo "❌ Missing: $bot/.env"
        MISSING_LIST+=("$bot")
    fi
done

# Check for MonitoRSS .env
if [ -f "$MONITORSS_ENV" ]; then
    echo "✅ Found: $MONITORSS_ENV"
    FOUND_COUNT=$((FOUND_COUNT + 1))
fi

echo ""
echo "Found $FOUND_COUNT .env files (including MonitoRSS if present)"
echo ""

if [ $FOUND_COUNT -eq 0 ]; then
    echo "⚠️  No .env files found locally!"
    echo "You'll need to create them on the VPS manually."
    exit 0
fi

# Confirm
read -p "Copy these .env files to VPS? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Copying .env files to VPS..."
echo ""

SUCCESS_COUNT=0
FAILED_LIST=()

# Copy regular bot .env files
for bot in "${BOTS[@]}"; do
    if [ -f "$bot/.env" ]; then
        echo -n "Copying $bot/.env... "

        # Create directory on VPS if it doesn't exist
        ssh -i "$KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$VPS_USER@$VPS_IP" \
            "mkdir -p $VPS_DIR/$bot" 2>/dev/null || true

        # Copy the file
        if scp -i "$KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$bot/.env" \
            "$VPS_USER@$VPS_IP:$VPS_DIR/$bot/.env" 2>/dev/null; then
            echo "✅"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "❌ Failed"
            FAILED_LIST+=("$bot")
        fi
    fi
done

# Copy MonitoRSS .env (special handling)
if [ -f "$MONITORSS_ENV" ]; then
    echo -n "Copying $MONITORSS_ENV... "

    # Create directory on VPS if it doesn't exist
    ssh -i "$KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$VPS_USER@$VPS_IP" \
        "mkdir -p $VPS_DIR/news-bots/MonitoRSS" 2>/dev/null || true

    # Copy the file
    if scp -i "$KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$MONITORSS_ENV" \
        "$VPS_USER@$VPS_IP:$VPS_DIR/news-bots/MonitoRSS/.env" 2>/dev/null; then
        echo "✅"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ Failed"
        FAILED_LIST+=("MonitoRSS")
    fi
fi

echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Successfully copied: $SUCCESS_COUNT files"

if [ ${#FAILED_LIST[@]} -gt 0 ]; then
    echo "❌ Failed to copy:"
    for bot in "${FAILED_LIST[@]}"; do
        echo "   - $bot"
    done
    echo ""
    echo "These might need to be created manually on VPS."
fi

echo ""
echo "✅ Done!"
echo ""
echo "After copying, on your VPS run:"
echo "  cd $VPS_DIR"
echo "  pm2 restart all"
echo "  pm2 save"
echo ""
