# News Bots Workspace

This workspace contains the MonitoRSS project - a self-hostable RSS aggregation bot for Discord.

## 📁 Structure

```
news-bots/
└── MonitoRSS/           # Cloned from https://github.com/synzen/MonitoRSS
    ├── QUICK_START.md   # ⚡ Get running in 5 minutes
    ├── SETUP_GUIDE.md   # 📖 Detailed setup instructions
    └── ENHANCEMENTS_ANALYSIS.md  # 💡 Enhancement opportunities
```

## 🚀 Quick Start

**Want to get started immediately?** → See [MonitoRSS/QUICK_START.md](./MonitoRSS/QUICK_START.md)

**Need detailed setup?** → See [MonitoRSS/SETUP_GUIDE.md](./MonitoRSS/SETUP_GUIDE.md)

**Want to enhance it?** → See [MonitoRSS/ENHANCEMENTS_ANALYSIS.md](./MonitoRSS/ENHANCEMENTS_ANALYSIS.md)

## 🎯 What is MonitoRSS?

MonitoRSS (formerly Discord.RSS) is a self-hostable RSS aggregation bot that delivers highly-customized news feeds to Discord.

**Key Features:**

- RSS/Atom feed aggregation
- Discord channel and webhook delivery
- Advanced filtering and formatting
- Web-based control panel
- Multi-server support
- Feed health monitoring

**Tech Stack:**

- TypeScript (NestJS backend, React frontend)
- MongoDB + PostgreSQL
- Redis + RabbitMQ
- Docker Compose

## 📋 Setup Requirements

1. **Docker Desktop** (or Docker Engine + Compose)
2. **Discord Bot Application** (from Discord Developer Portal)
3. **5-10 minutes** for initial setup

## 🛠️ Quick Commands

```bash
cd MonitoRSS

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs monolith -f

# Stop services
docker compose down
```

## 📚 Documentation

- **[QUICK_START.md](./MonitoRSS/QUICK_START.md)** - Fast setup guide
- **[SETUP_GUIDE.md](./MonitoRSS/SETUP_GUIDE.md)** - Detailed configuration
- **[ENHANCEMENTS_ANALYSIS.md](./MonitoRSS/ENHANCEMENTS_ANALYSIS.md)** - Improvement ideas
- **[Original README](./MonitoRSS/README.md)** - Official MonitoRSS documentation

## 💡 Enhancement Ideas

See [ENHANCEMENTS_ANALYSIS.md](./MonitoRSS/ENHANCEMENTS_ANALYSIS.md) for comprehensive list, including:

- 🎯 AI-powered content summarization
- 🔌 Multi-platform integrations (Slack, Telegram)
- 📊 Advanced analytics dashboard
- 🔍 Feed health monitoring
- 🎨 UX improvements (mobile, dark mode)
- ⚡ Performance optimizations

## ⚠️ Important Notes

- **DO NOT push to upstream**: This is your fork for custom development
- **Self-hosted = free**: No payment required, runs on your machine
- **Data persistence**: MongoDB and PostgreSQL volumes persist data
- **Resource usage**: ~2-4GB RAM, moderate CPU usage

## 🔗 Resources

- **Original Repo**: <https://github.com/synzen/MonitoRSS>
- **Public Instance**: <https://monitorss.xyz>
- **Discord Dev Portal**: <https://discord.com/developers/applications>
- **Docker Desktop**: <https://www.docker.com/products/docker-desktop/>
