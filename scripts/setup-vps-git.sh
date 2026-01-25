#!/bin/bash
# Setup Git authentication on VPS
# Run this ON YOUR VPS

set -e

echo "🔐 VPS Git Authentication Setup"
echo "==============================="
echo ""

echo "GitHub no longer supports password authentication."
echo "Choose an option:"
echo ""
echo "1. Personal Access Token (PAT) - Easier, quick setup"
echo "2. SSH Key - More secure, better for automation"
echo ""
read -p "Choose option (1 or 2): " choice

case $choice in
  1)
    echo ""
    echo "📋 Personal Access Token Setup"
    echo "============================="
    echo ""
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
    echo "3. Name: 'VPS Deployment'"
    echo "4. Select scope: ✅ repo (Full control of private repositories)"
    echo "5. Click 'Generate token'"
    echo "6. Copy the token"
    echo ""
    read -p "Paste your token here: " token
    
    if [ -z "$token" ]; then
      echo "❌ No token provided"
      exit 1
    fi
    
    echo ""
    echo "Configuring Git credential helper..."
    git config --global credential.helper store
    
    # Test with a clone (will save credentials)
    echo ""
    echo "Testing authentication..."
    echo "https://$token@github.com" > ~/.git-credentials
    chmod 600 ~/.git-credentials
    
    echo "✅ Git credentials configured!"
    echo ""
    echo "Now you can clone:"
    echo "  git clone https://github.com/BlueFlashX1/discord-bots.git"
    ;;
    
  2)
    echo ""
    echo "🔑 SSH Key Setup"
    echo "==============="
    echo ""
    
    # Check if key already exists
    if [ -f ~/.ssh/id_ed25519_vps ]; then
      echo "⚠️  SSH key already exists: ~/.ssh/id_ed25519_vps"
      read -p "Generate new key anyway? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key..."
      else
        ssh-keygen -t ed25519 -C "vps-deployment" -f ~/.ssh/id_ed25519_vps -N ""
      fi
    else
      ssh-keygen -t ed25519 -C "vps-deployment" -f ~/.ssh/id_ed25519_vps -N ""
    fi
    
    echo ""
    echo "📋 Public Key (add this to GitHub):"
    echo "===================================="
    cat ~/.ssh/id_ed25519_vps.pub
    echo ""
    echo ""
    echo "1. Go to: https://github.com/settings/keys"
    echo "2. Click 'New SSH key'"
    echo "3. Title: 'VPS Deployment Key'"
    echo "4. Key: Paste the public key above"
    echo "5. Click 'Add SSH key'"
    echo ""
    read -p "Press Enter after adding the key to GitHub..."
    
    # Configure SSH for GitHub
    echo ""
    echo "Configuring SSH for GitHub..."
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    
    cat >> ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_vps
    IdentitiesOnly yes
EOF
    
    chmod 600 ~/.ssh/config
    
    # Test connection
    echo ""
    echo "Testing SSH connection to GitHub..."
    ssh -T git@github.com || true
    
    echo ""
    echo "✅ SSH key configured!"
    echo ""
    echo "Now you can clone:"
    echo "  git clone git@github.com:BlueFlashX1/discord-bots.git"
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Git authentication setup complete!"
echo ""
