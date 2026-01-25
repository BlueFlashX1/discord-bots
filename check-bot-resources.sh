#!/bin/bash

# Check resource usage for all Discord bots on VPS
# Run this on your VPS: bash check-bot-resources.sh

echo "=========================================="
echo "Discord Bot Resource Usage Report"
echo "=========================================="
echo ""

# Check if pm2 is being used
if command -v pm2 &> /dev/null; then
    echo "📊 PM2 Processes:"
    pm2 list
    echo ""
    echo "💾 PM2 Memory Usage:"
    pm2 list --format table | grep -E "name|memory|cpu"
    echo ""
    TOTAL_PM2_MEM=$(pm2 jlist | jq -r '.[] | .monit.memory' 2>/dev/null | awk '{sum+=$1} END {printf "%.2f", sum/1024/1024}')
    if [ ! -z "$TOTAL_PM2_MEM" ]; then
        echo "Total PM2 Memory: ${TOTAL_PM2_MEM} MB"
    fi
    echo ""
fi

# Check for node processes
echo "📊 All Node.js Processes:"
ps aux | grep -E "node.*index\.js|node.*bot" | grep -v grep | awk '{printf "%-20s %6s MB %5s%% CPU\n", $11, $6/1024, $3}'
echo ""

# Calculate total memory for node processes
NODE_MEM=$(ps aux | grep -E "node.*index\.js|node.*bot" | grep -v grep | awk '{sum+=$6} END {printf "%.2f", sum/1024}')
NODE_CPU=$(ps aux | grep -E "node.*index\.js|node.*bot" | grep -v grep | awk '{sum+=$3} END {printf "%.2f", sum}')

# Check system resources
echo "💻 System Resources:"
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/^Mem:/ {print $3}')
AVAIL_MEM=$(free -m | awk '/^Mem:/ {print $7}')
MEM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($USED_MEM/$TOTAL_MEM)*100}")

echo "Total Memory: ${TOTAL_MEM} MB"
echo "Used Memory: ${USED_MEM} MB (${MEM_PERCENT}%)"
echo "Available Memory: ${AVAIL_MEM} MB"
echo ""

if [ ! -z "$NODE_MEM" ]; then
    echo "🤖 Bot Processes Summary:"
    echo "Total Bot Memory: ${NODE_MEM} MB"
    echo "Total Bot CPU: ${NODE_CPU}%"
    BOT_MEM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($NODE_MEM/$TOTAL_MEM)*100}")
    echo "Bot Memory % of Total: ${BOT_MEM_PERCENT}%"
    echo ""
fi

# Check for specific bot directories
echo "📁 Bot Directories Found:"
BOT_DIR="/root/discord-bots"
if [ -d "$BOT_DIR" ]; then
    ls -1 "$BOT_DIR" | while read bot; do
        if [ -d "$BOT_DIR/$bot" ] && [ -f "$BOT_DIR/$bot/package.json" ]; then
            echo "  - $bot"
        fi
    done
else
    echo "  Bot directory not found at $BOT_DIR"
fi
echo ""

# Memory usage breakdown
echo "=========================================="
echo "Memory Breakdown:"
echo "=========================================="
echo "System Total: ${TOTAL_MEM} MB (2 GB = 2048 MB)"
echo "System Used: ${USED_MEM} MB (${MEM_PERCENT}%)"
if [ ! -z "$NODE_MEM" ]; then
    echo "Bots Using: ${NODE_MEM} MB"
    REMAINING=$(awk "BEGIN {printf \"%.0f\", $AVAIL_MEM - $NODE_MEM}")
    echo "Available After Bots: ~${REMAINING} MB"
fi
echo ""

# Warning if over 80% memory
if (( $(echo "$MEM_PERCENT > 80" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠️  WARNING: Memory usage is above 80%!"
fi
