#!/bin/bash
# Update all bots on VPS: pull changes, install dependencies, restart bots
# Run from local machine

set -e

VPS_HOST="root@64.23.179.177"
VPS_BOT_DIR="/root/discord-bots"
SSH_KEY="$HOME/.ssh/id_rsa_deploy"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Updating all bots on VPS...${NC}"
echo ""

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "cd $VPS_BOT_DIR && git pull" || {
  echo -e "${RED}❌ Failed to pull changes${NC}"
  exit 1
}

# Install root dependencies
echo -e "${YELLOW}📦 Installing root directory dependencies...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "cd $VPS_BOT_DIR && npm install --production" || {
  echo -e "${YELLOW}⚠️  Root dependencies install had issues (may be fine if already installed)${NC}"
}

# Install dependencies for each bot
echo -e "${YELLOW}📦 Installing bot dependencies...${NC}"
BOTS=(
  "coding-practice-bot"
  "command-control-bot"
  "grammar-bot"
  "todoist bot"
  "reddit-filter-bot"
  "youtube-monitor-bot"
)

for bot in "${BOTS[@]}"; do
  echo -e "${YELLOW}  Installing for $bot...${NC}"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "cd $VPS_BOT_DIR/$bot && npm install --production" || {
    echo -e "${YELLOW}  ⚠️  $bot dependencies had issues (may be fine if already installed)${NC}"
  }
done

# Restart all bots
echo -e "${YELLOW}🔄 Restarting all bots...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "cd $VPS_BOT_DIR && pm2 restart all"

# Show status
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo -e "${YELLOW}📊 Bot Status:${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "cd $VPS_BOT_DIR && pm2 list"
