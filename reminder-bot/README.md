# Reminder Bot

A Discord bot for setting and managing reminders with timezone-aware scheduling.

## Features

- ✅ Flexible time input: `30m`, `2h`, `9pm`, `tomorrow 9am`
- ✅ Recurring reminders: daily, weekly, monthly patterns
- ✅ Timezone-aware (MST/America/Denver)
- ✅ Autocomplete cancel - select from dropdown, no UUID copy-paste
- ✅ Discord timestamp formatting (shows in user's local timezone)

## Commands

- `/remind <time> <message> [recurring]` - Set a reminder
- `/reminders` - List all your reminders
- `/cancel <reminder>` - Cancel a reminder (autocomplete dropdown)
- `/note <message>` - Add notes to a reminder
- `/setchannel <channel>` - Set default reminder channel

## Recent Fixes (2026-02-07)

See [FIXES.md](./FIXES.md) for complete documentation of timezone bug fixes.

**Summary:**
- Fixed missing `pytz` import causing parsing failures
- Fixed timezone-aware vs naive datetime comparisons
- Corrected timezone from PST to MST (America/Denver)
- Added UTC conversion for proper storage
- Improved cancel UX with autocomplete dropdown

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your Discord bot token

# Run locally
python bot.py
```

## Deployment (VPS)

The bot is deployed on VPS via PM2:

```bash
# Sync changes
rsync -avz --exclude='node_modules' --exclude='.env*' --exclude='logs' \
  reminder-bot/ root@64.23.179.177:/root/discord-bots/reminder-bot/

# Restart
ssh root@64.23.179.177 "pm2 restart reminder-bot"

# Check logs
ssh root@64.23.179.177 "pm2 logs reminder-bot --lines 50"
```

## Configuration

**Timezone:** Hardcoded to `America/Denver` (MST/MDT) in `commands/remind.py`

Future improvement: Make timezone configurable per user or server.

## Architecture

```
reminder-bot/
├── bot.py              # Main bot entry point
├── commands/           # Slash command handlers
│   ├── remind.py       # Create reminders
│   ├── cancel.py       # Cancel with autocomplete
│   ├── list.py         # List reminders
│   └── ...
├── services/
│   └── reminder_service.py  # Background checker (UTC-based)
├── utils/
│   ├── data_manager.py      # JSON storage
│   └── embeds.py            # Discord embed formatting
└── data/
    └── reminders.json       # Reminder storage
```

## How Times Work

1. **Input:** User types "9pm" (local time)
2. **Parsing:** Converted to 21:00 MST using `pytz.timezone("America/Denver")`
3. **Storage:** Converted to UTC (04:00 next day) for reliable checking
4. **Checker:** `reminder_service.py` compares UTC times every 30 seconds
5. **Display:** Discord timestamps (`<t:unix:F>`) auto-convert to viewer timezone

## Troubleshooting

**"Invalid time format" error:**
- Ensure `pytz` is installed: `pip install pytz`
- Check logs for import errors

**Times showing 1 hour off:**
- Verify timezone in `commands/remind.py` matches your location
- For Arizona (no DST): Use `America/Phoenix`
- For Mountain Time (with DST): Use `America/Denver`

**Old reminders causing errors:**
- Clean up old naive datetime entries from `data/reminders.json`
- Use `/cancel` to remove problematic reminders

## License

MIT
