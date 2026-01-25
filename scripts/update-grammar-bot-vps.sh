#!/bin/bash
# Update grammar-bot on VPS with latest fixes
# This copies the fixed files and restarts the bot
#
# ⚠️ CRITICAL: When fixing bots, you MUST update BOTH:
#   1. Local/macOS version (for development)
#   2. VPS version (for production users)
# 
# See: docs/VPS-DEPLOYMENT-REQUIREMENT.md for full details
# AI assistants frequently forget to update VPS - this script helps prevent that

set -e

VPS_IP="64.23.179.177"
VPS_USER="root"
VPS_DIR="/root/discord-bots/grammar-bot"
KEY_PATH="$HOME/.ssh/id_rsa_deploy"
LOCAL_DIR="$HOME/Documents/DEVELOPMENT/discord/bots/grammar-bot"

echo "🚀 Updating Grammar Bot on VPS"
echo "================================"
echo ""
echo "VPS: $VPS_USER@$VPS_IP"
echo "Target: $VPS_DIR"
echo "Source: $LOCAL_DIR"
echo ""

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
  echo "❌ SSH key not found: $KEY_PATH"
  echo "   Trying alternative: $HOME/.ssh/vps_key"
  KEY_PATH="$HOME/.ssh/vps_key"
  if [ ! -f "$KEY_PATH" ]; then
    echo "❌ SSH key not found. Please check your SSH keys."
    exit 1
  fi
fi

# Check if local files exist
if [ ! -f "$LOCAL_DIR/commands/budget.js" ]; then
  echo "❌ Local budget.js not found: $LOCAL_DIR/commands/budget.js"
  exit 1
fi

if [ ! -f "$LOCAL_DIR/services/budgetMonitor.js" ]; then
  echo "❌ Local budgetMonitor.js not found: $LOCAL_DIR/services/budgetMonitor.js"
  exit 1
fi

echo "✅ Files found, copying to VPS..."
echo ""

# Copy the fixed files
echo "📤 Copying budget.js..."
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no \
  "$LOCAL_DIR/commands/budget.js" \
  "$VPS_USER@$VPS_IP:$VPS_DIR/commands/budget.js"

echo "📤 Copying budgetMonitor.js..."
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no \
  "$LOCAL_DIR/services/budgetMonitor.js" \
  "$VPS_USER@$VPS_IP:$VPS_DIR/services/budgetMonitor.js"

echo ""
echo "✅ Files copied successfully!"
echo ""
echo "🔄 Restarting grammar-bot on VPS..."

# Restart the bot via PM2
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'ENDSSH'
  echo "Stopping grammar-bot..."
  pm2 stop grammar-bot || true
  sleep 2
  echo "Starting grammar-bot..."
  pm2 start grammar-bot
  sleep 2
  echo ""
  echo "PM2 Status:"
  pm2 list | grep grammar-bot
  echo ""
  echo "Recent logs:"
  pm2 logs grammar-bot --lines 10 --nostream
ENDSSH

echo ""
echo "✅ Grammar bot updated and restarted on VPS!"
echo ""
echo "Check status with:"
echo "  ssh -i $KEY_PATH $VPS_USER@$VPS_IP 'pm2 logs grammar-bot --lines 20'"
