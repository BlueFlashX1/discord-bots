#!/bin/bash
# Archive Hangman Bot - Local and VPS
# This script archives the hangman-bot both locally and on VPS

set -e

VPS_IP="64.23.179.177"
VPS_USER="root"
VPS_DIR="/root/discord-bots"
ARCHIVE_DATE=$(date +%Y%m%d)
KEY_PATH="$HOME/.ssh/id_rsa_deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Archiving Hangman Bot...${NC}"
echo ""

# Step 1: Stop bot on VPS
echo -e "${YELLOW}1. Stopping hangman-bot on VPS...${NC}"
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" \
  "pm2 stop hangman-bot 2>/dev/null || echo 'Bot not running or already stopped'" || true
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" \
  "pm2 delete hangman-bot 2>/dev/null || echo 'Bot not in PM2 or already deleted'" || true
echo -e "${GREEN}✅ Hangman bot stopped on VPS${NC}"
echo ""

# Step 2: Archive on VPS
echo -e "${YELLOW}2. Archiving hangman-bot on VPS...${NC}"
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" << 'EOF'
  ARCHIVE_DATE=$(date +%Y%m%d)
  VPS_DIR="/root/discord-bots"
  ARCHIVE_DIR="$VPS_DIR/_archive"
  
  # Create archive directory if it doesn't exist
  mkdir -p "$ARCHIVE_DIR"
  
  # Move hangman-bot to archive with date
  if [ -d "$VPS_DIR/hangman-bot" ]; then
    mv "$VPS_DIR/hangman-bot" "$ARCHIVE_DIR/hangman-bot-archived-$ARCHIVE_DATE"
    echo "✅ Hangman bot archived on VPS: $ARCHIVE_DIR/hangman-bot-archived-$ARCHIVE_DATE"
  else
    echo "⚠️  Hangman bot directory not found on VPS"
  fi
  
  # Archive logs if they exist
  if [ -f "$VPS_DIR/logs/hangman-bot-error.log" ] || [ -f "$VPS_DIR/logs/hangman-bot-out.log" ]; then
    mkdir -p "$ARCHIVE_DIR/logs"
    mv "$VPS_DIR/logs/hangman-bot"*.log "$ARCHIVE_DIR/logs/" 2>/dev/null || true
    echo "✅ Hangman bot logs archived"
  fi
EOF
echo -e "${GREEN}✅ VPS archiving complete${NC}"
echo ""

# Step 3: Archive locally
echo -e "${YELLOW}3. Archiving hangman-bot locally...${NC}"
BOTS_DIR="$HOME/Documents/DEVELOPMENT/discord/bots"
ARCHIVE_DIR="$BOTS_DIR/_archive"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Move hangman-bot to archive with date
if [ -d "$BOTS_DIR/hangman-bot" ]; then
  mv "$BOTS_DIR/hangman-bot" "$ARCHIVE_DIR/hangman-bot-archived-$ARCHIVE_DATE"
  echo -e "${GREEN}✅ Hangman bot archived locally: $ARCHIVE_DIR/hangman-bot-archived-$ARCHIVE_DATE${NC}"
else
  echo -e "${YELLOW}⚠️  Hangman bot directory not found locally${NC}"
fi
echo ""

# Step 4: Remove from ecosystem.config.js (already done manually)
echo -e "${YELLOW}4. Checking ecosystem.config.js...${NC}"
if [ -f "$BOTS_DIR/ecosystem.config.js" ]; then
  if grep -q "hangman-bot" "$BOTS_DIR/ecosystem.config.js"; then
    echo -e "${YELLOW}⚠️  hangman-bot still found in ecosystem.config.js${NC}"
    echo -e "${YELLOW}   Please remove it manually${NC}"
  else
    echo -e "${GREEN}✅ hangman-bot already removed from ecosystem.config.js${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  ecosystem.config.js not found${NC}"
fi
echo ""

# Step 5: Update PM2 on VPS (reload config)
echo -e "${YELLOW}5. Updating PM2 configuration on VPS...${NC}"
scp -i "$KEY_PATH" "$BOTS_DIR/ecosystem.config.js" "$VPS_USER@$VPS_IP:$VPS_DIR/ecosystem.config.js"
ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" "pm2 save" || true
echo -e "${GREEN}✅ PM2 configuration updated on VPS${NC}"
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Hangman Bot Archiving Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 Local Archive: $ARCHIVE_DIR/hangman-bot-archived-$ARCHIVE_DATE"
echo "📦 VPS Archive: /root/discord-bots/_archive/hangman-bot-archived-$ARCHIVE_DATE"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review ecosystem.config.js to ensure hangman-bot is removed"
echo "   2. Update any documentation that references hangman-bot"
echo "   3. Consider removing hangman-bot from GitHub Actions workflow if needed"
echo ""
