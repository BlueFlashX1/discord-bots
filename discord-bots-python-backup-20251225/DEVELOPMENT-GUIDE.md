# Discord Bots Framework - Development Guide

**Last Updated:** November 28, 2025  
**Purpose:** Step-by-step guide for building new Discord bots using the framework

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Discord bot token (from [Discord Developer Portal](https://discord.com/developers/applications))
- (Optional) OpenAI API key for AI features

### Step 1: Create Bot Directory

```bash
cd discord-bots/bots
mkdir my-new-bot
cd my-new-bot
```

### Step 2: Create Basic Structure

```bash
# Create directory structure
mkdir -p src/core src/ai src/gamification src/utils
mkdir -p data logs docs tests

# Create __init__.py files
touch src/__init__.py
touch src/core/__init__.py
touch src/ai/__init__.py
touch src/gamification/__init__.py
touch src/utils/__init__.py
```

### Step 3: Create Entry Point

Create `main.py`:

```python
#!/usr/bin/env python3
"""My New Bot - Main Entry Point"""

import os
import sys
from dotenv import load_dotenv
import discord
from discord.ext import commands

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# Import shared utilities
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.helpers import load_config
from utils.logger import setup_logger

# Load config
config = load_config("../../config/settings.yaml")

# Setup logger
logger = setup_logger(__name__, "logs/bot.log")

# Create bot
intents = discord.Intents.default()
intents.message_content = True  # If you need message content

bot = commands.Bot(
    command_prefix=config["bot"]["prefix"],
    description="My new Discord bot",
    intents=intents
)

@bot.event
async def on_ready():
    logger.info(f"{bot.user} has connected to Discord!")
    print(f"✅ {bot.user} is ready!")

# Load your cogs/commands here
# from src.core.commands import MyCommands
# await bot.add_cog(MyCommands(bot))

if __name__ == "__main__":
    load_dotenv()
    
    BOT_TOKEN = os.getenv("DISCORD_TOKEN")
    if not BOT_TOKEN:
        logger.error("DISCORD_TOKEN not found in .env file")
        sys.exit(1)
    
    bot.run(BOT_TOKEN)
```

### Step 4: Create Requirements File

Create `requirements.txt`:

```txt
# Core dependencies (from parent requirements.txt)
discord.py>=2.3.2
python-dotenv>=1.0.0
aiohttp>=3.9.0
PyYAML>=6.0.1

# Bot-specific dependencies (add as needed)
# openai>=1.0.0  # If using AI
```

### Step 5: Create Environment File

Create `.env`:

```bash
DISCORD_TOKEN=your_bot_token_here
# OPENAI_API_KEY=your_openai_key_here  # If using AI
```

### Step 6: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 7: Run Your Bot

```bash
python3 main.py
```

---

## 📝 Building Your Bot

### 1. Create Commands (Slash Commands)

Create `src/core/commands.py`:

```python
"""Bot Commands"""

import discord
from discord import app_commands
from discord.ext import commands
from utils.helpers import create_embed, load_config
from utils.logger import setup_logger

logger = setup_logger(__name__)
config = load_config("../../config/settings.yaml")

class MyCommands(commands.Cog):
    """My Bot Commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="hello", description="Say hello")
    async def hello(self, interaction: discord.Interaction):
        """Say hello command"""
        embed = create_embed(
            title="Hello!",
            description=f"Hello, {interaction.user.mention}!",
            color=config["colors"]["success"]
        )
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="info", description="Get bot info")
    async def info(self, interaction: discord.Interaction):
        """Get bot information"""
        embed = create_embed(
            title="Bot Information",
            description="This is my new bot!",
            color=config["colors"]["info"],
            fields=[
                {"name": "Version", "value": "1.0.0", "inline": True},
                {"name": "Status", "value": "Online", "inline": True}
            ],
            timestamp=True
        )
        await interaction.response.send_message(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(MyCommands(bot))
```

Update `main.py` to load the cog:

```python
# In main.py, before bot.run()
async def load_cogs():
    from src.core.commands import MyCommands
    await bot.add_cog(MyCommands(bot))

# In main.py, in on_ready or before bot.run()
await load_cogs()
```

---

### 2. Add AI Integration (Optional)

Create `src/ai/ai_service.py`:

```python
"""AI Service Integration"""

import openai
from utils.logger import setup_logger

logger = setup_logger(__name__)

class AIService:
    """OpenAI integration service"""
    
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
    
    async def generate_response(self, prompt: str, model: str = "gpt-4o-mini") -> str:
        """Generate AI response"""
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"AI error: {e}")
            raise
```

Use in commands:

```python
from src.ai.ai_service import AIService

class MyCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.ai = AIService(api_key)
    
    @app_commands.command(name="ask", description="Ask AI a question")
    async def ask(self, interaction: discord.Interaction, question: str):
        await interaction.response.defer()
        
        response = await self.ai.generate_response(question)
        
        embed = create_embed(
            title="AI Response",
            description=response,
            color=config["colors"]["info"]
        )
        await interaction.followup.send(embed=embed)
```

---

### 3. Add Gamification (Optional)

Create `src/gamification/points.py`:

```python
"""Points System"""

import json
from pathlib import Path
from utils.logger import setup_logger

logger = setup_logger(__name__)

class PointsSystem:
    """User points tracking system"""
    
    def __init__(self, data_file: str = "data/points.json"):
        self.data_file = Path(data_file)
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        self.points = self._load_points()
    
    def _load_points(self) -> dict:
        """Load points from JSON file"""
        if self.data_file.exists():
            try:
                with open(self.data_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading points: {e}")
                return {}
        return {}
    
    def _save_points(self):
        """Save points to JSON file"""
        try:
            with open(self.data_file, "w") as f:
                json.dump(self.points, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving points: {e}")
    
    def get_points(self, user_id: int) -> int:
        """Get user's points"""
        return self.points.get(str(user_id), 0)
    
    def add_points(self, user_id: int, amount: int):
        """Add points to user"""
        user_id = str(user_id)
        if user_id not in self.points:
            self.points[user_id] = 0
        self.points[user_id] += amount
        self._save_points()
        logger.info(f"Added {amount} points to user {user_id}")
    
    def remove_points(self, user_id: int, amount: int):
        """Remove points from user"""
        user_id = str(user_id)
        if user_id not in self.points:
            return
        self.points[user_id] = max(0, self.points[user_id] - amount)
        self._save_points()
```

Use in commands:

```python
from src.gamification.points import PointsSystem

class MyCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.points = PointsSystem()
    
    @app_commands.command(name="points", description="Check your points")
    async def points(self, interaction: discord.Interaction):
        user_points = self.points.get_points(interaction.user.id)
        embed = create_embed(
            title="Your Points",
            description=f"You have {user_points} points!",
            color=config["colors"]["info"]
        )
        await interaction.response.send_message(embed=embed)
```

---

### 4. Add Discord UI (Buttons, Modals)

Create `src/core/views.py`:

```python
"""Discord UI Views"""

import discord
from discord.ui import Button, View, Modal, TextInput

class MyView(View):
    """Custom view with buttons"""
    
    def __init__(self):
        super().__init__(timeout=60.0)
    
    @discord.ui.button(label="Click Me", style=discord.ButtonStyle.primary)
    async def button_callback(self, interaction: discord.Interaction, button: Button):
        await interaction.response.send_message("Button clicked!", ephemeral=True)
    
    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.danger)
    async def cancel_callback(self, interaction: discord.Interaction, button: Button):
        await interaction.response.send_message("Cancelled!", ephemeral=True)
        self.stop()

class MyModal(Modal, title="My Form"):
    """Custom modal form"""
    
    name = TextInput(label="Name", placeholder="Enter your name")
    message = TextInput(label="Message", placeholder="Enter a message", style=discord.TextStyle.paragraph)
    
    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            f"Thanks {self.name.value}! Your message: {self.message.value}",
            ephemeral=True
        )
```

Use in commands:

```python
from src.core.views import MyView, MyModal

class MyCommands(commands.Cog):
    @app_commands.command(name="menu", description="Show menu")
    async def menu(self, interaction: discord.Interaction):
        view = MyView()
        await interaction.response.send_message("Choose an option:", view=view)
    
    @app_commands.command(name="form", description="Show form")
    async def form(self, interaction: discord.Interaction):
        modal = MyModal()
        await interaction.response.send_modal(modal)
```

---

## 🎨 Best Practices

### 1. **Use Shared Utilities**

Always use shared utilities when possible:

```python
# ✅ Good - Use shared utilities
from utils.helpers import create_embed, load_config
from utils.logger import setup_logger

# ❌ Bad - Don't reinvent the wheel
# Creating embeds manually, custom logging, etc.
```

### 2. **Error Handling**

Always handle errors gracefully:

```python
@app_commands.command(name="command")
async def my_command(self, interaction: discord.Interaction):
    try:
        # Your code here
        await interaction.response.send_message("Success!")
    except Exception as e:
        logger.error(f"Error in command: {e}")
        await interaction.response.send_message(
            "An error occurred. Please try again later.",
            ephemeral=True
        )
```

### 3. **Logging**

Log important events:

```python
logger.info(f"User {interaction.user.id} used command /hello")
logger.warning(f"Rate limit hit for user {interaction.user.id}")
logger.error(f"Error processing command: {e}")
```

### 4. **Configuration**

Use configuration files:

```python
# Load shared config
config = load_config("../../config/settings.yaml")

# Use config values
color = config["colors"]["success"]
prefix = config["bot"]["prefix"]
```

### 5. **Async Operations**

Use async/await for I/O operations:

```python
# ✅ Good - Async
async def fetch_data(self):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

# ❌ Bad - Blocking
def fetch_data(self):
    response = requests.get(url)  # Blocks!
    return response.json()
```

---

## 📚 Common Patterns

### Pattern 1: Command with Options

```python
@app_commands.command(name="command")
@app_commands.describe(
    option1="Description of option 1",
    option2="Description of option 2"
)
async def my_command(
    self,
    interaction: discord.Interaction,
    option1: str,
    option2: int = 10
):
    # Command logic
    pass
```

### Pattern 2: Deferred Response

```python
@app_commands.command(name="slow")
async def slow_command(self, interaction: discord.Interaction):
    await interaction.response.defer()  # Tell Discord we're working on it
    
    # Do slow operation
    result = await slow_operation()
    
    # Send followup
    await interaction.followup.send(f"Result: {result}")
```

### Pattern 3: Ephemeral Messages

```python
# Only visible to the user who ran the command
await interaction.response.send_message("Secret message!", ephemeral=True)
```

### Pattern 4: Rate Limiting

```python
from discord.ext import commands

# Cooldown: 1 command per 5 seconds per user
@commands.cooldown(1, 5, commands.BucketType.user)
@app_commands.command(name="spam")
async def spam_command(self, interaction: discord.Interaction):
    await interaction.response.send_message("Not spamming!")
```

---

## 🧪 Testing

### Create Test File

Create `tests/test_commands.py`:

```python
"""Test bot commands"""

import pytest
from unittest.mock import AsyncMock, MagicMock
import discord

# Import your bot code
from src.core.commands import MyCommands

@pytest.mark.asyncio
async def test_hello_command():
    """Test hello command"""
    # Mock bot and interaction
    bot = MagicMock()
    interaction = AsyncMock(spec=discord.Interaction)
    interaction.user.mention = "@user"
    interaction.response.send_message = AsyncMock()
    
    # Create cog and call command
    cog = MyCommands(bot)
    await cog.hello(interaction)
    
    # Verify response was sent
    interaction.response.send_message.assert_called_once()
```

Run tests:

```bash
pytest tests/
```

---

## 📦 Deployment

### 1. Create Startup Script

Create `start_bot.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate  # If using virtual environment
python3 main.py
```

Make executable:

```bash
chmod +x start_bot.sh
```

### 2. Create LaunchAgent (macOS)

Create `com.mybot.launcher.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mybot.launcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/path/to/my-new-bot/main.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/my-new-bot/logs/bot.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/my-new-bot/logs/bot.error.log</string>
</dict>
</plist>
```

Install:

```bash
cp com.mybot.launcher.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mybot.launcher.plist
```

---

## 📝 Documentation

### Create README.md

```markdown
# My New Bot

Description of your bot.

## Features

- Feature 1
- Feature 2

## Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Create `.env` file with `DISCORD_TOKEN`
3. Run: `python3 main.py`

## Commands

- `/hello` - Say hello
- `/info` - Get bot info
```

---

## 🎯 Next Steps

1. **Read ARCHITECTURE.md** - Understand the framework architecture
2. **Read SHARED-UTILITIES.md** - Reference for shared utilities
3. **Review existing bots** - See real examples:
   - `bots/grammar-teacher-bot/` - AI integration example
   - `bots/hangman-bot/` - Game bot example
   - `bots/spelling-bee-bot/` - Complex game example
4. **Build your bot** - Start with simple commands, add features gradually
5. **Test thoroughly** - Test all commands and error cases
6. **Deploy** - Set up LaunchAgent or systemd service

---

## 🐛 Troubleshooting

### Bot won't start

- Check `.env` file has `DISCORD_TOKEN`
- Check Python version: `python3 --version` (need 3.8+)
- Check dependencies: `pip install -r requirements.txt`
- Check logs: `logs/bot.log` and `logs/bot.error.log`

### Commands not showing

- Sync commands: `await bot.tree.sync()`
- Check bot has proper intents
- Check bot has permissions in server

### Import errors

- Check Python path includes `src/` directory
- Check shared utilities path: `../../utils/`
- Verify `__init__.py` files exist

---

**Happy bot building!** 🚀
