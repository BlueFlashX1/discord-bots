# Discord Bots Setup Guide

## Table of Contents
1. [Discord Developer Portal Setup](#discord-developer-portal-setup)
2. [Reddit Filter Bot Setup](#reddit-filter-bot-setup)
3. [Command Control Bot Setup](#command-control-bot-setup)
4. [Bot Invite Links](#bot-invite-links)

---

## Discord Developer Portal Setup

### Create a New Application

1. Go to https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it (e.g., "Reddit Filter Bot" or "Command Control Bot")
4. Click **"Create"**

### Get Your Application/Client ID

1. On the **General Information** page
2. Copy the **Application ID** - this is your `CLIENT_ID`

### Create the Bot User

1. Go to the **Bot** section in the left sidebar
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **Token**, click **"Reset Token"** → **"Yes, do it!"**
4. Copy the token - this is your `DISCORD_TOKEN`
   - **IMPORTANT**: Save this immediately, you can't see it again!

### Configure Bot Settings

Under **Privileged Gateway Intents**, enable:
- [ ] **Message Content Intent** - Required for both bots

### Generate Invite Link

1. Go to **OAuth2** → **URL Generator**
2. Under **Scopes**, select:
   - [x] `bot`
   - [x] `applications.commands`

3. Under **Bot Permissions**, select:

#### Reddit Filter Bot Permissions:
- [x] Send Messages
- [x] Send Messages in Threads
- [x] Embed Links
- [x] Attach Files
- [x] Read Message History
- [x] Use Slash Commands

**Permission Integer: `274878024768`**

#### Command Control Bot Permissions:
- [x] Send Messages
- [x] Send Messages in Threads
- [x] Create Public Threads
- [x] Embed Links
- [x] Attach Files
- [x] Read Message History
- [x] Manage Messages (for delete button)
- [x] Use Slash Commands

**Permission Integer: `274878041152`**

4. Copy the generated URL at the bottom
5. Open in browser → Select your server → Authorize

---

## Reddit Filter Bot Setup

### 1. Create Reddit API Application

1. Go to https://www.reddit.com/prefs/apps
2. Scroll down and click **"create another app..."**
3. Fill in:
   - **name**: `reddit-filter-bot`
   - **type**: Select **"script"**
   - **description**: `Discord bot for filtering Reddit posts`
   - **redirect uri**: `http://localhost:8080`
4. Click **"create app"**
5. Note down:
   - **Client ID**: The string under "personal use script"
   - **Client Secret**: The string next to "secret"

### 2. Configure Environment

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/reddit-filter-bot
cp .env.example .env
```

Edit `.env` with your values:

```env
# Discord
DISCORD_TOKEN=your_bot_token_from_developer_portal
CLIENT_ID=your_application_id
GUILD_ID=your_server_id_for_testing

# Reddit
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT=discord:reddit-filter-bot:v1.0.0 (by /u/your_username)
```

### 3. Configure Monitoring

Edit `config.json`:

```json
{
  "subreddits": ["Python", "javascript", "programming"],
  "keywords": ["tutorial", "how to", "beginner"],
  "check_interval": 300,
  "discord_channel_id": "YOUR_CHANNEL_ID_HERE",
  "post_limit": 25,
  "min_score": 5
}
```

**To get Channel ID**: Right-click the channel → Copy Channel ID

### 4. Available Slash Commands

| Command | Description |
|---------|-------------|
| `/reddit-status` | View current configuration and status |
| `/reddit-add subreddit <name>` | Add a subreddit to monitor |
| `/reddit-add keyword <word>` | Add a keyword filter |
| `/reddit-remove subreddit <name>` | Remove a subreddit |
| `/reddit-remove keyword <word>` | Remove a keyword |
| `/reddit-pause` | Pause monitoring |
| `/reddit-resume` | Resume monitoring |
| `/reddit-config min-score <n>` | Set minimum post score |
| `/reddit-config interval <sec>` | Set check interval (60-3600) |

---

## Command Control Bot Setup

### 1. Configure Environment

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/command-control-bot
cp .env.example .env
```

Edit `.env` with your values:

```env
# Discord
DISCORD_TOKEN=your_bot_token_from_developer_portal
CLIENT_ID=your_application_id
GUILD_ID=your_server_id_for_testing

# Admin - Your Discord User ID
ADMIN_USER_IDS=your_user_id_here

# Optional: Channel for scheduler notifications
SCHEDULER_CHANNEL_ID=your_channel_id_here
```

**To get your User ID**:
1. Enable Developer Mode: User Settings → App Settings → Advanced → Developer Mode
2. Right-click your name → Copy User ID

### 2. Configure Commands

Edit `config/commands.json`:

```json
{
  "commands": [
    {
      "id": "example-command",
      "label": "Example Command",
      "command": "echo 'Hello World'",
      "directory": "~/Documents/DEVELOPMENT",
      "description": "A test command",
      "category": "Testing",
      "timeout": 30000
    },
    {
      "id": "start-reddit-bot",
      "label": "Start Reddit Bot",
      "command": "npm start",
      "directory": "~/Documents/DEVELOPMENT/discord/bots/reddit-filter-bot",
      "description": "Start the Reddit filter bot",
      "category": "Discord Bots"
    }
  ]
}
```

**Command Properties:**
- `id`: Unique identifier (no spaces)
- `label`: Display name in Discord
- `command`: Shell command to execute
- `directory`: Working directory (supports `~`)
- `description`: Brief description
- `category`: Group commands in UI
- `timeout`: Optional timeout in milliseconds (0 = no timeout)

### 3. Available Slash Commands

| Command | Description |
|---------|-------------|
| `/control-panel` | Display button interface to run commands |
| `/schedule add <command> <cron>` | Schedule a command |
| `/schedule list` | View all scheduled commands |
| `/schedule remove <job>` | Remove a scheduled command |
| `/schedule toggle <job> <enabled>` | Enable/disable schedule |
| `/schedule run <job>` | Manually run scheduled command |

**Cron Expression Examples:**
- `0 9 * * *` - Every day at 9:00 AM
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * 0` - Every Sunday at midnight
- `0 8 * * 1-5` - Weekdays at 8:00 AM

---

## Bot Invite Links

### Reddit Filter Bot
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

### Command Control Bot
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878041152&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your Application ID from the Developer Portal.

---

## Quick Start Checklist

### Reddit Filter Bot
- [ ] Create Discord application and bot
- [ ] Enable Message Content Intent
- [ ] Create Reddit API application (script type)
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Update `config.json` with channel ID and subreddits
- [ ] Generate invite link and add bot to server
- [ ] Run `npm install`
- [ ] Run `npm start`

### Command Control Bot
- [ ] Create Discord application and bot
- [ ] Enable Message Content Intent
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Add your User ID to `ADMIN_USER_IDS`
- [ ] Configure commands in `config/commands.json`
- [ ] Generate invite link and add bot to server
- [ ] Run `npm install`
- [ ] Run `npm start`
