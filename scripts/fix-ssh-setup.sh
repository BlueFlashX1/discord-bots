#!/bin/bash
# Complete SSH setup fix - guides you through all steps

set -e

KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "🔧 Complete SSH Setup Fix"
echo "========================"
echo ""

# Step 1: Verify key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Deployment key not found!"
    echo "   Creating new key..."
    ./scripts/create-deploy-key.sh
    exit 0
fi

echo "✅ Step 1: Deployment key found"
echo ""

# Step 2: Copy key to clipboard
echo "📋 Step 2: Copying private key to clipboard..."
cat "$KEY_PATH" | pbcopy
echo "✅ Private key copied to clipboard!"
echo ""

# Step 3: Show public key
echo "📋 Step 3: Public Key (add this to VPS):"
echo "========================================="
cat "${KEY_PATH}.pub"
echo ""

# Step 4: Instructions
echo "📝 Step 4: Setup Instructions"
echo "============================="
echo ""
echo "A. Add public key to VPS:"
echo "   1. SSH to your VPS: ssh root@YOUR_IP"
echo "   2. Run this command:"
echo ""
echo "      echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
echo ""
echo "   3. Fix permissions (if needed):"
echo "      chmod 700 ~/.ssh"
echo "      chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "B. Update GitHub Secret:"
echo "   1. Go to: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo "   2. Find 'VPS_SSH_KEY' secret"
echo "   3. Click 'Update'"
echo "   4. DELETE all existing content"
echo "   5. Paste from clipboard (Cmd+V)"
echo "   6. Make sure it starts with: -----BEGIN OPENSSH PRIVATE KEY-----"
echo "   7. Make sure it ends with: -----END OPENSSH PRIVATE KEY-----"
echo "   8. Click 'Update secret'"
echo ""
echo "C. Test connection:"
echo "   ./scripts/test-ssh-connection.sh YOUR_VPS_IP"
echo ""
echo "D. Test deployment:"
echo "   git push"
echo ""

# Step 5: Quick commands
echo "🚀 Quick Commands:"
echo "=================="
echo ""
echo "Copy key again:     ./scripts/copy-deploy-key.sh"
echo "Test connection:   ./scripts/test-ssh-connection.sh YOUR_IP"
echo "Verify secrets:    ./scripts/verify-github-secrets.sh"
echo ""
