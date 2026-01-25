# Discord Bots Collection

Collection of Discord bots built with Node.js and Discord.js v14, using the Discobase framework.

---

## Quick Start

```bash
# Start all bots
./scripts/start-all-bots.sh

# Check status
./scripts/check-bots-status.sh

# Stop all bots
./scripts/stop-all-bots.sh
```

## ⚠️ CRITICAL: VPS Deployment Requirement

**When fixing any bot, you MUST update BOTH:**
1. Local/macOS version (development)
2. VPS version (production at 64.23.179.177)

**See:** [`docs/VPS-DEPLOYMENT-REQUIREMENT.md`](./docs/VPS-DEPLOYMENT-REQUIREMENT.md)

**Quick update for grammar-bot:**
```bash
./scripts/update-grammar-bot-vps.sh
```

**AI assistants frequently forget to update VPS - always check this!**

---

## Bots

### Grammar Bot

AI-powered grammar correction bot with gamification, PvP battles, and shop system.

- **Location:** `grammar-bot/`
- **Features:** Auto grammar checking, stats tracking, achievements, PvP battles, shop
- **Docs:** `grammar-bot/README.md`, `grammar-bot/SLASH-COMMANDS-GUIDE.md`

### Hangman Bot

Word guessing game bot with leaderboards and shop system.

- **Location:** `hangman-bot/`
- **Features:** Hangman games, leaderboards, shop, weekly resets
- **Docs:** `hangman-bot/README.md`

### Spelling Bee Bot

Spelling challenge bot with timed sessions.

- **Location:** `spelling-bee-bot/`
- **Features:** Spelling challenges, timed sessions, leaderboards
- **Docs:** `spelling-bee-bot/README.md`

---

## Directory Structure

```
discord/bots/
├── README.md                    # This file
├── .env.shared                  # Shared environment variables template
├── scripts/                     # Automation scripts
│   ├── start-all-bots.sh       # Start all bots
│   ├── stop-all-bots.sh        # Stop all bots
│   ├── check-bots-status.sh    # Check bot status
│   ├── check_bots_status.py    # Python status checker
│   ├── setup-all-bots.sh       # Setup all bots
│   ├── setup-bots.sh           # Setup helper
│   ├── generate-all-bots.js    # Bot generator
│   └── complete-bots-generator.sh
├── logs/                        # Bot log files
│   ├── grammar-bot.log
│   ├── hangman-bot.log
│   └── spelling-bee-bot.log
├── docs/                        # Documentation
│   ├── QUICK_START.md
│   ├── SETUP-GUIDE.md
│   ├── CREDENTIALS-GUIDE.md
│   └── ...
├── grammar-bot/                  # Grammar Bot
├── hangman-bot/                 # Hangman Bot
├── spelling-bee-bot/            # Spelling Bee Bot
└── discord-bots-python-backup-20251225/  # Python backup
```

---

## Scripts

All automation scripts are in the `scripts/` directory:

| Script | Purpose |
|--------|---------|
| `start-all-bots.sh` | Start all bots in background |
| `stop-all-bots.sh` | Stop all running bots |
| `check-bots-status.sh` | Check status of all bots |
| `setup-all-bots.sh` | Setup and install all bots |
| `check_bots_status.py` | Python status checker (alternative) |

**Usage:**

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./scripts/start-all-bots.sh
./scripts/check-bots-status.sh
```

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **Quick Start:** `docs/QUICK_START.md`
- **Setup Guide:** `docs/SETUP-GUIDE.md`
- **Credentials:** `docs/CREDENTIALS-GUIDE.md`
- **Automation:** `docs/AUTOMATION-README.md`
- **Migration:** `docs/MIGRATION_SETUP.md`

Each bot also has its own documentation:

- `grammar-bot/README.md`
- `hangman-bot/README.md`
- `spelling-bee-bot/README.md`

---

## Environment Setup

1. **Copy shared environment template:**

   ```bash
   cp .env.shared .env
   ```

2. **Configure each bot:**
   - Each bot has its own `.env` file
   - See `docs/CREDENTIALS-GUIDE.md` for details

3. **Install dependencies:**

   ```bash
   ./scripts/setup-all-bots.sh
   ```

---

## Logs

Bot logs are stored in the `logs/` directory:

```bash
# View grammar bot logs
tail -f logs/grammar-bot.log

# View all logs
tail -f logs/*.log
```

---

## Development

### Adding a New Bot

1. Create bot directory: `mkdir new-bot`
2. Initialize: `cd new-bot && npm init`
3. Install dependencies: `npm install discord.js dotenv`
4. Follow Discobase structure (see `docs/DISCOBASE-QUICK-START.md`)
5. Add to `scripts/start-all-bots.sh`

### Updating Commands

For each bot:

```bash
cd grammar-bot
npm run deploy
```

See `grammar-bot/SLASH-COMMANDS-GUIDE.md` for detailed instructions.

---

## Backup

Python version backup is stored in:

- `discord-bots-python-backup-20251225/`

This contains the original Python implementation for reference.

---

## Troubleshooting

### Bots Not Starting

1. Check `.env` files have valid tokens
2. Verify Node.js version: `node --version` (should be v18+)
3. Check logs: `tail -f logs/*.log`
4. Verify bot permissions in Discord Developer Portal

### Commands Not Appearing

1. Deploy commands: `cd bot-name && npm run deploy`
2. Wait up to 1 hour for global commands
3. Restart Discord app to refresh command cache
4. See `grammar-bot/SLASH-COMMANDS-GUIDE.md` for details

### Database Issues

- Grammar Bot uses JSON storage by default (no MongoDB required)
- MongoDB optional: Set `MONGODB_URI` in `.env` if desired
- See `grammar-bot/MONGODB-FIX-COMPLETE.md` for MongoDB setup

---

## Status

All bots are operational and using:

- **Framework:** Discord.js v14
- **Structure:** Discobase-compatible
- **Storage:** JSON files (MongoDB optional)
- **Node.js:** v18+ recommended

---

**Last Updated:** 2025-01-21  
**Location:** `/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots`

## 🚀 Auto-Deployment (✅ WORKING!)

This repository is configured with GitHub Actions for automatic deployment to DigitalOcean VPS.

- **Status:** ✅ Fully operational
- **Workflow:** `.github/workflows/deploy.yml`
- **VPS IP:** `64.23.179.177`
- **Setup Guides:** See `docs/` folder

**How it works:**
1. Make changes locally
2. `git push` to `main` branch
3. GitHub Actions automatically:
   - Connects to VPS via SSH
   - Pulls latest code
   - Updates dependencies
   - Restarts all bots with PM2

**Quick Start:** See `docs/WHAT_NEXT.md` for daily workflow and common tasks.
