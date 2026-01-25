#!/bin/bash
# Complete VPS setup: Clone repo + Copy .env files
# Run this on your Mac

set -e

VPS_IP="${1:-64.23.179.177}"
VPS_USER="${2:-root}"
VPS_DIR="/root/discord-bots"

echo "🚀 Complete VPS Setup"
echo "===================="
echo ""
echo "This will:"
echo "1. Clone the repository on VPS"
echo "2. Copy all .env files to VPS"
echo ""
echo "VPS: $VPS_USER@$VPS_IP"
echo ""

# Step 1: Clone repository
echo "Step 1: Cloning repository..."
echo ""

if ssh "$VPS_USER@$VPS_IP" "test -d $VPS_DIR/.git" 2>/dev/null; then
    echo "✅ Repository already exists, updating..."
    ssh "$VPS_USER@$VPS_IP" "cd $VPS_DIR && git pull origin main"
else
    echo "Cloning repository..."
    ssh "$VPS_USER@$VPS_IP" "mkdir -p $VPS_DIR && cd /root && git clone git@github.com:BlueFlashX1/discord-bots.git discord-bots" || {
        echo "❌ Failed to clone repository"
        echo "Make sure SSH key is set up for GitHub"
        exit 1
    }
fi

echo "✅ Repository ready"
echo ""

# Step 2: Copy .env files
echo "Step 2: Copying .env files..."
echo ""

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

SUCCESS_COUNT=0
FAILED_LIST=()

for bot in "${BOTS[@]}"; do
    if [ -f "$bot/.env" ]; then
        echo -n "Copying $bot/.env... "

        if scp "$bot/.env" "$VPS_USER@$VPS_IP:$VPS_DIR/$bot/.env" 2>/dev/null; then
            echo "✅"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "❌ Failed"
            FAILED_LIST+=("$bot")
        fi
    else
        echo "⚠️  $bot/.env not found locally, skipping"
    fi
done

echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Repository: Cloned/Updated"
echo "✅ .env files copied: $SUCCESS_COUNT / ${#BOTS[@]}"

if [ ${#FAILED_LIST[@]} -gt 0 ]; then
    echo "❌ Failed to copy:"
    for bot in "${FAILED_LIST[@]}"; do
        echo "   - $bot"
    done
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps on VPS:"
echo "1. cd $VPS_DIR"
echo "2. chmod +x deploy.sh"
echo "3. ./deploy.sh"
echo "4. pm2 restart all"
echo "5. pm2 save"
echo ""
