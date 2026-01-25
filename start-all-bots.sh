#!/bin/bash
# Start all Discord bots using PM2 ecosystem config

echo "Starting all Discord bots..."

# Navigate to bots directory
cd /root/discord-bots || exit 1

# Start all bots from ecosystem config
pm2 start ecosystem.config.js

# Show status
echo ""
echo "Bot status:"
pm2 list

echo ""
echo "All bots started! Use 'pm2 logs' to view logs or 'pm2 status' to check status."
