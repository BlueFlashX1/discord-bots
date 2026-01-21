#!/bin/bash
# Check status of all Discord bots

BOTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BOTS_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 Discord Bots Status Check"
echo "============================"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$BOTS_DIR/logs"

check_bot() {
  local BOT_NAME=$1
  local BOT_DIR=$2
  local PID_FILE="logs/${BOT_NAME}.pid"
  local LOG_FILE="logs/${BOT_NAME}.log"
  
  # Capitalize first letter (compatible with older bash)
  local DISPLAY_NAME=$(echo "$BOT_NAME" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
  
  echo "🤖 ${DISPLAY_NAME} Bot"
  
  # Check if PID file exists
  if [ -f "$PID_FILE" ]; then
    local PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
    
    # Check if process is running
    if [ -n "$PID" ] && ps -p "$PID" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ RUNNING${NC} (PID: $PID)"
      
      # Check uptime
      local START_TIME=$(ps -o lstart= -p "$PID" 2>/dev/null || echo "")
      if [ -n "$START_TIME" ]; then
        echo "   Started: $START_TIME"
      fi
      
      # Check last log activity
      if [ -f "$LOG_FILE" ]; then
        local LAST_LOG=$(tail -1 "$LOG_FILE" 2>/dev/null | cut -c 1-80)
        if [ -n "$LAST_LOG" ]; then
          echo "   Last log: ${LAST_LOG}"
        fi
      fi
    else
      echo -e "${RED}❌ NOT RUNNING${NC} (PID file exists but process not found)"
    fi
  else
    echo -e "${YELLOW}⚠️  NOT STARTED${NC} (no PID file)"
  fi
  
  echo ""
}

# Check each bot
check_bot "hangman" "$BOTS_DIR/hangman-bot"
check_bot "grammar" "$BOTS_DIR/grammar-bot"

echo "============================"
echo ""
echo "💡 Commands:"
echo "   Start all:  ./scripts/start-all-bots.sh"
echo "   Stop all:   ./scripts/stop-all-bots.sh"
echo "   View logs:  tail -f logs/hangman-bot.log"
echo "               tail -f logs/grammar-bot.log"
echo ""
