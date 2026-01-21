# Discord Bots Framework - Shared Utilities Reference

**Last Updated:** November 28, 2025  
**Purpose:** Complete reference for shared utilities and configuration

---

## 📚 Table of Contents

1. [Helpers Module](#helpers-module)
2. [Logger Module](#logger-module)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)

---

## 🔧 Helpers Module

**Location:** `discord-bots/utils/helpers.py`  
**Import:** `from utils.helpers import function_name`

### Functions

#### `load_config(config_file: str) -> Dict[str, Any]`

Load configuration from YAML file.

**Parameters:**
- `config_file` (str): Path to YAML config file (default: `"config/settings.yaml"`)

**Returns:**
- `Dict[str, Any]`: Configuration dictionary

**Raises:**
- `FileNotFoundError`: If config file doesn't exist

**Example:**
```python
from utils.helpers import load_config

# Load shared config
config = load_config("config/settings.yaml")

# Load bot-specific config
bot_config = load_config("my-bot/config.yaml")

# Access values
prefix = config["bot"]["prefix"]
color = config["colors"]["success"]
```

---

#### `create_embed(title: str, description: str = None, color: int = 0x3498DB, fields: list = None, footer: str = None, thumbnail: str = None, image: str = None, timestamp: bool = False) -> discord.Embed`

Create a Discord embed with common formatting.

**Parameters:**
- `title` (str): Embed title (required)
- `description` (str): Embed description (optional)
- `color` (int): Embed color as hex integer (default: `0x3498DB`)
- `fields` (list): List of field dicts with `name`, `value`, `inline` keys (optional)
- `footer` (str): Footer text (optional)
- `thumbnail` (str): Thumbnail URL (optional)
- `image` (str): Image URL (optional)
- `timestamp` (bool): Whether to add current timestamp (default: `False`)

**Returns:**
- `discord.Embed`: Configured Discord embed

**Example:**
```python
from utils.helpers import create_embed, load_config

config = load_config("config/settings.yaml")

# Simple embed
embed = create_embed(
    title="Hello!",
    description="This is a simple embed",
    color=config["colors"]["success"]
)

# Complex embed with fields
embed = create_embed(
    title="User Stats",
    description="Statistics for user",
    color=config["colors"]["info"],
    fields=[
        {"name": "Messages", "value": "100", "inline": True},
        {"name": "Level", "value": "5", "inline": True},
        {"name": "Points", "value": "500", "inline": True}
    ],
    footer="Bot Name",
    timestamp=True
)

await interaction.response.send_message(embed=embed)
```

---

#### `format_time(seconds: int) -> str`

Format seconds into human-readable time string.

**Parameters:**
- `seconds` (int): Number of seconds

**Returns:**
- `str`: Formatted time string (e.g., `"2h 30m 15s"`)

**Example:**
```python
from utils.helpers import format_time

format_time(3600)    # "1h"
format_time(3661)    # "1h 1m 1s"
format_time(90)      # "1m 30s"
format_time(45)      # "45s"
```

---

#### `parse_time(time_str: str) -> Optional[int]`

Parse time string into total seconds.

**Parameters:**
- `time_str` (str): Time string (e.g., `"2h"`, `"30m"`, `"1h30m"`)

**Returns:**
- `Optional[int]`: Total seconds or `None` if invalid

**Example:**
```python
from utils.helpers import parse_time

parse_time("2h")      # 7200
parse_time("30m")    # 1800
parse_time("1h30m")  # 5400
parse_time("15s")    # 15
parse_time("invalid") # None
```

---

#### `chunk_list(lst: list, chunk_size: int) -> list`

Split a list into chunks of specified size.

**Parameters:**
- `lst` (list): List to chunk
- `chunk_size` (int): Size of each chunk

**Returns:**
- `list`: List of chunks

**Example:**
```python
from utils.helpers import chunk_list

items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
chunks = chunk_list(items, 3)
# [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
```

**Use Case:** Paginating Discord embeds (Discord has field limits)

```python
# Split items into pages
items = list(range(100))
pages = chunk_list(items, 10)  # 10 items per page

for page in pages:
    embed = create_embed(title="Items", fields=[
        {"name": f"Item {i}", "value": str(item), "inline": False}
        for i, item in enumerate(page, 1)
    ])
    await channel.send(embed=embed)
```

---

#### `truncate_string(text: str, max_length: int = 2000, suffix: str = "...") -> str`

Truncate string to max length (useful for Discord message limits).

**Parameters:**
- `text` (str): Text to truncate
- `max_length` (int): Maximum length (default: `2000` - Discord message limit)
- `suffix` (str): Suffix to add if truncated (default: `"..."`)

**Returns:**
- `str`: Truncated string

**Example:**
```python
from utils.helpers import truncate_string

long_text = "A" * 3000
truncated = truncate_string(long_text, max_length=2000)
# "AAA...AAA" (2000 chars total, ends with "...")
```

**Use Case:** Ensuring messages fit Discord's 2000 character limit

```python
message = "Very long message..."
safe_message = truncate_string(message, max_length=2000)
await channel.send(safe_message)
```

---

## 📝 Logger Module

**Location:** `discord-bots/utils/logger.py`  
**Import:** `from utils.logger import setup_logger, get_log_filename`

### Functions

#### `setup_logger(name: str, log_file: str = None, level: str = "INFO") -> logging.Logger`

Set up a logger with console and file handlers.

**Parameters:**
- `name` (str): Logger name (usually `__name__`)
- `log_file` (str): Optional log file path (default: `None` - console only)
- `level` (str): Logging level - `"DEBUG"`, `"INFO"`, `"WARNING"`, `"ERROR"`, `"CRITICAL"` (default: `"INFO"`)

**Returns:**
- `logging.Logger`: Configured logger instance

**Example:**
```python
from utils.logger import setup_logger

# Console only
logger = setup_logger(__name__)

# Console + file
logger = setup_logger(__name__, "logs/bot.log")

# Debug level
logger = setup_logger(__name__, "logs/bot.log", level="DEBUG")

# Use logger
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")
```

**Log Levels:**
- `DEBUG`: Detailed information for debugging
- `INFO`: General informational messages
- `WARNING`: Warning messages (something unexpected but not an error)
- `ERROR`: Error messages (something failed)
- `CRITICAL`: Critical errors (bot might stop working)

---

#### `get_log_filename(bot_name: str) -> str`

Generate a timestamped log filename.

**Parameters:**
- `bot_name` (str): Name of the bot

**Returns:**
- `str`: Log file path (e.g., `"logs/mybot_20251128.log"`)

**Example:**
```python
from utils.logger import setup_logger, get_log_filename

log_file = get_log_filename("mybot")
# "logs/mybot_20251128.log" (date changes daily)

logger = setup_logger(__name__, log_file)
```

---

## ⚙️ Configuration

**Location:** `discord-bots/config/settings.yaml`

### Structure

```yaml
# Bot Settings
bot:
  prefix: "!"                    # Command prefix (for text commands)
  description: "A helpful Discord bot"
  case_insensitive: true         # Case-insensitive commands
  strip_after_prefix: true      # Strip whitespace after prefix

# Embed Colors (hex codes)
colors:
  default: 0x3498db             # Blue
  success: 0x2ecc71             # Green
  error: 0xe74c3c               # Red
  warning: 0xf39c12             # Orange
  info: 0x3498db                # Blue

# Logging
logging:
  level: "INFO"                 # Logging level
  format: "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s"
  date_format: "%Y-%m-%d %H:%M:%S"

# Rate Limits
rate_limits:
  commands_per_user: 5          # Commands per time window
  time_window: 10               # Time window in seconds

# Permissions
permissions:
  admin_roles:
    - "Admin"
    - "Moderator"

# Features (enable/disable)
features:
  auto_moderation: false
  welcome_messages: false
  logging_enabled: true
  slash_commands: true
```

### Usage

```python
from utils.helpers import load_config

# Load config
config = load_config("config/settings.yaml")

# Access values
prefix = config["bot"]["prefix"]
success_color = config["colors"]["success"]
error_color = config["colors"]["error"]

# Use in embeds
embed = create_embed(
    title="Success!",
    color=config["colors"]["success"]
)
```

### Customizing Config

You can create bot-specific config files:

```yaml
# my-bot/config.yaml
bot:
  prefix: "!"
  description: "My custom bot"

colors:
  primary: 0xFF5733
  secondary: 0x33FF57

# Bot-specific settings
my_bot:
  feature_enabled: true
  max_items: 100
```

Load it:

```python
config = load_config("my-bot/config.yaml")
```

---

## 💡 Usage Examples

### Example 1: Basic Command with Embed

```python
from discord import app_commands
from discord.ext import commands
from utils.helpers import create_embed, load_config
from utils.logger import setup_logger

logger = setup_logger(__name__, "logs/bot.log")
config = load_config("config/settings.yaml")

class MyCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="info", description="Get bot info")
    async def info(self, interaction: discord.Interaction):
        embed = create_embed(
            title="Bot Information",
            description="This is my bot!",
            color=config["colors"]["info"],
            fields=[
                {"name": "Version", "value": "1.0.0", "inline": True},
                {"name": "Status", "value": "Online", "inline": True}
            ],
            footer="My Bot",
            timestamp=True
        )
        await interaction.response.send_message(embed=embed)
        logger.info(f"User {interaction.user.id} used /info")
```

### Example 2: Error Handling with Logging

```python
@app_commands.command(name="risky")
async def risky_command(self, interaction: discord.Interaction):
    try:
        # Risky operation
        result = await risky_operation()
        
        embed = create_embed(
            title="Success!",
            description=f"Result: {result}",
            color=config["colors"]["success"]
        )
        await interaction.response.send_message(embed=embed)
        logger.info(f"Risky command succeeded for {interaction.user.id}")
    
    except Exception as e:
        logger.error(f"Error in risky command: {e}", exc_info=True)
        embed = create_embed(
            title="Error",
            description="An error occurred. Please try again later.",
            color=config["colors"]["error"]
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
```

### Example 3: Time Formatting

```python
@app_commands.command(name="uptime")
async def uptime(self, interaction: discord.Interaction):
    uptime_seconds = get_bot_uptime()  # Your function
    
    uptime_str = format_time(uptime_seconds)
    
    embed = create_embed(
        title="Bot Uptime",
        description=f"Bot has been running for: {uptime_str}",
        color=config["colors"]["info"]
    )
    await interaction.response.send_message(embed=embed)
```

### Example 4: Paginated List

```python
@app_commands.command(name="list")
async def list_items(self, interaction: discord.Interaction):
    items = get_all_items()  # Your function
    pages = chunk_list(items, 10)  # 10 items per page
    
    if not pages:
        await interaction.response.send_message("No items found.")
        return
    
    # Send first page
    embed = create_embed(
        title="Items (Page 1)",
        fields=[
            {"name": f"Item {i}", "value": str(item), "inline": False}
            for i, item in enumerate(pages[0], 1)
        ],
        color=config["colors"]["info"]
    )
    await interaction.response.send_message(embed=embed)
    
    # Send remaining pages as followups
    for page_num, page in enumerate(pages[1:], 2):
        embed = create_embed(
            title=f"Items (Page {page_num})",
            fields=[
                {"name": f"Item {i}", "value": str(item), "inline": False}
                for i, item in enumerate(page, 1)
            ],
            color=config["colors"]["info"]
        )
        await interaction.followup.send(embed=embed)
```

### Example 5: Complete Bot Setup

```python
import os
import sys
from dotenv import load_dotenv
import discord
from discord.ext import commands
from utils.helpers import load_config
from utils.logger import setup_logger

# Load config
config = load_config("config/settings.yaml")

# Setup logger
logger = setup_logger(__name__, "logs/bot.log")

# Create bot
intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(
    command_prefix=config["bot"]["prefix"],
    description=config["bot"]["description"],
    intents=intents
)

@bot.event
async def on_ready():
    logger.info(f"{bot.user} has connected to Discord!")
    print(f"✅ {bot.user} is ready!")

@bot.event
async def on_command_error(ctx, error):
    logger.error(f"Command error: {error}", exc_info=True)
    embed = create_embed(
        title="Error",
        description="An error occurred processing your command.",
        color=config["colors"]["error"]
    )
    await ctx.send(embed=embed)

if __name__ == "__main__":
    load_dotenv()
    BOT_TOKEN = os.getenv("DISCORD_TOKEN")
    if not BOT_TOKEN:
        logger.error("DISCORD_TOKEN not found")
        sys.exit(1)
    bot.run(BOT_TOKEN)
```

---

## 🔗 Related Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Framework architecture overview
- **[DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)** - How to build new bots
- **[README.md](README.md)** - User-facing documentation

---

**This reference covers all shared utilities. Use these functions to maintain consistency across all bots!** 🚀
