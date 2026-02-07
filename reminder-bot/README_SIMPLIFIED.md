# Simple Reminder Bot

A simplified Discord reminder bot with one-time and basic recurring reminders.

## Features

✅ **Simple Time Parsing**
- `30m` - 30 minutes from now
- `2h` - 2 hours from now
- `1d` - 1 day from now
- `tomorrow 9am` - Tomorrow at 9 AM
- `2024-01-15 14:30` - Specific date and time

✅ **Enhanced Recurring Reminders**

**Daily:**
- `daily` - Every day at the specified time
- `daily at 9am` - Every day at 9 AM

**Weekly (Multi-select days):**
- `weekly` - Every week at the specified time
- `weekly on monday` - Every Monday
- `weekly on monday,wednesday,friday` - Mon/Wed/Fri
- `weekly on tuesday,thursday at 2pm` - Tue/Thu at 2 PM
- `weekly on saturday,sunday at 10am` - Weekends at 10 AM

**Monthly (Flexible patterns):**
- `monthly` - Every month on the same day
- `monthly on 15th at 10am` - Every 15th at 10 AM
- `monthly on 1st at 9am` - Every 1st at 9 AM
- `monthly on first monday at 2pm` - First Monday of each month
- `monthly on second tuesday at 3pm` - Second Tuesday of each month
- `monthly on third wednesday at 4pm` - Third Wednesday of each month
- `monthly on last friday at 5pm` - Last Friday of each month
- `monthly on last sunday at 6pm` - Last Sunday of each month

✅ **Commands**
- `!remind "message" time [recurring]` - Set reminder
- `/remind` - Slash command version
- `!list` - List your reminders
- `!edit_remind <id> <new_time>` - Edit reminder
- `!cancel_remind <id>` - Cancel reminder
- `!time_help` - Show time format help

## What Was Removed

❌ **Complex Features Removed:**
- MROE learning system
- Task classification and smart suggestions
- Natural language processing
- Advanced recurring patterns (business_days, last_friday, etc.)
- JSON configuration requirements
- User preference tracking
- Skip logic for holidays/weekends

## File Structure

```
discord/bots/reminder-bot/
├── bot.py                    # Simplified bot main file
├── commands/
│   ├── remind.py             # Simple reminder command
│   ├── edit_reminders.py     # Edit/cancel commands
│   ├── list.py              # List reminders
│   └── cancel.py            # Cancel command
├── services/
│   └── reminder_service.py  # Basic reminder service
├── utils/
│   ├── data_manager.py      # Simple JSON storage
│   └── embeds.py           # Discord embeds
└── data/                   # JSON data files
    ├── reminders.json
    └── config.json
```

## Usage Examples

```
!remind "Take medicine" daily at 8am
!remind "Gym workout" weekly on monday,wednesday,friday at 6pm
!remind "Team meeting" weekly on monday at 2pm
!remind "Study session" weekly on tuesday,thursday at 3pm
!remind "Weekend run" weekly on saturday,sunday at 8am
!remind "Pay rent" monthly on 1st at 9am
!remind "Book club" monthly on first thursday at 7pm
!remind "Project review" monthly on last friday at 4pm
!remind "Call doctor" tomorrow 3pm
!remind "Quick task" 30m
```

## Setup

1. Install dependencies: `pip install python-dotenv discord.py python-dateutil`
2. Set up `.env` with `DISCORD_TOKEN` and `CLIENT_ID`
3. Run: `python bot.py`

The bot now focuses on core functionality without unnecessary complexity!