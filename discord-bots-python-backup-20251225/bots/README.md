# Individual Discord Bots

This directory contains individual bot projects. Each bot should be in its own subdirectory.

## Bot Structure Template

```
bot-name/
├── bot.py                # Main bot file
├── README.md            # Bot-specific documentation
├── requirements.txt     # Bot-specific dependencies (optional)
├── config.yaml          # Bot configuration
├── cogs/                # Command groups
│   ├── __init__.py
│   ├── commands.py
│   └── events.py
└── data/                # Bot data (databases, cache, etc.)
```

## Creating a New Bot

1. Create a new directory for your bot
2. Copy the template structure
3. Add your bot token to `.env`
4. Implement your bot functionality
5. Document in the bot's README

## Example Bots to Create

- **utility-bot** - General utility commands (info, polls, reminders)
- **moderation-bot** - Auto-mod, warnings, kicks, bans
- **music-bot** - Play music from various sources
- **welcome-bot** - Welcome messages and role assignment
- **gaming-bot** - Game-specific features and stats
- **custom-commands-bot** - User-defined commands
