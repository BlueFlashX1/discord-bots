# Reminder Discord Bot

A comprehensive reminder and notification bot that helps you never miss important deadlines or tasks.

## Features

- ⏰ **Flexible Reminders** - Set reminders with various time formats
- 🔄 **Recurring Reminders** - Daily, weekly, monthly, or yearly reminders
- 📢 **Channel or DM** - Send reminders to channels or direct messages
- 📋 **Reminder Management** - List and cancel your reminders
- ⚡ **Real-time Checking** - Checks for due reminders every 30 seconds

## Setup

### 1. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing
```

### 3. Deploy Commands

```bash
python deploy-commands.py
```

### 4. Start Bot

```bash
python bot.py
```

## Commands

### Setting Reminders

- `/remind <message> <time>` - Set a reminder
  - **message**: What to remind you about
  - **time**: When to remind (see formats below)
  - **channel**: Optional - channel to send reminder to (defaults to DM, autocomplete available)
  - **recurring**: Optional - daily, weekly, monthly, or yearly
  - **notes**: Optional - Notes about why you're being reminded

**Time Formats:**

- `30m` - 30 minutes from now
- `2h` - 2 hours from now
- `1d` - 1 day from now
- `1w` - 1 week from now
- `tomorrow 9am` - Natural language
- `2025-01-15 14:30` - ISO date format

**Examples:**

- `/remind message:"Submit project" time:"30m" notes:"Final deadline for CS101 assignment"`
- `/remind message:"Team meeting" time:"tomorrow 9am" channel:#general notes:"Discuss Q1 roadmap"`
- `/remind message:"Weekly report" time:"1w" recurring:weekly notes:"Send to manager every Friday"`

**Adding Notes Later:**

- `/note reminder_id:"abc123" notes:"Important: Check with team first"`

### Managing Reminders

- `/reminders` - List all your active reminders
- `/cancel <reminder_id>` - Cancel a specific reminder
- `/note <reminder_id> <notes>` - Add or edit notes for a reminder

## How It Works

1. **Setting Reminders**: When you set a reminder, it's stored with the specified time
2. **Checking**: Bot checks for due reminders every 30 seconds
3. **Notifying**: When a reminder is due, bot sends notification to specified channel or DM
4. **Recurring**: For recurring reminders, bot automatically schedules the next occurrence
5. **Channel Selection**: Select channels directly via autocomplete in `/remind` command - no need to configure channels in environment variables

## Reminder Types

### One-Time Reminders

Set once, fire once, then automatically removed.

### Recurring Reminders

Automatically reschedule for the next occurrence:

- **Daily**: Same time every day
- **Weekly**: Same time every week
- **Monthly**: Same day/time every month
- **Yearly**: Same date/time every year

## Data Storage

- `data/reminders.json` - All active reminders

## Examples

**Quick reminders:**

```
/remind message:"Coffee break" time:"15m"
/remind message:"Submit homework" time:"2h"
```

**Daily routines:**

```
/remind message:"Daily standup" time:"9am" recurring:daily
/remind message:"Exercise" time:"6pm" recurring:daily
```

**Weekly tasks:**

```
/remind message:"Team sync" time:"monday 10am" recurring:weekly
/remind message:"Weekly review" time:"friday 5pm" recurring:weekly
```

**Important deadlines:**

```
/remind message:"Project deadline" time:"2025-02-01 23:59"
/remind message:"Exam" time:"next week monday 9am"
```

**Channel reminders:**

```
/remind message:"All hands meeting" time:"tomorrow 2pm" channel:#announcements
```

## Troubleshooting

**Reminder not firing:**

- Check bot is online and running
- Verify time format is correct
- Ensure reminder time is in the future

**Bot not responding:**

- Check bot has permission to send messages
- For channel reminders, ensure bot can send messages in that channel
- Verify bot is in the server/channel

**Recurring reminders not working:**

- Check reminder hasn't been cancelled
- Verify recurring type is correct (daily/weekly/monthly/yearly)

## Notes

- All times are interpreted in UTC (converted from your timezone input)
- Reminders are checked every 30 seconds
- Direct messages require bot to share a server with you
- Recurring reminders continue until manually cancelled
