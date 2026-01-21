# Discord Bots Collection

A collection of Discord bots for server automation and functionality.

## 📁 Project Structure

```
discord-bots/
├── README.md                 # This file
├── requirements.txt          # Shared dependencies
├── .env.example             # Environment variables template
├── config/                  # Shared configuration
│   └── settings.yaml
├── utils/                   # Shared utilities
│   ├── __init__.py
│   ├── logger.py
│   └── helpers.py
└── bots/                    # Individual bot projects
    └── (your bots will go here)
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env with your Discord bot tokens
```

### 3. Create a New Bot

Each bot should be in its own subdirectory under `bots/`:

```
bots/
├── moderation-bot/
│   ├── bot.py
│   ├── cogs/
│   └── README.md
├── music-bot/
│   ├── bot.py
│   ├── cogs/
│   └── README.md
└── utility-bot/
    ├── bot.py
    ├── cogs/
    └── README.md
```

## 📚 Common Bot Ideas

- **Moderation Bot** - Auto-mod, warnings, bans, mutes
- **Music Bot** - Play music from YouTube/Spotify
- **Utility Bot** - Server stats, polls, reminders
- **Welcome Bot** - Greet new members, role assignment
- **Gaming Bot** - Game stats, leaderboards, tournaments
- **Custom Commands Bot** - User-defined commands and responses
- **Ticket System Bot** - Support ticket management
- **Event Bot** - Schedule and manage server events

## 🔧 Technologies

- **discord.py** - Main Discord API wrapper
- **python-dotenv** - Environment variable management
- **aiohttp** - Async HTTP requests
- **PyYAML** - Configuration files

## 📖 Documentation

- [Discord.py Documentation](https://discordpy.readthedocs.io/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.py Guide](https://guide.pycord.dev/)

## 🎯 Development Guidelines

1. **One bot per directory** under `bots/`
2. **Use cogs** for organizing bot commands
3. **Environment variables** for sensitive data (tokens, API keys)
4. **Logging** for debugging and monitoring
5. **Error handling** for graceful failures
6. **Documentation** in each bot's README

## 🔐 Security

- Never commit `.env` files with tokens
- Use environment variables for all secrets
- Keep dependencies updated
- Follow Discord's rate limits and TOS

## 📝 License

MIT License - Feel free to use and modify these bots.
