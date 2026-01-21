# Discord Bots Framework - Architecture

**Last Updated:** November 28, 2025  
**Purpose:** Developer-focused architecture documentation for the Discord bots framework

---

## 🏗️ Framework Overview

The Discord bots framework is a **modular, shared-utilities-based** system for building Discord bots. It provides:

- **Shared utilities** (`utils/`) - Common functions for all bots
- **Shared configuration** (`config/`) - Centralized configuration
- **Common patterns** - Standardized bot structure and patterns
- **Reusable components** - AI integration, gamification, logging

---

## 📁 Directory Structure

```
discord-bots/
├── README.md                 # User-facing documentation
├── requirements.txt          # Shared Python dependencies
├── ARCHITECTURE.md          # This file (developer architecture)
├── DEVELOPMENT-GUIDE.md     # How to build new bots
├── SHARED-UTILITIES.md      # Utils and config reference
│
├── config/                  # Shared configuration
│   └── settings.yaml       # Centralized bot settings
│
├── utils/                   # Shared utilities (used by all bots)
│   ├── __init__.py
│   ├── helpers.py          # Helper functions (embeds, time, etc.)
│   └── logger.py          # Logging utilities
│
└── bots/                    # Individual bot projects
    ├── README.md           # Bot structure template
    ├── grammar-teacher-bot/
    ├── hangman-bot/
    └── spelling-bee-bot/
```

---

## 🔧 Core Components

### 1. Shared Utilities (`utils/`)

**Location:** `discord-bots/utils/`

**Purpose:** Common functions used across all bots

#### `helpers.py`
- **`load_config()`** - Load YAML configuration files
- **`create_embed()`** - Create Discord embeds with common formatting
- **`format_time()`** - Format seconds into human-readable time
- **`parse_time()`** - Parse time strings into seconds
- **`chunk_list()`** - Split lists into chunks
- **`truncate_string()`** - Truncate strings for Discord limits

#### `logger.py`
- **`setup_logger()`** - Set up logger with console and file handlers
- **`get_log_filename()`** - Generate timestamped log filenames

**Usage Example:**
```python
from utils.helpers import load_config, create_embed
from utils.logger import setup_logger

# Load shared config
config = load_config("config/settings.yaml")

# Create embed
embed = create_embed(
    title="Hello",
    description="World",
    color=config["colors"]["success"]
)

# Setup logger
logger = setup_logger(__name__, "logs/bot.log")
```

---

### 2. Shared Configuration (`config/`)

**Location:** `discord-bots/config/settings.yaml`

**Purpose:** Centralized configuration for all bots

**Structure:**
```yaml
bot:
  prefix: "!"
  description: "A helpful Discord bot"
  case_insensitive: true
  strip_after_prefix: true

colors:
  default: 0x3498db
  success: 0x2ecc71
  error: 0xe74c3c
  warning: 0xf39c12
  info: 0x3498db

logging:
  level: "INFO"
  format: "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s"
  date_format: "%Y-%m-%d %H:%M:%S"

rate_limits:
  commands_per_user: 5
  time_window: 10  # seconds

permissions:
  admin_roles:
    - "Admin"
    - "Moderator"

features:
  auto_moderation: false
  welcome_messages: false
  logging_enabled: true
  slash_commands: true
```

**Usage:**
```python
from utils.helpers import load_config

config = load_config("config/settings.yaml")
prefix = config["bot"]["prefix"]
success_color = config["colors"]["success"]
```

---

## 🤖 Bot Structure Pattern

All bots follow a **standardized structure**:

```
bot-name/
├── main.py                 # Entry point (or bot.py)
├── requirements.txt        # Bot-specific dependencies
├── README.md              # Bot-specific documentation
├── .env                   # Environment variables (secrets)
│
├── src/                   # Source code
│   ├── __init__.py
│   ├── core/              # Core bot functionality
│   │   ├── __init__.py
│   │   ├── bot.py         # Main bot logic
│   │   ├── config.py      # Bot-specific config
│   │   └── views.py       # Discord UI (buttons, modals)
│   │
│   ├── ai/                # AI integration (if used)
│   │   ├── __init__.py
│   │   └── ai_service.py  # OpenAI/other AI services
│   │
│   ├── gamification/      # Gamification features (if used)
│   │   ├── __init__.py
│   │   ├── points.py      # Points system
│   │   └── shop.py        # Shop system
│   │
│   └── utils/             # Bot-specific utilities
│       ├── __init__.py
│       └── helpers.py     # Bot-specific helpers
│
├── data/                  # Bot data storage
│   └── *.json            # JSON data files
│
├── logs/                  # Log files
│   ├── bot.log
│   └── bot.error.log
│
├── docs/                  # Bot-specific documentation
│   └── *.md
│
└── tests/                 # Tests (optional)
    └── test_*.py
```

---

## 🎯 Common Patterns

### 1. Bot Initialization Pattern

```python
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
intents.message_content = True  # If needed

bot = commands.Bot(
    command_prefix=config["bot"]["prefix"],
    description=config["bot"]["description"],
    intents=intents
)

@bot.event
async def on_ready():
    logger.info(f"{bot.user} has connected to Discord!")

# Load cogs/commands
# ...

bot.run(os.getenv("DISCORD_TOKEN"))
```

---

### 2. Slash Commands Pattern

```python
from discord import app_commands
from discord.ext import commands

class MyCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="command", description="Command description")
    @app_commands.describe(param="Parameter description")
    async def my_command(
        self,
        interaction: discord.Interaction,
        param: str
    ):
        await interaction.response.send_message(f"You said: {param}")

async def setup(bot):
    await bot.add_cog(MyCog(bot))
```

---

### 3. Embed Creation Pattern

