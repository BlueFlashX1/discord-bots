#!/bin/bash
# Test SSH connection using the deployment key
# This verifies the key works before GitHub Actions tries it

set -e

KEY_PATH="$HOME/.ssh/id_rsa_deploy"
VPS_HOST="${1:-}"
VPS_USER="${2:-root}"

echo "🔍 SSH Connection Test"
echo "===================="
echo ""

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Deployment key not found: $KEY_PATH"
    echo ""
    echo "Run this first:"
    echo "  ./scripts/create-deploy-key.sh"
    exit 1
fi

# Get VPS host if not provided
if [ -z "$VPS_HOST" ]; then
    echo "Enter your VPS IP address:"
    read -r VPS_HOST
fi

echo "📋 Test Configuration:"
echo "   VPS Host: $VPS_HOST"
echo "   VPS User: $VPS_USER"
echo "   Key: $KEY_PATH"
echo ""

# Test SSH connection
echo "🔐 Testing SSH connection..."
echo ""

if ssh -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    "$VPS_USER@$VPS_HOST" \
    "echo '✅ SSH connection successful!' && whoami && hostname" 2>&1; then
    echo ""
    echo "✅ SSH connection test PASSED!"
    echo ""
    echo "The deployment key works correctly."
    echo "If GitHub Actions still fails, check:"
    echo "  1. GitHub Secret VPS_SSH_KEY contains the EXACT private key"
    echo "  2. No extra spaces or newlines in the secret"
    echo "  3. The secret starts with: -----BEGIN OPENSSH PRIVATE KEY-----"
    echo ""
else
    echo ""
    echo "❌ SSH connection test FAILED!"
    echo ""
    echo "Possible issues:"
    echo "  1. Public key not on VPS:"
    echo "     Run on VPS: echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
    echo ""
    echo "  2. Wrong permissions on VPS:"
    echo "     Run on VPS: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
    echo ""
    echo "  3. SSH service not running:"
    echo "     Run on VPS: systemctl status ssh"
    echo ""
    echo "  4. Firewall blocking SSH:"
    echo "     Check DigitalOcean firewall settings"
    echo ""
    exit 1
fi
