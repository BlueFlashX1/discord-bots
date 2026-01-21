# Discord Bots - Quick Start Guide

## 🚀 Setup

### 1. Install Dependencies

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots
pip install -r requirements.txt
```

### 2. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name and click "Create"
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy the bot token (keep it secret!)

### 3. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env and add your bot token:
# BOT_TOKEN_1=your_actual_token_here
```

### 4. Invite Bot to Server

1. In Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions you need
4. Copy the generated URL and open it in browser
5. Select your server and authorize

## 📝 Create Your First Bot

### Basic Bot Template

Create `bots/my-first-bot/bot.py`:

```python
import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')

# Create bot instance
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user} is now online!')

@bot.command()
async def ping(ctx):
    """Simple ping command"""
    await ctx.send(f'Pong! {round(bot.latency * 1000)}ms')

@bot.command()
async def hello(ctx):
    """Say hello"""
    await ctx.send(f'Hello {ctx.author.mention}!')

# Run the bot
bot.run(TOKEN)
```

### Run Your Bot

```bash
cd bots/my-first-bot
python bot.py
```

### Test Commands

In your Discord server:
```
!ping
!hello
```

## 🎯 Next Steps

1. **Add Cogs** - Organize commands into groups
2. **Add Slash Commands** - Modern Discord commands
3. **Error Handling** - Handle errors gracefully
4. **Database** - Store persistent data
5. **Advanced Features** - Embeds, reactions, buttons, etc.

## 📚 Resources

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Discord Developer Docs](https://discord.com/developers/docs)
- [Bot Examples](https://github.com/Rapptz/discord.py/tree/master/examples)

## 🔧 Common Issues

### Bot doesn't respond
- Check if message content intent is enabled
- Verify bot has permissions in the channel
- Check bot token is correct

### Import errors
- Make sure you installed requirements: `pip install -r requirements.txt`
- Check Python version (3.8+ required)

### Permission errors
- Bot needs proper permissions in server
- Check role hierarchy
- Verify OAuth2 scopes

## 🎊 You're Ready!

Start building your Discord bots! Check the `utils/` folder for helpful utilities.
