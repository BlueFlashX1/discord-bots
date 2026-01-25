# Discord Bots - Setup & Deployment Guide

## New Bots Created

### 1. VPS Monitoring Bot (`vps-monitoring-bot`)
Monitors VPS resources, bot statuses, and system health.

**Commands:**
- `/status` - Get VPS system status and resource usage
- `/dashboard` - Comprehensive VPS dashboard with all bot statuses
- `/resources` - Detailed resource usage for all bots

**Environment Variables:**
```bash
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
VPS_HOST=root@64.23.179.177
VPS_SSH_KEY=~/.ssh/id_rsa_deploy
```

### 2. Subscription Bot (`subscription-bot`)
Manages subscriptions with automatic reminders and continue/cancel flow.

**Commands:**
- `/subscription add` - Add a new subscription
- `/subscription list` - List all your subscriptions
- `/subscription remove` - Remove a subscription

**Features:**
- Automatic reminders (1 day, 3 days, or 1 week before charge)
- Continue/Cancel flow with confirmation
- 1-day final confirmation before charge
- Automatic rescheduling after confirmation
- Source link for easy cancellation

**Environment Variables:**
```bash
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
```

## Sync Script

Use `sync-bots.sh` to sync bot files between Mac and VPS:

```bash
# Sync all bots
./sync-bots.sh all

# Sync specific bot
./sync-bots.sh subscription-bot
./sync-bots.sh vps-monitoring-bot
```

**What it syncs:**
- All bot files (excluding node_modules, .env, data directories)
- Data directories are synced separately (doesn't delete on VPS)

## Deployment Steps

### 1. Install Dependencies (on VPS)

```bash
cd /root/discord-bots/vps-monitoring-bot
npm install

cd /root/discord-bots/subscription-bot
npm install
```

### 2. Set Up Environment Variables

Create `.env` files on VPS:

**vps-monitoring-bot/.env:**
```bash
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
VPS_HOST=root@64.23.179.177
VPS_SSH_KEY=/root/.ssh/id_rsa_deploy
```

**subscription-bot/.env:**
```bash
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
```

### 3. Deploy Commands

```bash
# On VPS
cd /root/discord-bots/vps-monitoring-bot
node deploy-commands.js

cd /root/discord-bots/subscription-bot
node deploy-commands.js
```

### 4. Start with PM2

```bash
# On VPS
cd /root/discord-bots/vps-monitoring-bot
pm2 start index.js --name vps-monitoring-bot

cd /root/discord-bots/subscription-bot
pm2 start index.js --name subscription-bot

pm2 save
```

## Subscription Bot Workflow

1. **Add Subscription:**
   - `/subscription add` with name, amount, recurring (monthly/yearly), source link, reminder days (1/3/7)

2. **Reminder Flow:**
   - Bot sends reminder X days before charge (based on your setting)
   - Embed asks: Continue or Cancel
   - If Continue: Schedules 1-day confirmation reminder
   - If Cancel: Deactivates subscription, sends cancellation link

3. **1-Day Confirmation:**
   - Bot sends final confirmation 1 day before charge
   - Embed asks: Confirm Continue or Cancel
   - If Confirm: Reschedules for next cycle, updates last charged date
   - If Cancel: Deactivates subscription, sends cancellation link

4. **Automatic Rescheduling:**
   - After confirmation, bot calculates next charge date
   - Schedules next reminder based on your reminder preference
   - Continues cycle automatically

## Data Storage

- **Subscription Bot:** Stores data in `data/subscriptions.json`
- **VPS Monitoring Bot:** No persistent data (reads from VPS in real-time)

## Notes

- Subscription bot requires `uuid` package: `npm install uuid`
- Both bots use shared utilities from `../utils/` (logger, envValidator)
- Sync script preserves VPS data directories (doesn't overwrite)
