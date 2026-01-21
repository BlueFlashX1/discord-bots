# Todoist Bot Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd "discord/bots/todoist bot"
npm install
```

### 2. Get Your Todoist API Token

1. Go to https://todoist.com/app/settings/integrations
2. Scroll to the "Developer" section
3. Click "Copy" next to your API token
4. Save it for the next step

### 3. Configure Environment Variables

Create a `.env` file in the bot directory:

```bash
cp .env.example .env
# Then edit .env with your actual values
```

Required values:
- `DISCORD_TOKEN`: Get from https://discord.com/developers/applications
- `DISCORD_CLIENT_ID`: Same as above (Application ID)
- `DISCORD_GUILD_ID`: Right-click your Discord server → Copy Server ID
- `TODOIST_API_TOKEN`: From step 2 above
- `NOTIFICATION_CHANNEL_ID`: Right-click the channel → Copy Channel ID (optional)
- `SYNC_INTERVAL_SECONDS`: How often to sync (default: 30)

### 4. Deploy Commands

```bash
npm run deploy
```

This registers all slash commands with Discord. Wait a few minutes for them to appear.

### 5. Start the Bot

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Getting Discord Credentials

### Bot Token

1. Go to https://discord.com/developers/applications
2. Create a new application or select existing one
3. Go to "Bot" section
4. Click "Reset Token" or copy existing token
5. Enable "Message Content Intent" under "Privileged Gateway Intents"

### Client ID (Application ID)

1. Same page as above
2. Go to "General Information"
3. Copy "Application ID"

### Guild ID (Server ID)

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your Discord server
3. Click "Copy Server ID"

### Channel ID

1. With Developer Mode enabled
2. Right-click the channel where you want daily overviews
3. Click "Copy Channel ID"

## Features Overview

### Commands

- `/list [filter]` - List all tasks (today/tomorrow/all)
- `/create <content> [options]` - Create new task
- `/complete <task_id>` - Mark task as complete
- `/delay <task_id> <date>` - Delay task to later date
- `/today` - Get today's task overview
- `/search <query>` - Search for tasks

### Real-time Sync

The bot automatically syncs with Todoist every 30 seconds (configurable). This means:
- Tasks added in Todoist appear in Discord
- Tasks deleted in Todoist are removed
- Task updates are reflected immediately

### Daily Overview

If `NOTIFICATION_CHANNEL_ID` is set, the bot will send a daily overview at 9:00 AM with:
- All tasks due today
- Organized by project
- Subtasks included
- Completion status

## Troubleshooting

### Commands not appearing

1. Make sure you ran `npm run deploy`
2. Wait up to 1 hour for global commands
3. Restart Discord app
4. Try typing `/` in Discord to see available commands

### Bot not responding

1. Check bot is running: `npm start`
2. Check `.env` file has correct values
3. Check bot has permission to send messages in your server
4. Check console for error messages

### Sync not working

1. Verify `TODOIST_API_TOKEN` is correct
2. Check API token hasn't expired
3. Verify `SYNC_INTERVAL_SECONDS` is set (default: 30)
4. Check console logs for API errors

### Daily overview not sending

1. Verify `NOTIFICATION_CHANNEL_ID` is set
2. Check bot has permission to send messages in that channel
3. Verify cron schedule (default: 9:00 AM)
4. Check console logs for errors

## Next Steps

1. Test commands: Try `/list` to see your tasks
2. Create a task: Try `/create content:"Test task" due:"today"`
3. Complete a task: Use `/list` to get task ID, then `/complete task_id:"ID"`
4. Set up daily overview: Add `NOTIFICATION_CHANNEL_ID` to `.env`

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Make sure bot has proper Discord permissions
4. Verify Todoist API token is valid
