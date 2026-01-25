# MonitoRSS Docker to PM2 Migration Summary

## What Was Changed

### 1. Updated `ecosystem.config.js`

Added 6 MonitoRSS services to PM2 ecosystem:

- **monitorss-monolith** - Main API service (port 8000)
- **monitorss-bot-presence** - Bot presence service
- **monitorss-discord-rest-listener** - Discord REST listener
- **monitorss-feed-requests** - Feed requests service
- **monitorss-user-feeds** - User feeds service
- **monitorss-schedule-emitter** - Schedule emitter service

### 2. Created Setup Script

**`news-bots/MonitoRSS/setup-pm2.sh`** - Installs infrastructure services:

- MongoDB 8.0
- PostgreSQL 17
- Redis 7
- RabbitMQ 3
- Builds all TypeScript services

### 3. Updated Environment File Scripts

- **`scripts/copy-env-to-vps.sh`** - Now includes MonitoRSS `.env` file
- **`scripts/verify-env-remote.sh`** - Verifies MonitoRSS `.env` file

### 4. Created Documentation

- **`docs/MONITORSS_PM2_SETUP.md`** - Complete setup guide

## Key Differences from Docker

| Aspect | Docker | PM2 |
|--------|--------|-----|
| **Infrastructure** | Docker containers | Systemd services |
| **Networking** | Docker network (service names) | localhost |
| **Data Storage** | Docker volumes | System directories |
| **Process Management** | Docker Compose | PM2 |
| **Environment** | `.env.prod` file | `.env` file (loaded by dotenv) |

## Setup Process on VPS

1. **Install infrastructure** (one-time):

   ```bash
   cd /root/discord-bots/news-bots/MonitoRSS
   sudo ./setup-pm2.sh
   ```

2. **Configure .env**:

   ```bash
   cd /root/discord-bots/news-bots/MonitoRSS
   cp .env.example .env
   nano .env  # Configure your settings
   ```

3. **Initialize MongoDB replica set**:

   ```bash
   mongosh --eval "rs.initiate()"
   ```

4. **Run migrations**:

   ```bash
   cd /root/discord-bots/news-bots/MonitoRSS/services/feed-requests
   npm run migration:up
   ```

5. **Start with PM2**:

   ```bash
   cd /root/discord-bots
   pm2 start ecosystem.config.js
   pm2 save
   ```

## Service Dependencies

Services must start in order:

1. Infrastructure (MongoDB, PostgreSQL, Redis, RabbitMQ) - systemd
2. feed-requests → PostgreSQL
3. user-feeds → PostgreSQL + RabbitMQ
4. bot-presence → MongoDB + RabbitMQ
5. discord-rest-listener → MongoDB + RabbitMQ
6. schedule-emitter → MongoDB
7. monolith → MongoDB + user-feeds + feed-requests

PM2 handles retries, but ensure infrastructure is running first.

## Environment Variables

The `.env` file must be at:

```
/root/discord-bots/news-bots/MonitoRSS/.env
```

Services use `dotenv` to load it automatically. Key variables:

- `DISCORD_TOKEN` - Discord bot token
- `MONGODB_URI` - MongoDB connection (default: `mongodb://localhost:27017/monitorss`)
- `POSTGRES_URI` - PostgreSQL connection
- `REDIS_URI` - Redis connection (default: `redis://localhost:6379`)
- `RABBITMQ_URI` - RabbitMQ connection (default: `amqp://guest:guest@localhost:5672/`)

## Next Steps

1. Copy MonitoRSS `.env` file to VPS (if you have one locally)
2. Run setup script on VPS
3. Configure `.env` file
4. Initialize MongoDB replica set
5. Run migrations
6. Start services with PM2

See `docs/MONITORSS_PM2_SETUP.md` for detailed instructions.
