# MonitoRSS PM2 Setup Guide

This guide explains how to run MonitoRSS with PM2 instead of Docker.

## Overview

MonitoRSS is a microservices architecture that requires:

**Infrastructure Services** (installed on VPS):

- MongoDB (database)
- PostgreSQL (database)
- Redis (cache)
- RabbitMQ (message broker)

**Node.js Services** (managed by PM2):

- `monitorss-monolith` - Main API service (port 8000)
- `monitorss-bot-presence` - Bot presence service
- `monitorss-discord-rest-listener` - Discord REST listener
- `monitorss-feed-requests` - Feed requests service
- `monitorss-user-feeds` - User feeds service
- `monitorss-schedule-emitter` - Schedule emitter service

## Prerequisites

- VPS with Ubuntu 22.04 LTS
- Root access
- Node.js 20.x installed
- PM2 installed globally

## Setup Steps

### 1. Install Infrastructure Services

Run the setup script on your VPS:

```bash
cd /root/discord-bots/news-bots/MonitoRSS
chmod +x setup-pm2.sh
sudo ./setup-pm2.sh
```

This will install:

- MongoDB 8.0
- PostgreSQL 17
- Redis 7
- RabbitMQ 3

### 2. Configure Environment Variables

Copy the example env file and configure it:

```bash
cd /root/discord-bots/news-bots/MonitoRSS
cp .env.example .env
nano .env
```

**Important environment variables:**

- `DISCORD_TOKEN` - Your Discord bot token
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/monitorss`)
- `POSTGRES_URI` - PostgreSQL connection string
- `REDIS_URI` - Redis connection string (default: `redis://localhost:6379`)
- `RABBITMQ_URI` - RabbitMQ connection string (default: `amqp://guest:guest@localhost:5672/`)

### 3. Initialize MongoDB Replica Set

MongoDB needs a replica set for MonitoRSS:

```bash
mongo --eval "rs.initiate()"
```

Or if using MongoDB 6+:

```bash
mongosh --eval "rs.initiate()"
```

### 4. Run Database Migrations

Before starting services, run migrations:

```bash
cd /root/discord-bots/news-bots/MonitoRSS

# Feed requests migrations
cd services/feed-requests
npm run migration:up

# User feeds migrations (if needed)
cd ../user-feeds-next
# Check if migrations exist and run them
```

### 5. Build Services

Build all TypeScript services:

```bash
cd /root/discord-bots/news-bots/MonitoRSS

# Build logger package first (dependency)
cd packages/logger
npm install
npm run build
cd ../..

# Build each service
cd services/backend-api && npm install && npm run build && cd ../..
cd services/bot-presence && npm install && npm run build && cd ../..
cd services/discord-rest-listener && npm install && npm run build && cd ../..
cd services/feed-requests && npm install && npm run build && cd ../..
cd services/user-feeds-next && npm install && npm run build && cd ../..
```

### 6. Start Services with PM2

From the root discord-bots directory:

```bash
cd /root/discord-bots
pm2 start ecosystem.config.js
pm2 save
```

This will start all bots including MonitoRSS services.

### 7. Verify Services

Check PM2 status:

```bash
pm2 list
```

Check logs:

```bash
pm2 logs monitorss-monolith
pm2 logs monitorss-bot-presence
pm2 logs monitorss-discord-rest-listener
```

## Service Dependencies

Services must start in this order:

1. **Infrastructure** (MongoDB, PostgreSQL, Redis, RabbitMQ) - Started by systemd
2. **feed-requests** - Depends on PostgreSQL
3. **user-feeds** - Depends on PostgreSQL and RabbitMQ
4. **bot-presence** - Depends on MongoDB and RabbitMQ
5. **discord-rest-listener** - Depends on MongoDB and RabbitMQ
6. **schedule-emitter** - Depends on MongoDB
7. **monolith** - Depends on MongoDB, user-feeds, and feed-requests

PM2 will handle retries, but ensure infrastructure services are running first.

## Troubleshooting

### MongoDB Replica Set Not Initialized

```bash
mongosh --eval "rs.status()"
# If not initialized:
mongosh --eval "rs.initiate()"
```

### Services Failing to Start

1. Check infrastructure services:

   ```bash
   systemctl status mongod
   systemctl status postgresql
   systemctl status redis-server
   systemctl status rabbitmq-server
   ```

2. Check PM2 logs:

   ```bash
   pm2 logs monitorss-monolith --lines 100
   ```

3. Verify environment variables:

   ```bash
   cd /root/discord-bots/news-bots/MonitoRSS
   cat .env | grep -v "^#" | grep -v "^$"
   ```

### Port Conflicts

If port 8000 is already in use:

```bash
# Find what's using port 8000
lsof -i :8000

# Or change the port in ecosystem.config.js
# Update BACKEND_API_PORT environment variable
```

### Build Errors

If services fail to build:

1. Ensure Node.js 20.x is installed:

   ```bash
   node --version  # Should be v20.x.x
   ```

2. Install build dependencies:

   ```bash
   apt-get install -y build-essential python3
   ```

3. Clean and rebuild:

   ```bash
   cd services/backend-api
   rm -rf node_modules dist
   npm install
   npm run build
   ```

## Maintenance

### Restart All MonitoRSS Services

```bash
pm2 restart monitorss-monolith
pm2 restart monitorss-bot-presence
pm2 restart monitorss-discord-rest-listener
pm2 restart monitorss-feed-requests
pm2 restart monitorss-user-feeds
pm2 restart monitorss-schedule-emitter
```

Or restart all:

```bash
pm2 restart all
```

### Update MonitoRSS

```bash
cd /root/discord-bots
git pull

# Rebuild services
cd news-bots/MonitoRSS
# Run build steps from step 5 above

# Restart services
pm2 restart all
pm2 save
```

### View Logs

```bash
# All MonitoRSS logs
pm2 logs | grep monitorss

# Specific service
pm2 logs monitorss-monolith

# Last 100 lines
pm2 logs monitorss-monolith --lines 100
```

## Notes

- Infrastructure services (MongoDB, PostgreSQL, Redis, RabbitMQ) run as systemd services, not PM2
- The `env_file` option in PM2 ecosystem.config.js doesn't work - environment variables are set directly in the config
- Make sure `.env` file is in `/root/discord-bots/news-bots/MonitoRSS/.env`
- Services use relative paths from their service directories
- Memory limits are set based on Docker compose limits

## Differences from Docker

- **No Docker networking**: Services use `localhost` instead of service names
- **No Docker volumes**: Data is stored in standard system directories
- **Systemd services**: Infrastructure runs as systemd services instead of Docker containers
- **Direct file access**: Services access files directly instead of through Docker volumes
