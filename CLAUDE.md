# discord/bots — Multi-Bot Management & Deployment

This directory contains 18+ Discord bots (Node.js/Python) managed as a monorepo with unified PM2 deployment, GitHub Actions CI/CD, and rsync-based VPS sync.

## 📁 Structure

```
discord/bots/
├── moltbot/                    # Flagship AI assistant (Node ESM, Anthropic SDK)
├── shadow-away-bot/            # Owner-only response responder (Node 14, discord.js)
├── coding-practice-bot/        # Code challenge integrations
├── grammar-bot/                # Grammar & writing assistance
├── subscription-tracker/       # Discord subscription management
├── reddit-filter-bot/          # Reddit content filtering
├── youtube-monitor-bot/        # YouTube channel monitoring
├── todoist-bot/                # Todoist task integration
├── github-bot/                 # GitHub webhook listener (Python)
├── reminder-bot/               # Scheduled reminders (Python)
├── starboard-bot/              # Message star reactions (Python)
├── exercism-bot/               # Exercism coding tracks (Python)
├── news-bots/MonitoRSS/        # RSS feed aggregator (complex multi-service)
│   ├── services/backend-api/
│   ├── services/bot-presence/
│   ├── services/discord-rest-listener/
│   ├── services/feed-requests/
│   ├── services/user-feeds-next/
│   └── scripts/
├── command-control-bot/        # Local testing only
├── subscription-bot/           # Local testing only
└── _archive/                   # Deprecated bots (Python originals, removed bots)

Root files:
├── ecosystem.config.example.js # PM2 config (source of truth for all bots)
├── ecosystem.config.js         # VPS-specific (git-ignored, preserved on deploy)
├── package.json                # Root workspace (tslib only)
├── project.json                # Nx library config
├── tsconfig.json               # TypeScript base
├── eslint.config.mjs           # ESLint rules (extends parent)
├── .github/workflows/deploy.yml # GitHub Actions CI/CD
├── scripts/                    # Deploy/manage utilities
├── DEPLOYMENT.md               # MoltBot-specific setup
├── DEPLOYMENT-README.md        # General deployment system
├── TROUBLESHOOTING-BOTS.md     # PM2/VPS diagnostics
└── README.md                   # Library stub
```

## 🤖 Bot Inventory

| Bot | Type | Tech Stack | Purpose |
|-----|------|-----------|---------|
| **moltbot** | Node ESM | discord.js 14, @anthropic-ai/sdk, dotenv | Secure AI assistant with sandbox execution |
| **shadow-away-bot** | Node CJS | discord.js 14, openai, dotenv | Owner-only away message responder with return digest |
| **grammar-bot** | Node CJS | discord.js | Grammar checking & corrections |
| **coding-practice-bot** | Node CJS | discord.js | Code challenge delivery & evaluation |
| **subscription-tracker** | Node CJS | discord.js | Subscription/role management |
| **reddit-filter-bot** | Node CJS | discord.js | Reddit content filtering & posting |
| **youtube-monitor-bot** | Node CJS | discord.js | YouTube channel monitoring & alerts |
| **todoist-bot** | Node CJS | discord.js | Todoist task integration |
| **github-bot** | Python 3 | discord.py | GitHub webhooks & notifications |
| **reminder-bot** | Python 3 | discord.py | Scheduled message reminders |
| **starboard-bot** | Python 3 | discord.py | Reaction-based message starring |
| **exercism-bot** | Python 3 | discord.py | Exercism track management |
| **monitorss-*** (8 services) | Node/TypeScript | Complex: RabbitMQ, Redis, Postgres, TypeScript | RSS feed aggregation platform (MonitoRSS ecosystem) |
| **command-control-bot** | Node | discord.js | Local dev/testing only (not VPS deployed) |
| **subscription-bot** | Node | discord.js | Local dev/testing only (not VPS deployed) |

## 🚀 Deployment System

### Ecosystem Configuration
- **Source of truth**: `ecosystem.config.example.js` (18 apps, all supported bots listed)
- **VPS config**: `ecosystem.config.js` (git-ignored, preserved on deploy)
- **Merge strategy**: On deploy, missing apps from example are **added** to VPS config; existing VPS customizations are **kept**

### PM2 Management (VPS)
All bots run under PM2 with unified config:
- **Memory limits**: 256M–1G per bot (node_modules, cache)
- **Restart policy**: Autorestart enabled for all; no watch mode
- **Logging**: Centralized in `/root/discord-bots/logs/` (per-bot error & out files)
- **Startup**: `pm2 startup` + `pm2 save` ensures persistence on VPS reboot

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
Triggers on: push to `main` + manual `workflow_dispatch`

**Steps**:
1. Checkout code from main branch
2. SSH to VPS as root
3. Backup `ecosystem.config.js` (untracked, preserves VPS-only settings)
4. `git fetch origin main && git reset --hard` (pulls latest code)
5. Restore `ecosystem.config.js` or create from example if first deploy
6. **Merge ecosystem** (`scripts/merge-ecosystem.js`): adds missing apps from example
7. For each Node bot: `npm install --production`
8. Clear Python `__pycache__` & `.pyc` files
9. `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`
10. Log success/failure to `/var/log/discord-bots/deploy.log` (VPS-only)

**Secrets**: VPS_HOST, VPS_USERNAME, VPS_SSH_KEY, VPS_PORT (optional)

### Local Deployment Scripts (`scripts/`)
Rsync-based backup sync (for development):

