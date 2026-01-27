# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd ~/path/to/discord/bots/command-control-bot
npm install
```

### 2. Create .env File

Create `.env` file with:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
ADMIN_USER_IDS=your_discord_user_id_here
```

**How to get these:**
- **DISCORD_TOKEN**: Discord Developer Portal → Your Bot → Token
- **DISCORD_CLIENT_ID**: Discord Developer Portal → Your Bot → Application ID
- **DISCORD_GUILD_ID**: Right-click your server → Copy Server ID (enable Developer Mode)
- **ADMIN_USER_IDS**: Right-click yourself → Copy User ID (enable Developer Mode)

### 3. Configure Commands

Edit `config/commands.json` to add your commands. Example:

```json
{
  "commands": [
    {
      "id": "ulquiorra-rojo",
      "label": "Ulquiorra Recreation",
      "command": "rojo serve",
      "directory": "~/path/to/your/project",
      "description": "Start Rojo sync for Ulquiorra Lanza project"
    },
    {
      "id": "another-command",
      "label": "Another Command",
      "command": "npm start",
      "directory": "~/path/to/your/project",
      "description": "Start another process"
    }
  ]
}
```

### 4. Deploy Commands

```bash
npm run deploy
```

### 5. Start Bot

```bash
npm start
```

## Usage

1. In Discord, use `/control-panel`
2. Click a button to start a command
3. Watch real-time status updates (updates every 1 second)
4. Use "Stop Process" button to terminate running process
5. When process completes, "Delete Message" button appears

## Features

✅ **Real-time Updates**: Status updates every 1 second while running
✅ **Multiple Processes**: Run multiple commands simultaneously
✅ **Admin Only**: Only configured admins can use buttons
✅ **Process Control**: Stop running processes
✅ **Error Logging**: All errors logged to `logs/errors.log`
✅ **Configurable**: Easy to add new commands via JSON

## Troubleshooting

### Bot doesn't respond
- Check `.env` file has correct token
- Verify bot is online (check console)
- Make sure commands are deployed: `npm run deploy`

### Permission errors
- Verify `ADMIN_USER_IDS` in `.env` matches your Discord user ID
- Check bot has necessary permissions in server

### Commands not found
- Run `npm run deploy` to deploy commands
- Wait up to 1 hour for global commands (or use guild commands for instant)

### Process errors
- Check `logs/errors.log` for detailed error information
- Verify command paths in `config/commands.json` are correct
- Ensure commands exist and are executable
