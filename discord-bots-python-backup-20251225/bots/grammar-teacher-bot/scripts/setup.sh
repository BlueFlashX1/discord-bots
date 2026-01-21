#!/bin/bash

# Grammar Teacher Bot Setup Script

echo "📚 Grammar Teacher Bot - Setup"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "bot.py" ]; then
    echo "❌ Error: bot.py not found"
    echo "Please run this script from the grammar-teacher-bot directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check for bot token
echo "🔑 Checking for bot token..."
if [ ! -f "../../.env" ]; then
    echo "⚠️  No .env file found"
    echo ""
    echo "Please create a .env file in the discord-bots directory with:"
    echo "BOT_TOKEN_GRAMMAR=your_token_here"
    echo ""
    echo "Or use an existing token:"
    echo "BOT_TOKEN_1=your_token_here"
    exit 1
fi

if grep -q "BOT_TOKEN_GRAMMAR\|BOT_TOKEN_1" ../../.env; then
    echo "✅ Bot token found!"
else
    echo "⚠️  No bot token found in .env"
    echo "Please add: BOT_TOKEN_GRAMMAR=your_token_here"
    exit 1
fi

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "To run the bot:"
echo "  python bot.py"
echo ""
echo "Commands available:"
echo "  !check <text>      - Check grammar"
echo "  !improve <text>    - Get writing tips"
echo "  !wordofday        - Daily vocabulary"
echo "  !quiz             - Grammar quiz"
echo "  !tip              - Random tip"
echo "  !stats            - Your progress"
echo ""
echo "Happy learning! 📚✍️"
