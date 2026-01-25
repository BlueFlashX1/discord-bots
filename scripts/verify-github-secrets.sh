#!/bin/bash
# Verify GitHub Secrets setup
# This script helps you verify your GitHub Secrets are configured correctly

set -e

echo "🔍 GitHub Secrets Verification"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "This script will help you verify your GitHub Secrets setup."
echo ""
echo "📋 Required Secrets:"
echo "==================="
echo ""

# Check 1: VPS_HOST
echo -e "${BLUE}1. VPS_HOST${NC}"
echo "   - Go to: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo "   - Check if 'VPS_HOST' secret exists"
echo "   - Value should be your Droplet IP (e.g., 123.45.67.89)"
read -p "   Does VPS_HOST exist? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "   ${GREEN}✅ VPS_HOST configured${NC}"
else
    echo -e "   ${RED}❌ VPS_HOST missing${NC}"
fi
echo ""

# Check 2: VPS_USERNAME
echo -e "${BLUE}2. VPS_USERNAME${NC}"
echo "   - Should be set to: root"
read -p "   Does VPS_USERNAME exist? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "   ${GREEN}✅ VPS_USERNAME configured${NC}"
else
    echo -e "   ${RED}❌ VPS_USERNAME missing${NC}"
fi
echo ""

# Check 3: VPS_SSH_KEY
echo -e "${BLUE}3. VPS_SSH_KEY${NC}"
echo "   - Should contain the deployment private key (no passphrase)"
echo "   - Should start with: -----BEGIN OPENSSH PRIVATE KEY-----"
read -p "   Does VPS_SSH_KEY exist? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "   ${GREEN}✅ VPS_SSH_KEY configured${NC}"
    echo ""
    echo "   To verify it's the correct key:"
    echo "   - The key should be the one from: ~/.ssh/id_rsa_deploy"
    echo "   - It should NOT have a passphrase"
    echo "   - Copy it again with: ./scripts/copy-deploy-key.sh"
else
    echo -e "   ${RED}❌ VPS_SSH_KEY missing${NC}"
    echo ""
    echo "   Run: ./scripts/copy-deploy-key.sh"
    echo "   Then update the secret in GitHub"
fi
echo ""

# Check 4: VPS_PORT (optional)
echo -e "${BLUE}4. VPS_PORT (Optional)${NC}"
echo "   - Should be set to: 22"
read -p "   Does VPS_PORT exist? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "   ${GREEN}✅ VPS_PORT configured${NC}"
else
    echo -e "   ${YELLOW}⚠️  VPS_PORT optional (defaults to 22)${NC}"
fi
echo ""

# Check deployment key on local machine
echo "🔑 Local Deployment Key Check:"
echo "=============================="
KEY_PATH="$HOME/.ssh/id_rsa_deploy"
if [ -f "$KEY_PATH" ]; then
    echo -e "${GREEN}✅ Deployment key found: $KEY_PATH${NC}"
    echo ""
    echo "   Public key fingerprint:"
    ssh-keygen -lf "${KEY_PATH}.pub" 2>/dev/null || echo "   (Could not read fingerprint)"
    echo ""
    echo "   To copy to clipboard: ./scripts/copy-deploy-key.sh"
else
    echo -e "${RED}❌ Deployment key not found${NC}"
    echo "   Run: ./scripts/create-deploy-key.sh"
fi
echo ""

# Summary
echo "📊 Summary:"
echo "==========="
echo ""
echo "To complete setup:"
echo "1. ✅ Verify all secrets exist in GitHub"
echo "2. ✅ Update VPS_SSH_KEY with deployment key (no passphrase)"
echo "3. ✅ Add public key to VPS: ~/.ssh/authorized_keys"
echo "4. ✅ Test with: git push"
echo ""
echo "Quick commands:"
echo "  Copy key: ./scripts/copy-deploy-key.sh"
echo "  Test push: git push"
echo "  Check Actions: https://github.com/BlueFlashX1/discord-bots/actions"
echo ""
