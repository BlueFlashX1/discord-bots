#!/bin/bash

# Test MonitoRSS - Check status and send test article
# Usage: ./test-monitorss.sh

MONITORSS_DIR="$HOME/Documents/DEVELOPMENT/discord/bots/news-bots/MonitoRSS"
API_URL="http://localhost:8000"

echo "=========================================="
echo "MonitoRSS Status Check & Test"
echo "=========================================="
echo ""

# Check if MonitoRSS directory exists
if [ ! -d "$MONITORSS_DIR" ]; then
    echo "❌ MonitoRSS directory not found: $MONITORSS_DIR"
    exit 1
fi

cd "$MONITORSS_DIR" || exit 1

# Check Docker services
echo "📦 Checking Docker services..."
if command -v docker &> /dev/null; then
    echo ""
    echo "Docker Compose Services:"
    docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
    echo ""

    # Check if services are running
    RUNNING=$(docker compose ps 2>/dev/null | grep -c "Up" || docker-compose ps 2>/dev/null | grep -c "Up" || echo "0")
    if [ "$RUNNING" -eq "0" ]; then
        echo "⚠️  No MonitoRSS services appear to be running"
        echo ""
        echo "To start MonitoRSS:"
        echo "  cd $MONITORSS_DIR"
        echo "  docker compose up -d"
        echo ""
    else
        echo "✅ MonitoRSS services are running ($RUNNING containers)"
    fi
else
    echo "⚠️  Docker not found - cannot check services"
fi

echo ""
echo "🔍 Checking API health..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null)
if [ "$HEALTH_RESPONSE" = '{"ok":1}' ]; then
    echo "✅ API is accessible at $API_URL"
else
    echo "❌ API not responding at $API_URL"
    echo "   Response: $HEALTH_RESPONSE"
    echo ""
    echo "Make sure MonitoRSS is running:"
    echo "  cd $MONITORSS_DIR"
    echo "  docker compose up -d"
fi

echo ""
echo "=========================================="
echo "To Send Test Article:"
echo "=========================================="
echo ""
echo "Option 1: Use Web UI"
echo "  1. Open: http://localhost:8000"
echo "  2. Log in with Discord"
echo "  3. Go to a feed"
echo "  4. Click 'Test' button to send test article"
echo ""
echo "Option 2: Use API (requires authentication)"
echo "  POST $API_URL/api/v1/user-feeds/test"
echo "  Requires: API key and feed configuration"
echo ""
echo "Option 3: Check Discord channels"
echo "  - MonitoRSS should post to configured Discord channels"
echo "  - Check your Discord server for recent posts"
echo ""
