#!/bin/bash
# Quick SSH test - prompts for IP and tests connection

set -e

KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "🔍 Quick SSH Connection Test"
echo "============================"
echo ""

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Deployment key not found!"
    echo "Run: ./scripts/create-deploy-key.sh"
    exit 1
fi

# Get VPS IP
echo "Enter your DigitalOcean Droplet IP address:"
echo "(You can find this in your DigitalOcean dashboard)"
read -r VPS_IP

if [ -z "$VPS_IP" ]; then
    echo "❌ No IP provided"
    exit 1
fi

echo ""
echo "Testing connection to $VPS_IP..."
echo ""

# Test connection
if ssh -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    "root@$VPS_IP" \
    "echo '✅ Connection successful!' && whoami && hostname" 2>&1; then
    echo ""
    echo "✅✅✅ SSH TEST PASSED! ✅✅✅"
    echo ""
    echo "Your SSH key works! If GitHub Actions still fails,"
    echo "the issue is with the GitHub Secret VPS_SSH_KEY."
    echo ""
    echo "Next steps:"
    echo "1. Make sure GitHub Secret VPS_SSH_KEY is updated"
    echo "2. Run: ./scripts/copy-deploy-key.sh (to get key in clipboard)"
    echo "3. Update the secret in GitHub"
    echo "4. Test deployment: git push"
    echo ""
else
    echo ""
    echo "❌ SSH TEST FAILED"
    echo ""
    echo "The public key is NOT on your VPS or there's a connection issue."
    echo ""
    echo "Fix:"
    echo "1. SSH to your VPS: ssh root@$VPS_IP"
    echo "2. Add the public key:"
    echo ""
    echo "   echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
    echo ""
    echo "3. Fix permissions:"
    echo "   chmod 700 ~/.ssh"
    echo "   chmod 600 ~/.ssh/authorized_keys"
    echo ""
    echo "4. Run this test again"
    echo ""
    exit 1
fi
