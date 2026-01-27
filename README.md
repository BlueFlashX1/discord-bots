# Discord Bots Collection

Collection of production Discord bots built with Node.js and Python, deployed to DigitalOcean VPS. All bots were developed with **Cursor AI assistance**.

## 🚀 Hosting & Deployment

All bots run 24/7 on a **DigitalOcean VPS** using **PM2** for process management. Deployment is fully automated via GitHub Actions:

1. **Push to `main` branch** → GitHub Actions automatically triggers
2. **SSH to VPS** → Pulls latest code from repository
3. **Updates dependencies** → Installs/updates npm packages for each bot
4. **Restarts bots** → PM2 reloads all processes from `ecosystem.config.js`

**No manual commands needed** - bots stay running automatically and update on every push. PM2 handles auto-restart on crashes and manages all processes.

See `.github/workflows/deploy.yml` for deployment configuration.

## 🤖 Bots

### Grammar Bot
**Why:** AI-powered grammar checking to help users improve writing. Uses OpenAI GPT-4o-mini for real-time grammar detection with gamification (points, achievements, PvP battles).

### Todoist Bot
**Why:** Integrate Todoist task management into Discord. Syncs tasks, sends daily overviews, and allows task creation/completion directly from Discord.

### Reminder Bot
**Why:** Never miss deadlines. Set flexible reminders (one-time or recurring) that send notifications to channels or DMs.

### Starboard Bot
**Why:** Automatically save starred messages to a forum channel with intelligent auto-tagging and title standardization for better organization.

### GitHub Bot
**Why:** Track GitHub repositories, monitor releases, and view contribution statistics without leaving Discord.

### Exercism Bot
**Why:** Daily coding practice. Delivers Exercism problems to Discord, tracks submissions, and manages programming language tracks.

### Coding Practice Bot
**Why:** Daily coding problems from LeetCode/Codewars. Automatically posts problems, validates solutions, and tracks progress with streaks.

### Command Control Bot
**Why:** Remote server management. Execute shell commands via Discord buttons with real-time output streaming and process management.

### Reddit Filter Bot
**Why:** Monitor Reddit subreddits and post filtered content based on keywords to Discord channels.

### YouTube Monitor Bot
**Why:** Track YouTube channels and automatically post new videos to Discord with optional notifications.

### MonitoRSS (News Bots)
**Why:** Deliver customized RSS/news feeds to Discord channels. Monitors multiple feeds and posts updates automatically.

### Subscription Bot
**Why:** Manage Discord server subscriptions and member access control.
**Note:** Local development only - not deployed to VPS.

## 🛠️ Tech Stack

- **Node.js** (Discord.js v14) - Most bots
- **Python** (discord.py) - Some bots
- **PM2** - Process management on VPS
- **MongoDB** - Data storage (where needed)
- **GitHub Actions** - Automated deployment
- **DigitalOcean VPS** - Production hosting

## 📁 Structure

```
discord-bots/
├── README.md              # This file
├── ecosystem.config.js    # PM2 configuration
├── .github/workflows/     # GitHub Actions deployment
├── [bot-name]/            # Individual bot directories
└── _archive/              # Archived/unused files
```

## 🔧 Development

Built with **Cursor AI** assistance for rapid development and iteration. Each bot follows modular architecture with clear separation of concerns.

## 🔐 Environment Variables

**All tokens and secrets are stored in `.env` files on the VPS (never committed to git).**

Each bot loads environment variables from its own `.env` file via PM2's `env_file` option. See `ENV_SETUP.md` for detailed setup instructions.

**After security incident:** Discord reset exposed tokens. Get new tokens from Discord Developer Portal and update `.env` files on VPS.

## 📝 Notes

- All bots are production-ready and actively serving users
- Bots auto-restart on crash via PM2
- Logs are centralized in `/root/discord-bots/logs/`
- Environment variables managed per-bot via `.env` files (never tracked in git)
