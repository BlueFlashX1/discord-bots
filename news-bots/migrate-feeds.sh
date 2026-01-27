#!/bin/bash
# Migrate MonitoRSS feeds from macOS Docker to VPS
# This script: starts Docker, exports data, migrates to VPS, stops Docker

set -e  # Exit on error

VPS_HOST="${VPS_HOST:-your-vps-ip}"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/id_rsa_deploy"
MONITORSS_DIR="$HOME/Documents/DEVELOPMENT/discord/bots/news-bots/MonitoRSS"
BACKUP_DIR="$MONITORSS_DIR/mongodb-backup-$(date +%Y%m%d-%H%M%S)"
DB_NAME="rss"

echo "🚀 Starting MonitoRSS feed migration from macOS to VPS"
echo ""

# Step 1: Check Docker
echo "📦 Step 1: Checking Docker..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "✅ Docker is running"

# Step 2: Start MongoDB container
echo ""
echo "📦 Step 2: Starting MongoDB container..."
cd "$MONITORSS_DIR"
docker-compose up -d mongo

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
for i in {1..30}; do
    if docker-compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo "✅ MongoDB is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ MongoDB failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Step 3: Export MongoDB data
echo ""
echo "📤 Step 3: Exporting MongoDB data from macOS..."
mkdir -p "$BACKUP_DIR"

# Export using Docker exec
docker-compose exec -T mongo mongodump \
    --db="$DB_NAME" \
    --out=/data/backup

# Copy backup from container
docker cp "$(docker-compose ps -q mongo):/data/backup" "$BACKUP_DIR"

echo "✅ Export complete: $BACKUP_DIR"

# Step 4: Backup VPS data first (safety!)
echo ""
echo "💾 Step 4: Backing up VPS data first (safety)..."
VPS_BACKUP_DIR="/tmp/vps-mongodb-backup-$(date +%Y%m%d-%H%M%S)"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" \
    "mongodump --uri='mongodb://localhost:27017/$DB_NAME' --out=$VPS_BACKUP_DIR && echo 'VPS backup created: $VPS_BACKUP_DIR'"

# Step 5: Transfer backup to VPS
echo ""
echo "📡 Step 5: Transferring backup to VPS..."
scp -i "$SSH_KEY" -r "$BACKUP_DIR" "$VPS_USER@$VPS_HOST:/tmp/macos-mongodb-backup"

# Step 6: Import to VPS
echo ""
echo "📥 Step 6: Importing data to VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" << 'ENDSSH'
    cd /tmp/macos-mongodb-backup
    BACKUP_DIR=$(ls -td */ | head -1)
    echo "Importing from: $BACKUP_DIR"

    # Import (this will merge with existing data)
    mongorestore --uri="mongodb://localhost:27017/rss" --drop "$BACKUP_DIR$DB_NAME"

    echo "✅ Import complete"

    # Verify
    echo ""
    echo "📊 Verifying import..."
    mongosh --quiet mongodb://localhost:27017/rss --eval "
        print('Feeds: ' + db.feeds.countDocuments());
        print('Subscribers: ' + db.subscribers.countDocuments());
        print('UserFeeds: ' + db.userfeeds.countDocuments());
    "
ENDSSH

# Step 7: Restart MonitoRSS on VPS
echo ""
echo "🔄 Step 7: Restarting MonitoRSS services on VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" \
    "pm2 restart monitorss-monolith && echo '✅ MonitoRSS restarted'"

# Step 8: Stop Docker Compose
echo ""
echo "🛑 Step 8: Stopping Docker Compose on macOS..."
cd "$MONITORSS_DIR"
docker-compose down

echo ""
echo "✅ Migration complete!"
echo ""
echo "Summary:"
echo "  - macOS backup: $BACKUP_DIR"
echo "  - VPS backup: $VPS_BACKUP_DIR"
echo "  - Data imported to VPS MongoDB"
echo "  - MonitoRSS services restarted"
echo ""
echo "Next steps:"
echo "  1. Check MonitoRSS web UI: http://\${VPS_HOST:-your-vps-ip}:8000"
echo "  2. Verify feeds are visible"
echo "  3. Test feed refresh"
