#!/bin/bash
# Deploy Starboard Bot to VPS
# Usage: ./deploy-vps.sh

set -e

VPS_HOST="64.23.179.177"
VPS_USER="root"
VPS_BOT_DIR="/root/discord-bots/starboard-bot"
SSH_KEY="${HOME}/.ssh/id_rsa_deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying Starboard Bot to VPS...${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}Warning: SSH key not found at $SSH_KEY${NC}"
    echo "Trying alternative key: ~/.ssh/vps_key"
    SSH_KEY="${HOME}/.ssh/vps_key"
    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${RED}Error: No SSH key found. Please set up SSH key first.${NC}"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Please create it first.${NC}"
    exit 1
fi

# Create bot directory on VPS if it doesn't exist
echo -e "${YELLOW}Creating bot directory on VPS...${NC}"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR/data"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR/config"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR/services"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR/utils"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_BOT_DIR/commands"

# Copy files to VPS
echo -e "${YELLOW}Copying files to VPS...${NC}"
scp -i "$SSH_KEY" bot.py "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/"
scp -i "$SSH_KEY" deploy-commands.py "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/"
scp -i "$SSH_KEY" requirements.txt "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/"
scp -i "$SSH_KEY" .env "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/"
scp -i "$SSH_KEY" .gitignore "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/"

# Copy directories
scp -i "$SSH_KEY" -r services/* "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/services/"
scp -i "$SSH_KEY" -r utils/* "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/utils/"
scp -i "$SSH_KEY" -r commands/* "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/commands/"
scp -i "$SSH_KEY" -r config/* "$VPS_USER@$VPS_HOST:$VPS_BOT_DIR/config/"

# Install Python dependencies on VPS
echo -e "${YELLOW}Installing Python dependencies on VPS...${NC}"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $VPS_BOT_DIR && python3 -m pip install -r requirements.txt --quiet"

# Deploy commands
echo -e "${YELLOW}Deploying Discord commands...${NC}"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "cd $VPS_BOT_DIR && python3 deploy-commands.py"

# Restart bot with PM2
echo -e "${YELLOW}Restarting bot with PM2...${NC}"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "pm2 restart starboard-bot || pm2 start ecosystem.config.js --only starboard-bot || (cd $VPS_BOT_DIR && pm2 start bot.py --name starboard-bot --interpreter python3)"

# Check status
echo -e "${YELLOW}Checking bot status...${NC}"
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "pm2 list | grep starboard-bot"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}To view logs: ssh -i $SSH_KEY $VPS_USER@$VPS_HOST 'pm2 logs starboard-bot --lines 50'${NC}"