```bash
scripts/deploy/deploy.sh              # Deploy one bot
scripts/deploy/deploy-vps.sh          # Deploy all via GitHub Actions trigger
scripts/deploy/update-vps-all.sh      # Full update for all bots
scripts/manage/sync-bots.sh           # Rsync sync for dev
scripts/manage/start-all-bots.sh      # Start all bots (local)
scripts/manage/stop-all-bots.sh       # Stop all bots (local)
scripts/verify/check-bot-resources.sh # Memory/CPU usage
scripts/verify/check-bots-status.sh   # PM2 status via SSH
```

**rsync exclusions**:
- `node_modules/` (reinstalled on VPS)
- `.env*` files (security; VPS has its own)
- `logs/`, `*.log`
- `.DS_Store`, `.pm2/`, `_archive/`

## 🔧 Development Workflow

### Adding a New Bot
1. Create bot directory with `package.json` or `bot.py`
2. Add entry to `ecosystem.config.example.js` (following existing pattern)
3. Push to main; GitHub Actions will deploy automatically
4. On VPS: `pm2 list` to verify it's running

### Working on a Bot
1. **Local development**: `npm run dev` or `python bot.py` in bot directory
2. **Test on VPS before committing**:
   ```bash
   git push origin <branch>  # Feature branch
   ssh root@64.23.179.177 && cd /root/discord-bots/<bot>
   git pull origin <branch> && npm install && pm2 restart <bot-name>
   ```
3. **Merge to main**: Triggers GitHub Actions deploy to VPS production

### Environment Variables
- **Local**: Each bot has `.env.example`; copy & fill before running
- **VPS**: `.env` files are **not synced** (git-ignored); set manually on VPS or via secrets
- **CI/CD**: Passes VPS_HOST, VPS_USERNAME, VPS_SSH_KEY through GitHub Secrets

## 📋 Key Files

| File | Purpose |
|------|---------|
| `ecosystem.config.example.js` | PM2 config template (all 18 apps); source of truth |
| `scripts/merge-ecosystem.js` | Merges example apps into VPS config on deploy |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD (push main → VPS deploy) |
| `DEPLOYMENT.md` | MoltBot-specific deployment guide |
| `DEPLOYMENT-README.md` | General rsync-based deployment docs |
| `TROUBLESHOOTING-BOTS.md` | PM2 diagnostics & debugging guide |
| `moltbot/package.json` | Example (Node 22, ESM, Anthropic SDK) |
| `shadow-away-bot/package.json` | Example (Node CJS, discord.js 14, OpenAI) |
| `tsconfig.json` / `eslint.config.mjs` | Nx workspace linting |

## 🛠 Common Operations

### Check VPS Bot Status
```bash
ssh root@64.23.179.177
pm2 list                              # All apps
pm2 logs <bot-name>                   # Follow logs
pm2 logs <bot-name> --err --lines 50  # Recent errors
```

### Restart a Bot on VPS
```bash
pm2 restart <bot-name>
pm2 save  # Persist
```

### View Deployment Log (VPS)
```bash
tail -f /var/log/discord-bots/deploy.log
```

### Manually Deploy (if GitHub Actions fails)
```bash
# On VPS (as root)
cd /root/discord-bots
git fetch origin main && git reset --hard origin/main
npm install --production  # For Node bots
pm2 restart all && pm2 save
```

### Fix MonitoRSS Stack (complex subsystem)
Requires RabbitMQ, Redis, Postgres running:
```bash
pm2 logs monitorss-monolith --err     # Check backend-api
pm2 logs monitorss-bot-presence       # Check bot presence
pm2 restart monitorss-monolith && pm2 save
```

## 🔐 Security Notes

- **Secrets**: .env files never committed; each bot has `.env.example`
- **VPS Config**: `ecosystem.config.js` is git-ignored; deploy preserves VPS-only customizations
- **SSH Keys**: Passwordless SSH required for GitHub Actions (VPS_SSH_KEY secret)
- **Logs**: On VPS only (`/var/log/`, `/root/discord-bots/logs/`); never in repo

## 📊 Tech Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Orchestration** | PM2 (18 apps) + GitHub Actions (CI/CD) |
| **Code Sync** | rsync (local dev), git (GitHub), GitHub Actions (VPS) |
| **Node Bots** | discord.js 14, OpenAI, Anthropic AI, dotenv |
| **Python Bots** | discord.py, standard library |
| **Complex Subsystem** | MonitoRSS (RabbitMQ, Redis, Postgres, TypeScript/Node) |
| **Build/Lint** | Nx, TypeScript, ESLint |
| **Runtime** | Node 22+, Python 3, PM2 4.x |

## 📚 Documentation Links

- `DEPLOYMENT.md` — MoltBot setup walkthrough
- `DEPLOYMENT-README.md` — Rsync sync & deploy scripts
- `TROUBLESHOOTING-BOTS.md` — PM2 diagnostics, offline bot recovery
- `ecosystem.config.example.js` — Annotated config (all 18 apps)
- Individual bot README.md files — Bot-specific usage

## ⚠️ Known Issues & Mitigations

| Issue | Cause | Fix |
|-------|-------|-----|
| Bot offline after VPS reboot | PM2 not restarting on boot | SSH: `pm2 startup && pm2 save` |
| Deploy fails with npm errors | Node version mismatch | Check VPS: `node --version` (should be 22+) |
| MonitoRSS not working | RabbitMQ/Redis/Postgres down | SSH: `systemctl status rabbitmq-server`, etc. |
| `.env` not syncing | Intentional (git-ignored) | Manually set on VPS or use GitHub Secrets |
| Minimal ecosystem on VPS | Deploy merge logic new (2026-02-05) | Next deploy adds missing apps automatically |

---

**Last updated**: 2026-03-26
**Maintainer**: Matthew Thompson
**VPS**: DigitalOcean (64.23.179.177, CentOS/Ubuntu)
