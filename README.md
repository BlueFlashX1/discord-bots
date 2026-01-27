# Discord Bots Collection

A personal collection of Discord bots built with Node.js and Python. This is a personal project for my own Discord server to keep me informed and help me practice coding skills through automated tools.

All bots were developed with **Cursor AI assistance**.

## 🎯 Project Purpose

This is a **personal project** for my own Discord server. I created these bots to:
- **Stay informed** - Automated notifications and monitoring (YouTube, Reddit, GitHub, RSS feeds)
- **Practice coding** - Daily coding challenges and grammar practice to keep skills sharp
- **Automate tasks** - Task management, reminders, and server utilities
- **Learn and experiment** - Building bots helps me explore different APIs and technologies

Each bot serves a specific purpose in my workflow, helping me stay organized and continuously improve my skills.

## 🤖 Bots

### Grammar Bot
**Purpose:** AI-powered grammar checking to help improve writing skills. Uses OpenAI GPT-4o-mini for real-time grammar detection with gamification (points, achievements, PvP battles).

### Todoist Bot
**Purpose:** Integrate Todoist task management into Discord. Syncs tasks, sends daily overviews, and allows task creation/completion directly from Discord.

### Reminder Bot
**Purpose:** Never miss deadlines. Set flexible reminders (one-time or recurring) that send notifications to channels or DMs.

### Starboard Bot
**Purpose:** Automatically save starred messages to a forum channel with intelligent auto-tagging and title standardization for better organization.

### GitHub Bot
**Purpose:** Track GitHub repositories, monitor releases, and view contribution statistics without leaving Discord.

### Exercism Bot
**Purpose:** Daily coding practice. Delivers Exercism problems to Discord, tracks submissions, and manages programming language tracks.

### Coding Practice Bot
**Purpose:** Daily coding problems from LeetCode/Codewars. Automatically posts problems, validates solutions, and tracks progress with streaks.

### Command Control Bot
**Purpose:** Remote server management. Execute shell commands via Discord buttons with real-time output streaming and process management.

### Reddit Filter Bot
**Purpose:** Monitor Reddit subreddits and post filtered content based on keywords to Discord channels.

### YouTube Monitor Bot
**Purpose:** Track YouTube channels and automatically post new videos to Discord with optional notifications.

### MonitoRSS (News Bots)
**Purpose:** Deliver customized RSS/news feeds to Discord channels. Monitors multiple feeds and posts updates automatically.

### Subscription Bot
**Purpose:** Manage Discord server subscriptions and member access control.  
**Note:** Local development only - not deployed.

## 🛠️ Tech Stack

- **Node.js** (Discord.js v14) - Most bots
- **Python** (discord.py) - Some bots
- **MongoDB** - Data storage (where needed)
- **GitHub Actions** - Automated deployment (optional)
- **DigitalOcean VPS** - Production hosting (optional)

## 📁 Structure

```
discord-bots/
├── README.md              # This file
├── ecosystem.config.js    # PM2 configuration (optional, for process management)
├── .github/workflows/     # GitHub Actions deployment (optional)
├── [bot-name]/            # Individual bot directories
│   ├── README.md          # Bot-specific documentation
│   ├── package.json      # Node.js dependencies (for Node.js bots)
│   ├── requirements.txt   # Python dependencies (for Python bots)
│   ├── index.js / bot.py # Main entry point
│   └── .env.example      # Environment variable template
└── _archive/              # Archived/unused files
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+) for Node.js bots
- **Python** (3.11+) for Python bots
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BlueFlashX1/discord-bots.git
   cd discord-bots
   ```

2. **Choose a bot** and navigate to its directory:
   ```bash
   cd coding-practice-bot  # Example
   ```

3. **Install dependencies:**
   
   **For Node.js bots:**
   ```bash
   npm install
   ```
   
   **For Python bots:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord bot token and other required variables
   ```

5. **Start the bot:**
   
   **For Node.js bots:**
   ```bash
   npm start
   # Or: node index.js
   ```
   
   **For Python bots:**
   ```bash
   python bot.py
   ```

### Process Management (Optional)

If you want to run bots in production, you can use:
- **PM2** - Process manager (see `ecosystem.config.js` for configuration)
- **systemd** - Linux service manager
- **Docker** - Containerization
- **Manual** - Just run `npm start` or `python bot.py` directly

## 🔧 Development

Built with **Cursor AI** assistance for rapid development and iteration. Each bot follows modular architecture with clear separation of concerns.

## 🔐 Environment Variables

All tokens and secrets are stored in `.env` files (never committed to git).

Each bot has a `.env.example` file showing required environment variables. Copy it to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual tokens
```

**Required for all bots:**
- `DISCORD_TOKEN` - Your Discord bot token

**Additional variables** may be required depending on the bot (see each bot's README.md).

## 📝 Notes

- All bots are production-ready and actively serving users
- Each bot is self-contained in its own directory
- Environment variables managed per-bot via `.env` files (never tracked in git)
- See individual bot README.md files for specific setup instructions

## 📚 Documentation

Each bot has its own `README.md` with:
- Feature overview
- Setup instructions
- Environment variable requirements
- Usage examples

## ⚠️ Disclaimer

This is a **personal project** for my own use. While the code is available publicly, it's primarily maintained for my own needs. Feel free to use it as inspiration or fork it for your own projects!
