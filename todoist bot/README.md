# Todoist Discord Bot

A Discord bot that integrates with Todoist to manage tasks, sync in real-time, and provide daily overviews.

## Features

- ✅ **List Tasks**: View all tasks organized by due date (today, tomorrow, other) and projects
- ✅ **Subtask Display**: Automatically shows subtasks for each task
- ✅ **Create Tasks**: Create new tasks with tags, project categories, and due dates
- ✅ **Task Completion**: Check off completed tasks
- ✅ **Task Delays**: Delay tasks to later dates
- ✅ **Daily Notifications**: @ mention users for tasks due today
- ✅ **Real-time Sync**: Automatically syncs with Todoist app (additions, deletions, updates)
- ✅ **Daily Overview**: Scheduled daily overview of tasks due today

## Setup

### 1. Install Dependencies

```bash
cd "discord/bots/todoist bot"
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

- `DISCORD_TOKEN`: Your Discord bot token
- `DISCORD_CLIENT_ID`: Your Discord application client ID
- `DISCORD_GUILD_ID`: Your Discord server (guild) ID
- `TODOIST_API_TOKEN`: Your Todoist API token (get from <https://todoist.com/app/settings/integrations>)
- `NOTIFICATION_CHANNEL_ID`: Channel ID for daily overviews (optional, deprecated - use `/settings channel` instead)
- `SYNC_INTERVAL_SECONDS`: Sync interval in seconds (default: 30)

### 3. Deploy Commands

```bash
npm run deploy
```

### 4. Start the Bot

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Commands

### `/list [filter]`

List all tasks organized by due date and projects.

- Options:
  - `filter`: "today", "tomorrow", or "all" (default: "all")

### `/create <content> [options]`

Create a new task in Todoist.

- Required:
  - `content`: Task description
- Optional:
  - `due`: Due date (YYYY-MM-DD, "today", or "tomorrow")
  - `project`: Project name
  - `labels`: Comma-separated labels
  - `priority`: Priority level (Normal, High, Very High, Urgent)

### `/settings`

Configure bot settings.

- `/settings channel [channel]` - Set channel for daily overview notifications
  - With channel: Sets daily overview channel (autocomplete available)
  - Without channel: Removes daily overview channel
- `/settings view` - View your current settings

### `/complete <task_id>`

Mark a task as complete.

### `/delay <task_id> <date>`

Delay a task to a later date.

- `date`: New due date (YYYY-MM-DD, "tomorrow", or "+7d" for 7 days)

### `/today`

Get daily overview of tasks due today.

## Real-time Sync

The bot automatically syncs with Todoist every 30 seconds (configurable via `SYNC_INTERVAL_SECONDS`). This ensures:

- New tasks added in Todoist appear in Discord
- Tasks deleted in Todoist are removed from cache
- Task updates are reflected immediately

## Daily Overview

The bot sends a daily overview at 9:00 AM (configurable via cron schedule) to channels configured via `/settings channel`. The overview includes:

- All tasks due today
- Organized by project
- Subtasks displayed
- Completion status

## Getting Your Todoist API Token

1. Go to <https://todoist.com/app/settings/integrations>
2. Scroll to "Developer" section
3. Copy your API token
4. Add it to your `.env` file

## Project Structure

```
todoist bot/
├── index.js              # Main bot file
├── package.json          # Dependencies
├── deploy-commands.js    # Command deployment script
├── commands/             # Slash commands
│   ├── list.js
│   ├── create.js
│   ├── complete.js
│   ├── delay.js
│   └── today.js
├── events/               # Discord events
│   ├── ready.js
│   └── interactionCreate.js
└── services/             # Business logic
    ├── todoist.js        # Todoist API integration
    ├── sync.js           # Real-time sync service
    └── dailyOverview.js  # Daily overview service
```

## Troubleshooting

### Bot not responding to commands

1. Make sure commands are deployed: `npm run deploy`
2. Wait up to 1 hour for global commands to propagate
3. Restart Discord app to refresh command cache

### Sync not working

1. Check `TODOIST_API_TOKEN` is correct
2. Verify `SYNC_INTERVAL_SECONDS` is set appropriately
3. Check bot logs for API errors

### Daily overview not sending

1. Verify `NOTIFICATION_CHANNEL_ID` is set
2. Check bot has permission to send messages in that channel
3. Verify cron schedule is correct (default: 9:00 AM)

## License

ISC
