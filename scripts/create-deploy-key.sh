#!/bin/bash
# Create a new SSH key specifically for GitHub Actions deployment
# This key will NOT have a passphrase (required for automation)

set -e

echo "🔑 Creating Deployment SSH Key"
echo "=============================="
echo ""
echo "This will create a NEW SSH key specifically for GitHub Actions."
echo "This key will NOT have a passphrase (required for automation)."
echo ""

# Key location
KEY_NAME="id_rsa_deploy"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
PUB_KEY_PATH="$KEY_PATH.pub"

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    echo "⚠️  Key already exists: $KEY_PATH"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -f "$KEY_PATH" "$PUB_KEY_PATH"
fi

# Generate new key without passphrase
echo "Generating new SSH key (no passphrase)..."
ssh-keygen -t rsa -b 4096 -f "$KEY_PATH" -N "" -C "github-actions-deploy"

echo ""
echo "✅ SSH key created!"
echo ""

# Display public key
echo "📋 Public Key (add this to your VPS):"
echo "====================================="
cat "$PUB_KEY_PATH"
echo ""

# Copy private key to clipboard
cat "$KEY_PATH" | pbcopy
echo "✅ Private key copied to clipboard!"
echo ""

# Instructions
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Add public key to your VPS:"
echo "   - SSH into your VPS: ssh root@YOUR_IP"
echo "   - Run: mkdir -p ~/.ssh && echo '$(cat $PUB_KEY_PATH)' >> ~/.ssh/authorized_keys"
echo "   - Or use the command below"
echo ""
echo "2. Update GitHub Secret VPS_SSH_KEY:"
echo "   - Go to: https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions"
echo "   - Edit VPS_SSH_KEY secret"
echo "   - Paste the private key from clipboard (Cmd+V)"
echo "   - Save"
echo ""

# Generate command to add to VPS
echo "🔧 Command to run on your VPS:"
echo "=============================="
echo ""
echo "Run this on your VPS to add the public key:"
echo ""
echo "echo '$(cat $PUB_KEY_PATH)' >> ~/.ssh/authorized_keys"
echo ""
echo "Or copy-paste this:"
echo ""
cat "$PUB_KEY_PATH" | sed "s/^/echo '/; s/$/' >> ~\/.ssh\/authorized_keys/"
echo ""

echo "✅ Setup complete!"
echo "   Private key location: $KEY_PATH"
echo "   Public key location: $PUB_KEY_PATH"
echo ""
