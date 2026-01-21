#!/bin/bash
# Comprehensive setup script for all Discord bots
# This script sets up: hangman-bot, spelling-bee-bot, and grammar-bot

set -e

BOTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BOTS_DIR"

echo "🤖 Discord Bots Setup Script"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
echo ""

# Function to setup a bot
setup_bot() {
    local BOT_NAME=$1
    local BOT_DIR="$BOTS_DIR/$BOT_NAME"
    
    if [ ! -d "$BOT_DIR" ]; then
        echo -e "${YELLOW}⚠️  $BOT_NAME directory not found, skipping...${NC}"
        return
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 Setting up: $BOT_NAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$BOT_DIR"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found for $BOT_NAME${NC}"
        echo "   This bot may need manual setup."
        return
    fi
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    if [ -d "node_modules" ]; then
        echo "   node_modules exists, running npm install to update..."
    fi
    npm install
    
    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}⚠️  .env file not found${NC}"
            echo "   Copying .env.example to .env..."
            cp .env.example .env
            echo -e "${YELLOW}   ⚠️  IMPORTANT: Edit .env file with your tokens!${NC}"
        else
            echo -e "${YELLOW}⚠️  No .env.example found. You'll need to create .env manually.${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env file exists${NC}"
    fi
    
    echo -e "${GREEN}✅ $BOT_NAME setup complete!${NC}"
    echo ""
}

# Setup each bot
setup_bot "hangman-bot"
setup_bot "spelling-bee-bot"
setup_bot "grammar-bot"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure .env files for each bot:"
echo "   - DISCORD_TOKEN (from Discord Developer Portal)"
echo "   - CLIENT_ID (your bot's application ID)"
echo "   - GUILD_ID (optional, for faster command deployment)"
echo "   - OPENAI_API_KEY (for AI features)"
echo "   - MONGODB_URI (optional, for MongoDB database)"
echo ""
echo "2. Deploy slash commands for each bot:"
echo "   cd hangman-bot && npm run deploy"
echo "   cd spelling-bee-bot && npm run deploy"
echo "   cd grammar-bot && npm run deploy"
echo ""
echo "3. Start the bots:"
echo "   cd hangman-bot && npm start"
echo "   cd spelling-bee-bot && npm start"
echo "   cd grammar-bot && npm start"
echo ""
echo "💡 Tip: Use 'npm run dev' for development with auto-restart (requires nodemon)"
echo ""
