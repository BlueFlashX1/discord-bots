#!/bin/bash
# Start all Discord bots in background processes

set -e

BOTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BOTS_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🤖 Starting Discord Bots..."
echo ""

# Start Hangman Bot
echo "📦 Starting Hangman Bot..."
cd "$BOTS_DIR/hangman-bot"
if [ -f ".env" ] && grep -q "DISCORD_TOKEN=" .env && ! grep -q "DISCORD_TOKEN=your_" .env; then
  nohup npm start > ../logs/hangman-bot.log 2>&1 &
  HANGMAN_PID=$!
  echo "$HANGMAN_PID" > ../logs/hangman-bot.pid
  echo -e "${GREEN}✅ Hangman Bot started (PID: $HANGMAN_PID)${NC}"
else
  echo -e "${RED}❌ Hangman Bot .env not configured${NC}"
fi

# Start Grammar Bot
echo "📦 Starting Grammar Bot..."
cd "$BOTS_DIR/grammar-bot"
if [ -f ".env" ] && grep -q "DISCORD_TOKEN=" .env && ! grep -q "DISCORD_TOKEN=your_" .env; then
  nohup npm start > ../logs/grammar-bot.log 2>&1 &
  GRAMMAR_PID=$!
  echo "$GRAMMAR_PID" > ../logs/grammar-bot.pid
  echo -e "${GREEN}✅ Grammar Bot started (PID: $GRAMMAR_PID)${NC}"
else
  echo -e "${RED}❌ Grammar Bot .env not configured${NC}"
fi

# Start Codewars/Coding Practice Bot
echo "📦 Starting Codewars Bot..."
cd "$BOTS_DIR/coding-practice-bot"
if [ -f ".env" ] && (grep -q "DISCORD_BOT_TOKEN=" .env || grep -q "DISCORD_TOKEN=" .env) && ! grep -q "DISCORD.*TOKEN=your_" .env; then
  nohup npm start > ../logs/codewars-bot.log 2>&1 &
  CODEWARS_PID=$!
  echo "$CODEWARS_PID" > ../logs/codewars-bot.pid
  echo -e "${GREEN}✅ Codewars Bot started (PID: $CODEWARS_PID)${NC}"
else
  echo -e "${RED}❌ Codewars Bot .env not configured${NC}"
fi

# Start YouTube Monitor Bot
echo "📦 Starting YouTube Monitor Bot..."
cd "$BOTS_DIR/youtube-monitor-bot"
if [ -f ".env" ] && grep -q "DISCORD_TOKEN=" .env && ! grep -q "DISCORD_TOKEN=your_" .env && grep -q "YOUTUBE_API_KEY=" .env && ! grep -q "YOUTUBE_API_KEY=your_" .env; then
  nohup npm start > ../logs/youtube-bot.log 2>&1 &
  YOUTUBE_PID=$!
  echo "$YOUTUBE_PID" > ../logs/youtube-bot.pid
  echo -e "${GREEN}✅ YouTube Bot started (PID: $YOUTUBE_PID)${NC}"
else
  echo -e "${RED}❌ YouTube Bot .env not configured${NC}"
fi

# Start Exercism Bot
echo "📦 Starting Exercism Bot..."
cd "$BOTS_DIR/exercism-bot"
if [ -f ".env" ] && grep -q "DISCORD_TOKEN=" .env && ! grep -q "DISCORD_TOKEN=your_" .env; then
  if [ -d "venv" ]; then
    source venv/bin/activate
    nohup python bot.py > ../logs/exercism-bot.log 2>&1 &
    EXERCISM_PID=$!
    echo "$EXERCISM_PID" > ../logs/exercism-bot.pid
    echo -e "${GREEN}✅ Exercism Bot started (PID: $EXERCISM_PID)${NC}"
  else
    echo -e "${YELLOW}⚠️  Exercism Bot venv not found, using system Python${NC}"
    nohup python3 bot.py > ../logs/exercism-bot.log 2>&1 &
    EXERCISM_PID=$!
    echo "$EXERCISM_PID" > ../logs/exercism-bot.pid
    echo -e "${GREEN}✅ Exercism Bot started (PID: $EXERCISM_PID)${NC}"
  fi
else
  echo -e "${RED}❌ Exercism Bot .env not configured${NC}"
fi

echo ""
echo "✅ All bots started!"
echo ""
echo "📝 Logs:"
echo "   Hangman Bot: $BOTS_DIR/logs/hangman-bot.log"
echo "   Grammar Bot: $BOTS_DIR/logs/grammar-bot.log"
echo "   Codewars Bot: $BOTS_DIR/logs/codewars-bot.log"
echo "   YouTube Bot: $BOTS_DIR/logs/youtube-bot.log"
echo "   Exercism Bot: $BOTS_DIR/logs/exercism-bot.log"
echo ""
echo "💡 To check status: ./scripts/check-bots-status.sh"
echo "💡 To stop all: ./scripts/stop-all-bots.sh"
