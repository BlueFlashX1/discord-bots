#!/bin/bash
# GitHub Repository Setup Script
# Run this from your bots directory to set up Git and push to GitHub

set -e

BOTS_DIR="/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots"
cd "$BOTS_DIR"

echo "🚀 GitHub Repository Setup"
echo "=========================="
echo ""

# Check if Git is initialized
if [ -d ".git" ]; then
    echo "✅ Git already initialized"
else
    echo "📦 Initializing Git repository..."
    git init
fi

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo "⚠️  .gitignore not found - creating one..."
    # The .gitignore should already exist, but just in case
fi

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
echo "-------------------------"
git status --short | head -20

# Check for .env files (should NOT be committed)
echo ""
echo "🔍 Checking for .env files (should be excluded):"
ENV_FILES=$(git status --porcelain | grep -i "\.env" || true)
if [ -z "$ENV_FILES" ]; then
    echo "✅ No .env files found in staging (good!)"
else
    echo "⚠️  WARNING: .env files detected!"
    echo "$ENV_FILES"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Please check .gitignore"
        exit 1
    fi
fi

# Ask for GitHub username
echo ""
read -p "Enter your GitHub username: " GITHUB_USERNAME

# Ask for repository name
read -p "Enter repository name (default: discord-bots): " REPO_NAME
REPO_NAME=${REPO_NAME:-discord-bots}

# Add all files
echo ""
echo "📦 Staging files..."
git add .

# Create commit
echo ""
read -p "Enter commit message (default: Initial commit): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-Initial commit}
git commit -m "$COMMIT_MSG"

# Check if remote exists
if git remote get-url origin &>/dev/null; then
    echo ""
    echo "Remote 'origin' already exists:"
    git remote get-url origin
    read -p "Update remote URL? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    fi
else
    echo ""
    echo "🔗 Adding GitHub remote..."
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
fi

# Set branch to main
git branch -M main 2>/dev/null || true

# Push
echo ""
echo "📤 Pushing to GitHub..."
echo "   Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "⚠️  If prompted for password, use a Personal Access Token"
echo "   (not your GitHub password)"
echo ""

git push -u origin main

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify files on GitHub: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "   2. Make sure .env files are NOT visible"
echo "   3. On your VPS, clone: git clone https://github.com/$GITHUB_USERNAME/$REPO_NAME.git /root/discord-bots"
echo ""
