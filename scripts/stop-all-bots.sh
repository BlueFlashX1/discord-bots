#!/bin/bash
# Stop all Discord bots

set -e

BOTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BOTS_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🛑 Stopping Discord Bots..."
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$BOTS_DIR/logs"

# Stop Hangman Bot
if [ -f "logs/hangman-bot.pid" ]; then
  HANGMAN_PID=$(cat logs/hangman-bot.pid)
  if ps -p "$HANGMAN_PID" > /dev/null 2>&1; then
    kill "$HANGMAN_PID" 2>/dev/null || true
    echo -e "${GREEN}✅ Hangman Bot stopped (PID: $HANGMAN_PID)${NC}"
  else
    echo -e "${YELLOW}⚠️  Hangman Bot not running (PID: $HANGMAN_PID)${NC}"
  fi
  rm -f logs/hangman-bot.pid
else
  echo -e "${YELLOW}⚠️  Hangman Bot PID file not found${NC}"
fi

# Stop Grammar Bot
if [ -f "logs/grammar-bot.pid" ]; then
  GRAMMAR_PID=$(cat logs/grammar-bot.pid)
  if ps -p "$GRAMMAR_PID" > /dev/null 2>&1; then
    kill "$GRAMMAR_PID" 2>/dev/null || true
    echo -e "${GREEN}✅ Grammar Bot stopped (PID: $GRAMMAR_PID)${NC}"
  else
    echo -e "${YELLOW}⚠️  Grammar Bot not running (PID: $GRAMMAR_PID)${NC}"
  fi
  rm -f logs/grammar-bot.pid
else
  echo -e "${YELLOW}⚠️  Grammar Bot PID file not found${NC}"
fi

# Stop Exercism Bot
if [ -f "logs/exercism-bot.pid" ]; then
  EXERCISM_PID=$(cat logs/exercism-bot.pid)
  if ps -p "$EXERCISM_PID" > /dev/null 2>&1; then
    kill "$EXERCISM_PID" 2>/dev/null || true
    echo -e "${GREEN}✅ Exercism Bot stopped (PID: $EXERCISM_PID)${NC}"
  else
    echo -e "${YELLOW}⚠️  Exercism Bot not running (PID: $EXERCISM_PID)${NC}"
  fi
  rm -f logs/exercism-bot.pid
else
  echo -e "${YELLOW}⚠️  Exercism Bot PID file not found${NC}"
fi

# Also kill any remaining node processes for these bots
pkill -f "hangman-bot.*index.js" 2>/dev/null || true
pkill -f "grammar-bot.*index.js" 2>/dev/null || true
pkill -f "exercism-bot.*bot.py" 2>/dev/null || true

echo ""
echo "✅ All bots stopped!"
