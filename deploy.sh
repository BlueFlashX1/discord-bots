#!/bin/bash
# DigitalOcean VPS Deployment Script for Discord Bots
# Run this script on your VPS after initial setup

set -e  # Exit on error

echo "🚀 Discord Bots Deployment Script"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
echo -e "${YELLOW}Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Install PM2 globally
echo -e "${YELLOW}Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 already installed: $(pm2 --version)"
fi

# Install Git if not present
echo -e "${YELLOW}Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

# Create app directory
APP_DIR="/root/discord-bots"
echo -e "${YELLOW}Setting up app directory: ${APP_DIR}${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}Updating repository...${NC}"
    cd "$APP_DIR"
    git pull
else
    echo -e "${YELLOW}Please clone your repository manually:${NC}"
    echo "cd $APP_DIR"
    echo "git clone <your-repo-url> ."
    echo ""
    read -p "Press Enter after you've cloned the repository..."
fi

# Install dependencies for each bot
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$APP_DIR"

# List of bot directories
BOTS=(
    "coding-practice-bot"
    "command-control-bot"
    "hangman-bot"
    "spelling-bee-bot"
    "grammar-bot"
    "todoist bot"
    "reddit-filter-bot"
    "youtube-monitor-bot"
)

for bot in "${BOTS[@]}"; do
    if [ -d "$bot" ] && [ -f "$bot/package.json" ]; then
        echo -e "${GREEN}Installing dependencies for $bot...${NC}"
        cd "$bot"
        npm install --production
        cd "$APP_DIR"
    else
        echo -e "${YELLOW}Skipping $bot (not found or no package.json)${NC}"
    fi
done

# Check for .env files
echo -e "${YELLOW}Checking for .env files...${NC}"
for bot in "${BOTS[@]}"; do
    if [ -d "$bot" ]; then
        if [ ! -f "$bot/.env" ]; then
            echo -e "${RED}⚠️  Missing .env file for $bot${NC}"
            echo "   Create $bot/.env with required environment variables"
        else
            echo -e "${GREEN}✓ Found .env for $bot${NC}"
        fi
    fi
done

# Setup PM2
echo -e "${YELLOW}Setting up PM2...${NC}"
cd "$APP_DIR"

# Stop existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start all bots using ecosystem file
if [ -f "ecosystem.config.js" ]; then
    echo -e "${GREEN}Starting bots with PM2 ecosystem...${NC}"
    pm2 start ecosystem.config.js
else
    echo -e "${RED}ecosystem.config.js not found!${NC}"
    exit 1
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo -e "${YELLOW}Setting up PM2 startup script...${NC}"
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}PM2 will auto-start on system reboot${NC}"

# Show status
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "PM2 Status:"
pm2 list
echo ""
echo "Useful commands:"
echo "  pm2 list              - List all bots"
echo "  pm2 logs <bot-name>   - View logs for a bot"
echo "  pm2 logs --lines 50   - View last 50 lines of all logs"
echo "  pm2 restart all       - Restart all bots"
echo "  pm2 stop all          - Stop all bots"
echo "  pm2 monit             - Monitor dashboard"
echo ""
