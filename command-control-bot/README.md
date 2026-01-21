# Discord Command Control Bot

Discord bot that provides a button-based interface for executing shell commands remotely.

## Features

- Slash command `/control-panel` to display command buttons
- Real-time status updates (every 5 seconds, rate-limit safe)
- Multiple processes can run simultaneously
- Admin-only access control
- Process management (start/stop/restart)
- Process timeout support
- View full logs button
- Stream output to Discord threads
- Category support with select menus
- Config hot-reload (edit commands.json without restart)
- JSON validation on startup
- Automatic process cleanup (30 min after completion)
- Error logging and diagnostics
- Graceful shutdown handling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
ADMIN_USER_IDS=your_discord_user_id,another_admin_id
LOG_LEVEL=info
```

#### Environment Variables

| Variable               | Required | Description                                                                        |
| ---------------------- | -------- | ---------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        | Yes      | Bot token from Discord Developer Portal                                            |
| `DISCORD_CLIENT_ID`    | Yes      | Application/Client ID from Discord                                                 |
| `DISCORD_GUILD_ID`     | No       | Guild ID for faster command deployment (testing)                                   |
| `ADMIN_USER_IDS`       | Yes      | Comma-separated Discord user IDs that can use the bot                              |
| `LOG_LEVEL`            | No       | Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`)              |
| `SCHEDULER_CHANNEL_ID` | No       | Channel for scheduler notifications (deprecated - use `/settings channel` instead) |

**Log Levels:**

- `debug` - Verbose output for troubleshooting (writes to `logs/debug.log`)
- `info` - Standard operation logs
- `warn` - Warnings and potential issues
- `error` - Errors only (always written to `logs/errors.log`)

### 3. Configure Commands

Edit `config/commands.json` to add your commands:

```json
{
  "commands": [
    {
      "id": "my-server",
      "label": "Start Server",
      "command": "npm start",
      "directory": "~/projects/my-app",
      "description": "Start the development server",
      "category": "Development",
      "timeout": 3600000
    },
    {
      "id": "run-tests",
      "label": "Run Tests",
      "command": "npm test",
      "directory": "~/projects/my-app",
      "description": "Run test suite",
      "category": "Development",
      "timeout": 300000
    },
    {
      "id": "deploy",
      "label": "Deploy",
      "command": "./deploy.sh",
      "directory": "~/projects/my-app",
      "description": "Deploy to production",
      "category": "Operations"
    }
  ]
}
```

#### Command Options

| Field         | Required | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `id`          | Yes      | Unique identifier for the command                      |
| `label`       | Yes      | Button/menu label shown in Discord                     |
| `command`     | Yes      | Shell command to execute                               |
| `directory`   | Yes      | Working directory (supports `~` expansion)             |
| `description` | No       | Description shown in embed                             |
| `category`    | No       | Group commands into categories (shows as select menus) |
| `timeout`     | No       | Auto-kill after N milliseconds (0 = no timeout)        |

### 4. Deploy Commands

```bash
npm run deploy
```

### 5. Start Bot

```bash
npm start
```

## Usage

1. Use `/control-panel` in Discord (admin only)
2. Select a command from buttons or category dropdown
3. Watch real-time status updates in the embed
4. Available buttons while running:
   - **Stop Process** - Kill the running process
   - **Stream to Thread** - Create a thread with live output
5. Available buttons when finished:
   - **Restart** - Run the command again
   - **View Logs** - Download full stdout/stderr
   - **Delete** - Remove the status message
6. Use **Reload Config** to apply changes to commands.json

### Settings

- `/settings channel [channel]` - Set notification channel for scheduled commands (admin only)
  - With channel: Sets notification channel (autocomplete available)
  - Without channel: Removes notification channel
- `/settings view` - View current bot settings

## Project Structure

```
command-control-bot/
├── index.js               # Main bot file
├── deploy-commands.js     # Command deployment
├── config/
│   └── commands.json      # Command definitions
├── commands/
│   └── control-panel.js   # /control-panel command
├── events/
│   ├── ready.js
│   └── interactionCreate.js
├── services/
│   ├── configManager.js   # Config loading/validation/hot-reload
│   ├── processManager.js  # Process execution & lifecycle
│   ├── statusUpdater.js   # Status updates & thread streaming
│   └── logger.js          # Error logging
└── logs/
    └── errors.log         # Error logs
```

## Permissions Required

The bot needs these Discord permissions:

- Send Messages
- Embed Links
- Attach Files
- Create Public Threads
- Send Messages in Threads
- Manage Threads