```python
from utils.helpers import create_embed, load_config

config = load_config("config/settings.yaml")

embed = create_embed(
    title="Success!",
    description="Operation completed",
    color=config["colors"]["success"],
    fields=[
        {"name": "Field 1", "value": "Value 1", "inline": True},
        {"name": "Field 2", "value": "Value 2", "inline": True}
    ],
    footer="Bot Name",
    timestamp=True
)

await interaction.response.send_message(embed=embed)
```

---

### 4. Logging Pattern

```python
from utils.logger import setup_logger

logger = setup_logger(__name__, "logs/bot.log")

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")
```

---

### 5. AI Integration Pattern

```python
# src/ai/ai_service.py
import openai
from utils.logger import setup_logger

logger = setup_logger(__name__)

class AIService:
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
    
    async def generate_response(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"AI error: {e}")
            raise
```

---

### 6. Gamification Pattern

```python
# src/gamification/points.py
import json
from pathlib import Path

class PointsSystem:
    def __init__(self, data_file: str = "data/points.json"):
        self.data_file = Path(data_file)
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        self.points = self._load_points()
    
    def _load_points(self) -> dict:
        if self.data_file.exists():
            with open(self.data_file, "r") as f:
                return json.load(f)
        return {}
    
    def add_points(self, user_id: int, amount: int):
        user_id = str(user_id)
        if user_id not in self.points:
            self.points[user_id] = 0
        self.points[user_id] += amount
        self._save_points()
    
    def _save_points(self):
        with open(self.data_file, "w") as f:
            json.dump(self.points, f, indent=2)
```

---

## 🔄 Data Flow

### Command Execution Flow

```
User sends command
    ↓
Discord API receives message
    ↓
Bot's command handler processes
    ↓
Load config (if needed)
    ↓
Execute command logic
    ↓
Use shared utilities (helpers, logger)
    ↓
Create response (embed, message)
    ↓
Send response to Discord
    ↓
Log action (if enabled)
```

### AI Integration Flow

```
User triggers AI feature
    ↓
Bot receives command/interaction
    ↓
Load AI service
    ↓
Prepare prompt
    ↓
Call OpenAI API (async)
    ↓
Process response
    ↓
Format for Discord
    ↓
Send response
    ↓
Log API usage (if tracking)
```

---

## 🔌 Integration Points

### 1. Shared Utilities Integration

**All bots can use:**
- `utils/helpers.py` - Helper functions
- `utils/logger.py` - Logging utilities
- `config/settings.yaml` - Shared configuration

**Import pattern:**
```python
from utils.helpers import load_config, create_embed
from utils.logger import setup_logger
```

### 2. Bot-Specific Code

**Each bot has:**
- Own `src/` directory with bot-specific code
- Own `data/` directory for bot data
- Own `logs/` directory for bot logs
- Own `requirements.txt` for bot-specific dependencies

### 3. Environment Variables

**Each bot needs:**
- `DISCORD_TOKEN` - Discord bot token
- `OPENAI_API_KEY` - OpenAI API key (if using AI)
- Other bot-specific environment variables

---

## 🎨 Design Principles

### 1. **Separation of Concerns**
- Shared utilities in `utils/`
- Bot-specific code in `bots/bot-name/src/`
- Configuration in `config/` (shared) or bot-specific

### 2. **Reusability**
- Common functions in shared utilities
- Common patterns documented
- Bot structure template provided

### 3. **Modularity**
- Each bot is independent
- Shared utilities are optional (but recommended)
- Bot-specific code doesn't affect other bots

### 4. **Consistency**
- Standardized bot structure
- Common logging patterns
- Common embed formatting
- Common error handling

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│         Discord Bots Framework          │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Shared     │  │   Shared     │   │
│  │   Utils      │  │   Config     │   │
│  │  (helpers,   │  │  (settings.  │   │
│  │   logger)    │  │   yaml)      │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                 │           │
│         └────────┬─────────┘           │
│                  │                     │
│         ┌────────▼─────────┐          │
│         │   Bot Projects   │          │
│         ├──────────────────┤          │
│         │                  │          │
│    ┌────▼────┐  ┌────▼────┐          │
│    │ Grammar │  │ Hangman │          │
│    │  Bot    │  │   Bot   │          │
│    └─────────┘  └─────────┘          │
│         │            │                │
│         └─────┬──────┘                │
│               │                        │
│         ┌─────▼─────┐                 │
│         │  Discord  │                 │
│         │    API    │                 │
│         └───────────┘                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### 1. **Environment Variables**
- Never commit `.env` files
- Use environment variables for all secrets
- Store tokens securely

### 2. **API Keys**
- Use environment variables for API keys
- Monitor API usage (budget tracking)
- Implement rate limiting

### 3. **Permissions**
- Use Discord permissions system
- Check user roles before sensitive operations
- Validate input from users

---

## 🚀 Performance Considerations

### 1. **Async Operations**
- Use `async/await` for I/O operations
- Use `discord.ext.commands` async support
- Use async HTTP clients (aiohttp)

### 2. **Caching**
- Cache frequently accessed data
- Cache API responses when appropriate
- Use in-memory caching for performance

### 3. **Rate Limiting**
- Respect Discord rate limits
- Implement bot-side rate limiting
- Use cooldowns for commands

---

## 📝 Next Steps

1. **Read DEVELOPMENT-GUIDE.md** - Learn how to build new bots
2. **Read SHARED-UTILITIES.md** - Reference for shared utilities
3. **Review existing bots** - See patterns in action
4. **Build your bot** - Use the framework to create new bots

---

**This architecture supports:**
- ✅ Multiple independent bots
- ✅ Shared utilities and configuration
- ✅ Consistent patterns and structure
- ✅ Easy bot creation and maintenance
- ✅ Scalable and modular design
