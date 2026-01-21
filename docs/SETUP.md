# Exercism Bot Setup Guide

## Prerequisites

1. **Python 3.8+** installed
2. **Exercism CLI** installed and configured
3. **Discord Bot** created and token obtained

## Step 1: Install Exercism CLI

### macOS

```bash
brew install exercism
```

### Linux/Windows

Download from: <https://exercism.org/cli-walkthrough>

### Verify Installation

```bash
exercism version
```

## Step 2: Configure Exercism CLI

1. Get your API token from: <https://exercism.org/settings/api_cli>
2. Configure CLI:

```bash
exercism configure --token=YOUR_TOKEN_HERE
```

3. Verify configuration:

```bash
exercism whoami
```

## Step 3: Set Up Python Environment

```bash
cd discord/bots/exercism-bot
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 4: Configure Discord Bot

1. Create a `.env` file:

```bash
cp .env.example .env
```

2. Edit `.env` with your values:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
```

### Getting Discord Bot Credentials

1. Go to <https://discord.com/developers/applications>
2. Create a new application or select existing
3. Go to "Bot" section:
   - Copy the **Token** → `DISCORD_TOKEN`
   - Copy the **Application ID** → `CLIENT_ID`
4. Go to your Discord server:
   - Right-click server → Server Settings → Widget
   - Copy **Server ID** → `GUILD_ID`

## Step 5: Deploy Commands

```bash
python deploy-commands.py
```

This syncs slash commands to Discord. You should see:

```
Synced commands to guild 123456789
```

## Step 6: Start the Bot

```bash
python bot.py
```

You should see:

```
Bot has connected to Discord!
Bot is in 1 guild(s)
```

## Testing

1. In Discord, type `/` to see available commands
2. Try `/check` to verify Exercism CLI is working
3. Try `/fetch hello-world python` to download an exercise
4. Try `/tracks` to see available tracks

## Troubleshooting

### "Exercism CLI not found"

- Install CLI: `brew install exercism`
- Verify: `which exercism`
- Check PATH includes exercism binary

### "Not authenticated"

- Run: `exercism configure --token=YOUR_TOKEN`
- Get token from: <https://exercism.org/settings/api_cli>

### "Commands not showing in Discord"

- Run: `python deploy-commands.py`
- Wait 1-2 minutes for Discord to update
- Restart Discord client

### "Permission denied" errors

- Make sure bot has "Use Application Commands" permission
- Re-invite bot with correct permissions

## Next Steps

- Set up daily problem delivery (modify `bot.py`)
- Add more exercise tracking
- Customize embeds and messages
- Add progress tracking features
