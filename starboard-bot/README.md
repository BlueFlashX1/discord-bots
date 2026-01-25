# Starboard Discord Bot

A Discord bot that automatically saves starred messages to a forum channel with intelligent auto-tagging and title standardization.

## Features

- ⭐ **Auto-Starboard** - Automatically posts messages that reach star threshold to forum channel
- 🏷️ **Keyword-Based Auto-Tagging** - Intelligently categorizes posts using keyword matching
- 📝 **Title Standardization** - Formats titles as `[Tag1] [Tag2] Original Title` for easy browsing
- 🔍 **Forum Organization** - Uses Discord forum channels with tags for easy filtering
- ⚙️ **Configurable** - Set star threshold, forum channel, and tag keywords per server

## Setup

### Local Development

### 1. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` file (already created):

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

## VPS Deployment

### Quick Deploy

```bash
./deploy-vps.sh
```

This will:
- Copy all files to VPS
- Install dependencies
- Deploy Discord commands
- Start/restart bot with PM2

### Manual VPS Setup

See [VPS-DEPLOYMENT.md](VPS-DEPLOYMENT.md) for detailed instructions.

**Important**: After deploying to VPS, add the bot entry to `/root/discord-bots/ecosystem.config.js` on the VPS, then reload PM2:

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 "cd /root/discord-bots && pm2 reload ecosystem.config.js"
```

## Configuration

### Set Starboard Forum Channel

```
/starboard-set-channel <forum_channel>
```

Sets the forum channel where starred messages will be posted.

### Set Star Threshold

```
/starboard-set-threshold <number>
```

Sets the minimum number of ⭐ reactions needed to post to starboard (default: 5).

### View Configuration

```
/starboard-config
```

Shows current starboard settings for the server.

## How It Works

1. **Reaction Monitoring**: Bot watches for ⭐ reactions on messages
2. **Threshold Check**: When a message reaches the star threshold, it triggers
3. **Auto-Tagging**: Bot analyzes message content using keyword matching
4. **Title Formatting**: Creates standardized title: `[Tag1] [Tag2] Original Title`
5. **Forum Post**: Creates a forum post with:
   - Standardized title with tags
   - Original message content
   - Author information
   - Link back to original message
   - Star count
   - Applied tags for filtering

## Tag System

Tags are automatically assigned based on keyword matching. The tag keywords are stored in `config/tags.json` and can be easily updated.

**Default Tags:**
- `AI` - Artificial intelligence, machine learning, LLMs
- `Data Science` - Data analysis, datasets, visualization
- `Programming` - Code, development, technical
- `Question` - Questions, help requests
- `Resource` - Links, tutorials, documentation
- `Discussion` - General discussions
- `Announcement` - Important announcements

**Adding New Tags:**

Edit `config/tags.json` to add new tags and their keywords. The bot will automatically use them on next restart.

## Data Storage

- `data/starboard.json` - Tracks which messages have been posted to starboard
- `data/config.json` - Server-specific configurations (forum channel, threshold)
- `config/tags.json` - Tag keywords for auto-tagging

## Permissions Required

- `View Channels` - To read messages
- `Send Messages` - To post in forum channel
- `Manage Messages` - To create forum posts
- `Read Message History` - To access original messages
- `Add Reactions` - To react to messages (optional)

## Examples

**Message gets 5 stars:**
```
Original: "How do I fine-tune GPT-4 for my use case?"
Starboard Post: "[AI] [Question] How do I fine-tune GPT-4 for my use case?"
Tags Applied: AI, Question
```

**Message gets 5 stars:**
```
Original: "Check out this pandas tutorial: https://..."
Starboard Post: "[Data Science] [Resource] Check out this pandas tutorial: https://..."
Tags Applied: Data Science, Resource
```

## Troubleshooting

**Messages not posting to starboard:**
- Check bot has permission to create forum posts
- Verify forum channel is set correctly
- Ensure star threshold is met
- Check bot is online and has message content intent

**Tags not applying:**
- Verify `config/tags.json` exists and is valid JSON
- Check tag keywords match message content
- Ensure forum channel has the tag created in Discord

**Duplicate posts:**
- Bot tracks posted messages to prevent duplicates
- If message is edited and re-stars, it won't duplicate
