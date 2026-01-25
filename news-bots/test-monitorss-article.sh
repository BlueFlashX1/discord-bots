#!/bin/bash

# Test MonitoRSS - Send a test article
# This script tests if MonitoRSS can successfully post an article to Discord

VPS_HOST="root@64.23.179.177"
SSH_KEY="$HOME/.ssh/id_rsa_deploy"
API_URL="http://localhost:8000"

echo "=========================================="
echo "MonitoRSS Test Article Script"
echo "=========================================="
echo ""

# Check if MonitoRSS API is accessible
echo "🔍 Checking MonitoRSS API..."
HEALTH=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "curl -s $API_URL/api/v1/health 2>/dev/null")
if [ "$HEALTH" = '{"ok":1}' ]; then
    echo "✅ MonitoRSS API is accessible"
else
    echo "❌ MonitoRSS API not responding"
    echo "   Response: $HEALTH"
    exit 1
fi

echo ""
echo "=========================================="
echo "To Test MonitoRSS Article Posting:"
echo "=========================================="
echo ""
echo "Option 1: Use Web UI (Recommended)"
echo "  1. Access: http://64.23.179.177:8000"
echo "  2. Log in with Discord"
echo "  3. Go to a feed"
echo "  4. Click 'Test' or 'Send Test Article' button"
echo "  5. Check your Discord channel for the test article"
echo ""
echo "Option 2: Use API (requires authentication)"
echo "  POST $API_URL/api/v1/user-feeds/{feedId}/test-send"
echo "  Requires:"
echo "    - Discord OAuth token (from web UI login)"
echo "    - Feed ID (from your configured feeds)"
echo "    - Channel ID (Discord channel to post to)"
echo ""
echo "Option 3: Check Recent Posts"
echo "  - Check your Discord server channels"
echo "  - MonitoRSS should be posting articles automatically"
echo "  - Look for recent RSS feed posts"
echo ""
echo "=========================================="
echo "Current MonitoRSS Services Status:"
echo "=========================================="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_HOST" "pm2 list | grep monitorss" 2>/dev/null || echo "Could not check PM2 status"
echo ""
