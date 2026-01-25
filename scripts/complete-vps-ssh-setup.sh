#!/bin/bash
# Complete SSH setup for GitHub on VPS
# Run this ON YOUR VPS after generating the SSH key

set -e

echo "🔧 Complete VPS SSH Setup for GitHub"
echo "===================================="
echo ""

# Check if key exists
if [ ! -f ~/.ssh/id_ed25519_vps ]; then
    echo "❌ SSH key not found: ~/.ssh/id_ed25519_vps"
    echo "Generate it first:"
    echo "  ssh-keygen -t ed25519 -C 'vps-deployment' -f ~/.ssh/id_ed25519_vps"
    exit 1
fi

echo "✅ SSH key found"
echo ""

# Display public key
echo "📋 Your Public Key (add this to GitHub):"
echo "========================================="
cat ~/.ssh/id_ed25519_vps.pub
echo ""
echo ""

# Check if already added to GitHub
read -p "Have you added this key to GitHub? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📝 Steps to add key to GitHub:"
    echo "1. Go to: https://github.com/settings/keys"
    echo "2. Click 'New SSH key'"
    echo "3. Title: 'VPS Deployment Key'"
    echo "4. Key type: Authentication Key"
    echo "5. Key: Paste the public key above"
    echo "6. Click 'Add SSH key'"
    echo ""
    read -p "Press Enter after adding the key to GitHub..."
fi

# Setup SSH config
echo ""
echo "🔧 Configuring SSH for GitHub..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create or update SSH config
if [ -f ~/.ssh/config ]; then
    # Check if github.com entry exists
    if grep -q "Host github.com" ~/.ssh/config; then
        echo "⚠️  GitHub entry already exists in ~/.ssh/config"
        echo "Updating it..."
        # Remove old github.com entry
        sed -i '/^Host github.com$/,/^$/d' ~/.ssh/config
    fi
fi

# Add GitHub config
cat >> ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_vps
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
EOF

chmod 600 ~/.ssh/config

echo "✅ SSH config created/updated"
echo ""

# Test connection
echo "🔍 Testing SSH connection to GitHub..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ SSH connection successful!"
    echo ""
    echo "You can now clone your repository:"
    echo "  git clone git@github.com:BlueFlashX1/discord-bots.git discord-bots"
else
    echo "❌ SSH connection failed"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify key was added to GitHub: https://github.com/settings/keys"
    echo "2. Make sure it's an 'Authentication Key' (not Signing Key)"
    echo "3. Check key permissions: ls -la ~/.ssh/id_ed25519_vps"
    echo "4. Try again: ssh -T git@github.com"
    exit 1
fi
