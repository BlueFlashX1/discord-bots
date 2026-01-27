#!/bin/bash
# Script to switch Node.js versions for MongoDB compatibility

set -e

echo "🔄 Node.js Version Switcher for Grammar Bot"
echo "============================================"
echo ""

# Check if nvm is installed
if ! command -v nvm &> /dev/null && [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "📦 Loading nvm..."
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Check current version
CURRENT_VERSION=$(node --version 2>/dev/null || echo "unknown")
echo "Current Node.js version: $CURRENT_VERSION"
echo ""

# Recommended versions for MongoDB compatibility
RECOMMENDED_VERSIONS=("v20.18.0" "v22.12.0" "v18.20.0")

echo "Recommended Node.js versions for MongoDB compatibility:"
for i in "${!RECOMMENDED_VERSIONS[@]}"; do
  echo "  $((i+1)). ${RECOMMENDED_VERSIONS[$i]}"
done
echo ""

# Check if nvm is available
if command -v nvm &> /dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "✅ nvm detected"
  echo ""
  echo "To switch versions, run:"
  echo "  nvm install 20.18.0"
  echo "  nvm use 20.18.0"
  echo ""
  echo "Or for version 22:"
  echo "  nvm install 22.12.0"
  echo "  nvm use 22.12.0"
  echo ""

  # Check if recommended versions are installed
  echo "Checking installed versions..."
  for version in "${RECOMMENDED_VERSIONS[@]}"; do
    if nvm list "$version" &> /dev/null; then
      echo "  ✅ $version is installed"
    else
      echo "  ❌ $version is not installed"
    fi
  done
else
  echo "⚠️  nvm not found"
  echo ""
  echo "Install nvm first:"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
  echo ""
  echo "Or use Homebrew to install specific Node.js versions:"
  echo "  brew install node@20"
  echo "  brew install node@22"
fi

echo ""
echo "💡 After switching versions, restart the bot:"
echo "  cd ~/Documents/DEVELOPMENT/discord/bots"
echo "  ./stop-all-bots.sh"
echo "  ./start-all-bots.sh"
