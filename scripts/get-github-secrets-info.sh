#!/bin/bash
# Fetch all information needed for GitHub Secrets setup
# This script gathers everything you need in one place

set -e

echo "🔐 GitHub Secrets Information Gatherer"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get SSH private key
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  SSH key not found at $SSH_KEY_PATH${NC}"
    echo "   Checking for other SSH keys..."
    SSH_KEY_PATH=$(find ~/.ssh -name "id_*" -not -name "*.pub" | head -1)
    if [ -z "$SSH_KEY_PATH" ]; then
        echo -e "${YELLOW}❌ No SSH private key found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found SSH key: $SSH_KEY_PATH${NC}"
else
    echo -e "${GREEN}✅ Found SSH key: $SSH_KEY_PATH${NC}"
fi

# Read SSH key
SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")

# Get Droplet IP (try to find from SSH config or prompt)
DROPLET_IP=""
if [ -f "$HOME/.ssh/config" ]; then
    # Try to find DigitalOcean host
    DROPLET_IP=$(grep -A 5 "Host.*digitalocean\|Host.*droplet\|Host.*vps" "$HOME/.ssh/config" 2>/dev/null | grep "HostName" | awk '{print $2}' | head -1)
fi

# If not found, check recent SSH connections
if [ -z "$DROPLET_IP" ]; then
    # Check if user has a known_hosts entry (might have IP)
    if [ -f "$HOME/.ssh/known_hosts" ]; then
        echo -e "${YELLOW}Checking recent SSH connections...${NC}"
    fi
fi

echo ""
echo "📋 GitHub Secrets Information"
echo "=============================="
echo ""

# Create a temporary file to store all info
TEMP_FILE=$(mktemp)
echo "# GitHub Secrets Setup Information" > "$TEMP_FILE"
echo "# Generated: $(date)" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Secret 1: VPS_HOST
echo -e "${BLUE}1️⃣  VPS_HOST${NC}"
echo "   Name: VPS_HOST"
if [ -n "$DROPLET_IP" ]; then
    echo -e "   Value: ${GREEN}$DROPLET_IP${NC} (detected)"
    echo "VPS_HOST=$DROPLET_IP" >> "$TEMP_FILE"
else
    echo -e "   Value: ${YELLOW}[Enter your Droplet IP from DigitalOcean]${NC}"
    echo "   Example: 123.45.67.89"
    echo "VPS_HOST=[YOUR_DROPLET_IP]" >> "$TEMP_FILE"
fi
echo ""

# Secret 2: VPS_USERNAME
echo -e "${BLUE}2️⃣  VPS_USERNAME${NC}"
echo "   Name: VPS_USERNAME"
echo -e "   Value: ${GREEN}root${NC}"
echo "VPS_USERNAME=root" >> "$TEMP_FILE"
echo ""

# Secret 3: VPS_SSH_KEY
echo -e "${BLUE}3️⃣  VPS_SSH_KEY${NC}"
echo "   Name: VPS_SSH_KEY"
echo "   Value: (Private SSH key - see below)"
echo "   Location: $SSH_KEY_PATH"
echo ""
echo "   Full key (copy this entire block):"
echo "   ──────────────────────────────────────────────────────────"
echo "$SSH_PRIVATE_KEY" | sed 's/^/   /'
echo "   ──────────────────────────────────────────────────────────"
echo ""
echo "VPS_SSH_KEY<<EOF" >> "$TEMP_FILE"
echo "$SSH_PRIVATE_KEY" >> "$TEMP_FILE"
echo "EOF" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Copy SSH key to clipboard
echo "$SSH_PRIVATE_KEY" | pbcopy
echo -e "   ${GREEN}✅ SSH key copied to clipboard!${NC}"
echo ""

# Secret 4: VPS_PORT
echo -e "${BLUE}4️⃣  VPS_PORT (Optional)${NC}"
echo "   Name: VPS_PORT"
echo -e "   Value: ${GREEN}22${NC}"
echo "VPS_PORT=22" >> "$TEMP_FILE"
echo ""

# GitHub repository info
echo "📦 Repository Information"
echo "========================="
echo "   Repository: https://github.com/BlueFlashX1/discord-bots"
echo "   Secrets URL: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo ""

# Save to file
INFO_FILE="$HOME/Desktop/github-secrets-info.txt"
cp "$TEMP_FILE" "$INFO_FILE"
rm "$TEMP_FILE"

echo -e "${GREEN}✅ All information saved to: $INFO_FILE${NC}"
echo ""

# Instructions
echo "📝 Setup Instructions"
echo "===================="
echo ""
echo "1. Open GitHub Secrets page:"
echo -e "   ${BLUE}https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions${NC}"
echo ""
echo "2. For each secret above:"
echo "   - Click 'New repository secret'"
echo "   - Enter the Name (exactly as shown)"
echo "   - Paste the Value"
echo "   - Click 'Add secret'"
echo ""
echo "3. For VPS_SSH_KEY:"
echo "   - Paste the entire key from clipboard (Cmd+V)"
echo "   - Make sure it includes BEGIN and END lines"
echo ""
if [ -z "$DROPLET_IP" ]; then
    echo -e "4. ${YELLOW}Get your Droplet IP:${NC}"
    echo "   - Go to DigitalOcean dashboard"
    echo "   - Click your Droplet"
    echo "   - Copy the IP address"
    echo ""
fi
echo "5. After adding all secrets:"
echo "   - Test with: git push"
echo "   - Check Actions tab for deployment"
echo ""

# Ask if user wants to open GitHub
read -p "Open GitHub Secrets page in browser? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
    echo -e "${GREEN}✅ Opened GitHub Secrets page${NC}"
fi

echo ""
echo -e "${GREEN}✅ All information gathered!${NC}"
echo "   Check the file on your Desktop: github-secrets-info.txt"
echo ""
