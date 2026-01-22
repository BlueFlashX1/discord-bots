#!/bin/bash
# Helper script to add a new bot to the VPS
# Usage: ./add-new-bot.sh <bot-name>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <bot-name>"
    echo "Example: $0 my-new-bot"
    exit 1
fi

BOT_NAME="$1"
APP_DIR="/root/discord-bots"
BOT_DIR="$APP_DIR/$BOT_NAME"

echo "🤖 Adding new bot: $BOT_NAME"
echo "================================"

# Check if bot directory exists
if [ ! -d "$BOT_DIR" ]; then
    echo "❌ Error: Bot directory not found: $BOT_DIR"
    echo "   Make sure you've uploaded the bot files first"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$BOT_DIR/package.json" ]; then
    echo "❌ Error: package.json not found in $BOT_DIR"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$BOT_DIR"
npm install --production
cd "$APP_DIR"

# Check for .env file
if [ ! -f "$BOT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found for $BOT_NAME"
    echo "   Create it manually: nano $BOT_DIR/.env"
    echo "   Add: DISCORD_TOKEN=your_token_here"
    read -p "Press Enter after creating .env file..."
fi

# Check if bot is already in ecosystem.config.js
if grep -q "\"name\": \"$BOT_NAME\"" "$APP_DIR/ecosystem.config.js"; then
    echo "✅ Bot already in ecosystem.config.js"
else
    echo "⚠️  Bot not in ecosystem.config.js yet"
    echo "   Add it manually or use: pm2 start $BOT_DIR/index.js --name $BOT_NAME"
    echo ""
    read -p "Press Enter to continue with manual PM2 start..."
fi

# Start with PM2
echo "🚀 Starting bot with PM2..."
cd "$APP_DIR"

# Try to start from ecosystem, or start manually
if pm2 start ecosystem.config.js --only "$BOT_NAME" 2>/dev/null; then
    echo "✅ Started from ecosystem.config.js"
else
    echo "📝 Starting manually..."
    pm2 start "$BOT_DIR/index.js" --name "$BOT_NAME"
fi

# Save PM2 config
pm2 save

echo ""
echo "✅ Bot added successfully!"
echo ""
echo "Check status:"
pm2 list | grep "$BOT_NAME"
echo ""
echo "View logs:"
echo "  pm2 logs $BOT_NAME"
echo ""
echo "Restart:"
echo "  pm2 restart $BOT_NAME"
