#!/bin/bash

# Sync script for Discord bots between Mac and VPS
# Usage: ./sync-bots.sh [bot-name] or ./sync-bots.sh all

VPS_HOST="root@64.23.179.177"
VPS_BOT_DIR="/root/discord-bots"
LOCAL_BOT_DIR="$HOME/Documents/DEVELOPMENT/discord/bots"
SSH_KEY="$HOME/.ssh/id_rsa_deploy"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

sync_bot() {
  local bot_name=$1
  local local_path="$LOCAL_BOT_DIR/$bot_name"
  local vps_path="$VPS_BOT_DIR/$bot_name"

  if [ ! -d "$local_path" ]; then
    echo -e "${RED}❌ Bot directory not found: $local_path${NC}"
    return 1
  fi

  echo -e "${YELLOW}📦 Syncing $bot_name...${NC}"

  # Create directory on VPS if it doesn't exist
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "mkdir -p $vps_path" 2>/dev/null

  # Sync files (exclude node_modules, .env, data directories)
  rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'data' \
    --exclude '.git' \
    --exclude '*.log' \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$local_path/" "$VPS_HOST:$vps_path/"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $bot_name synced successfully${NC}"
    
    # Sync data directory separately (if exists) - don't delete on VPS
    if [ -d "$local_path/data" ]; then
      echo -e "${YELLOW}📁 Syncing data directory for $bot_name...${NC}"
      rsync -avz \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
        "$local_path/data/" "$VPS_HOST:$vps_path/data/"
    fi
  else
    echo -e "${RED}❌ Failed to sync $bot_name${NC}"
    return 1
  fi
}

# Main execution
if [ "$1" == "all" ] || [ -z "$1" ]; then
  echo -e "${YELLOW}🔄 Syncing all bots...${NC}"
  for bot_dir in "$LOCAL_BOT_DIR"/*-bot; do
    if [ -d "$bot_dir" ]; then
      bot_name=$(basename "$bot_dir")
      sync_bot "$bot_name"
    fi
  done
  echo -e "${GREEN}✨ All bots synced!${NC}"
else
  sync_bot "$1"
fi
