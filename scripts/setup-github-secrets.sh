#!/bin/bash
# Helper script to prepare GitHub Secrets values
# This script shows you what to copy for GitHub Secrets

echo "🔐 GitHub Secrets Setup Helper"
echo "=============================="
echo ""
echo "This script will help you prepare values for GitHub Secrets."
echo "You'll need to manually add them at:"
echo "https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo ""

# Get SSH private key
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH key not found at $SSH_KEY_PATH"
    echo "   Please check your SSH key location"
    exit 1
fi

echo "📋 Secret Values to Copy:"
echo "========================="
echo ""

echo "1️⃣  VPS_HOST"
echo "   Name: VPS_HOST"
echo "   Value: [Your Droplet IP - you need to provide this]"
echo "   Example: 123.45.67.89"
echo ""

echo "2️⃣  VPS_USERNAME"
echo "   Name: VPS_USERNAME"
echo "   Value: root"
echo ""

echo "3️⃣  VPS_SSH_KEY"
echo "   Name: VPS_SSH_KEY"
echo "   Value: (Your private SSH key - copying to clipboard now...)"
cat "$SSH_KEY_PATH" | pbcopy
echo "   ✅ Private key copied to clipboard!"
echo "   (Paste this entire key into GitHub Secret)"
echo ""

echo "4️⃣  VPS_PORT (Optional)"
echo "   Name: VPS_PORT"
echo "   Value: 22"
echo ""

echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Go to: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo "2. Click 'New repository secret' for each secret above"
echo "3. For VPS_HOST, enter your Droplet IP address"
echo "4. For VPS_SSH_KEY, paste from clipboard (Cmd+V)"
echo "5. Save each secret"
echo ""
echo "✅ After adding all secrets, test with: git push"
echo ""
