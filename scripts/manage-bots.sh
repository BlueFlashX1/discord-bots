#!/bin/bash
# Helper script for managing Discord bots on VPS
# Usage: ./manage-bots.sh [command] [bot-name]

set -e

APP_DIR="/root/discord-bots"
cd "$APP_DIR"

case "$1" in
  status)
    echo "📊 Bot Status:"
    pm2 list
    ;;
  
  logs)
    if [ -z "$2" ]; then
      echo "📋 Recent logs (all bots):"
      pm2 logs --lines 30
    else
      echo "📋 Logs for $2:"
      pm2 logs "$2" --lines 50
    fi
    ;;
  
  restart)
    if [ -z "$2" ]; then
      echo "🔄 Restarting all bots..."
      pm2 restart all
    else
      echo "🔄 Restarting $2..."
      pm2 restart "$2"
    fi
    ;;
  
  stop)
    if [ -z "$2" ]; then
      echo "⏹️  Stopping all bots..."
      pm2 stop all
    else
      echo "⏹️  Stopping $2..."
      pm2 stop "$2"
    fi
    ;;
  
  start)
    if [ -z "$2" ]; then
      echo "▶️  Starting all bots..."
      pm2 start ecosystem.config.js
    else
      echo "▶️  Starting $2..."
      pm2 start "$2"
    fi
    ;;
  
  update)
    echo "📥 Updating bots from Git..."
    git pull
    echo "📦 Installing dependencies..."
    for bot in coding-practice-bot command-control-bot hangman-bot spelling-bee-bot grammar-bot "todoist bot" reddit-filter-bot youtube-monitor-bot; do
      if [ -d "$bot" ] && [ -f "$bot/package.json" ]; then
        echo "  Installing for $bot..."
        cd "$bot" && npm install --production && cd ..
      fi
    done
    echo "🔄 Restarting all bots..."
    pm2 restart all
    echo "✅ Update complete!"
    ;;
  
  monitor)
    echo "📊 Opening PM2 monitor..."
    pm2 monit
    ;;
  
  *)
    echo "Discord Bots Management Script"
    echo ""
    echo "Usage: $0 [command] [bot-name]"
    echo ""
    echo "Commands:"
    echo "  status              - Show status of all bots"
    echo "  logs [bot-name]    - Show logs (all or specific bot)"
    echo "  restart [bot-name] - Restart bot(s)"
    echo "  stop [bot-name]    - Stop bot(s)"
    echo "  start [bot-name]   - Start bot(s)"
    echo "  update             - Pull latest code and restart"
    echo "  monitor            - Open PM2 monitoring dashboard"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs coding-practice-bot"
    echo "  $0 restart all"
    echo "  $0 update"
    ;;
esac
