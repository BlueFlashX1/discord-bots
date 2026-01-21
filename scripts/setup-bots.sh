#!/bin/bash
# Rapid setup script for Hangman and Grammar bots

echo "🚀 Setting up Hangman and Grammar Teacher bots..."

# Copy .gitignore from spelling-bee-bot
cp spelling-bee-bot/.gitignore hangman-bot/
cp spelling-bee-bot/.gitignore grammar-bot/ 2>/dev/null || mkdir -p grammar-bot && cp spelling-bee-bot/.gitignore grammar-bot/

# Copy shared utilities
echo "📁 Copying shared utilities..."
cp spelling-bee-bot/utils/embedBuilder.js hangman-bot/utils/
cp spelling-bee-bot/utils/embedBuilder.js grammar-bot/utils/ 2>/dev/null || mkdir -p grammar-bot/utils && cp spelling-bee-bot/utils/embedBuilder.js grammar-bot/utils/

# Copy database connection (we'll use the same dual MongoDB/JSON pattern)
cp spelling-bee-bot/database/db.js hangman-bot/database/
mkdir -p grammar-bot/database && cp spelling-bee-bot/database/db.js grammar-bot/database/

echo "✅ Shared files copied!"
