#!/bin/bash
# Copy deployment SSH key to clipboard and verify setup

set -e

KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "🔑 Deployment Key Manager"
echo "========================"
echo ""

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Deployment key not found: $KEY_PATH"
    echo ""
    echo "Run this first:"
    echo "  ./scripts/create-deploy-key.sh"
    exit 1
fi

# Copy private key to clipboard
echo "📋 Copying private key to clipboard..."
cat "$KEY_PATH" | pbcopy
echo "✅ Private key copied to clipboard!"
echo ""

# Display key info
echo "📝 Key Information:"
echo "==================="
echo "   Location: $KEY_PATH"
echo "   Public key: ${KEY_PATH}.pub"
echo ""

# Show first/last lines of key (for verification)
echo "🔍 Key Preview (first 3 lines):"
head -3 "$KEY_PATH" | sed 's/^/   /'
echo "   ..."
echo "🔍 Key Preview (last 3 lines):"
tail -3 "$KEY_PATH" | sed 's/^/   /'
echo ""

# Show public key
echo "📋 Public Key (for VPS):"
echo "======================="
cat "${KEY_PATH}.pub"
echo ""

# Instructions
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Update GitHub Secret VPS_SSH_KEY:"
echo "   - Go to: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo "   - Find VPS_SSH_KEY secret"
echo "   - Click 'Update'"
echo "   - Paste from clipboard (Cmd+V)"
echo "   - Click 'Update secret'"
echo ""
echo "2. Add public key to VPS (if not done):"
echo "   - SSH to VPS: ssh root@YOUR_IP"
echo "   - Run: echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
echo ""
echo "3. Test deployment:"
echo "   - Make a small change and push"
echo "   - Check GitHub Actions tab"
echo ""

echo "✅ Ready to update GitHub Secret!"
echo "   Private key is in your clipboard (Cmd+V to paste)"
echo ""
