# Grammar Teacher Bot - Directory Structure

## 📁 Project Structure

```
grammar-teacher-bot/
├── main.py                 # Main entry point (start here)
├── manage_startup.sh       # Bot management script
├── requirements.txt        # Python dependencies
├── .env                   # Environment variables (secrets)
├── README.md              # Main documentation
│
├── src/                   # Source code
│   ├── ai/               # AI-powered features
│   │   ├── ai_grammar.py      # GPT-4o-mini grammar checking
│   │   ├── ai_stats.py        # AI-powered statistics analysis
│   │   └── budget_monitor.py  # API budget tracking ($10 limit)
│   │
│   ├── core/             # Core bot functionality
│   │   ├── bot_auto_detect.py # Main bot logic & commands
│   │   ├── config.py          # Bot configuration
│   │   ├── analysis.py        # Readability & tone analysis
│   │   └── filters.py         # Message filtering rules
│   │
│   └── utils/            # Utility functions
│       └── utils.py           # Helper functions & stats
│
├── data/                  # Bot data storage
│   ├── user_stats.json        # User statistics
│   └── budget_tracking.json   # API spending tracker
│
├── logs/                  # Log files
│   ├── bot_output.log         # Standard output
│   └── bot_error.log          # Error logs
│
├── docs/                  # Documentation
│   ├── CHANGELOG.md           # Version history
│   ├── CUSTOMIZATION.md       # How to customize
│   └── AI_MIGRATION.md        # AI migration guide
│
├── scripts/              # Utility scripts
│   ├── setup.sh               # Initial setup
│   ├── verify_setup.py        # Verify installation
│   └── force_sync_commands.py # Force Discord command sync
│
└── backups/              # Backup files
    └── *.bak                  # Old versions

```

## 🚀 Quick Start

### Starting the Bot

```bash
# Using the management script (recommended)
./manage_startup.sh start

# Or directly
python3 main.py
```

### Managing the Bot

```bash
./manage_startup.sh restart    # Restart bot
./manage_startup.sh stop       # Stop bot
./manage_startup.sh status     # Check status
./manage_startup.sh logs       # View logs
./manage_startup.sh errors     # View errors
```

## 📦 Key Components

### AI Features (`src/ai/`)

- **`ai_grammar.py`**: Uses GPT-4o-mini to check grammar

  - Detects 10+ types of errors
  - Provides corrected versions
  - Generates alternative phrasings

- **`ai_stats.py`**: AI-powered writing analysis

  - Personalized recommendations
  - Pattern detection
  - Improvement tracking

- **`budget_monitor.py`**: Prevents overspending
  - $10 monthly limit
  - Auto-suspend when reached
  - Cost tracking per request

### Core Bot (`src/core/`)

- **`bot_auto_detect.py`**: Main bot file (1000+ lines)

  - Auto-detection engine
  - `/check`, `/stats`, `/budget`, `/autocheck` commands
  - Dismiss buttons & auto-check disable

- **`config.py`**: All customizable settings
  - Informal expressions whitelist
  - Cooldown times
  - Filter rules

### Utilities (`src/utils/`)

- **`utils.py`**: Helper functions
  - User statistics tracking
  - Error pattern analysis
  - JSON data management

## 🔧 Configuration

All settings are in `src/core/config.py`:

```python
# Cooldown between corrections
COOLDOWN_SECONDS = 0  # Instant (no delay)

# Informal expressions to ignore
INFORMAL_EXPRESSIONS = {
    "hmm", "haha", "lol", ...
}
```

## 📊 Data Files

- **`data/user_stats.json`**: User statistics

  - Messages monitored
  - Errors found
  - Accuracy rate
  - Error patterns

- **`data/budget_tracking.json`**: API spending
  - Current month costs
  - Request count
  - Suspended status

## 🐛 Troubleshooting

### Bot won't start

```bash
# Check logs
./manage_startup.sh errors

# Verify setup
python3 scripts/verify_setup.py

# Check if already running
./manage_startup.sh status
```

### Commands not appearing in Discord

```bash
# Force sync commands (takes up to 1 hour globally)
python3 scripts/force_sync_commands.py
```

### Budget exceeded

Edit `data/budget_tracking.json`:

```json
{
  "suspended": false,
  "total_cost": 0.0
}
```

## 📝 Development

### Adding New Features

1. **New AI feature**: Add to `src/ai/`
2. **New command**: Add to `src/core/bot_auto_detect.py`
3. **New utility**: Add to `src/utils/utils.py`

### Testing

```bash
# Test bot locally
python3 main.py

# Check grammar detection
python3 -c "
from src.ai.ai_grammar import check_grammar_ai
result = check_grammar_ai('Me and him was going')
print(result)
"
```

## 🔐 Environment Variables

Required in `.env`:

```bash
BOT_TOKEN_GRAMMAR=<your-discord-bot-token>
OPENAI_API_KEY=sk-proj-<your-openai-key>
OPENAI_MAX_BUDGET=10.0
```

## 📦 Dependencies

Install via:

```bash
pip install -r requirements.txt
```

Key packages:

- `discord.py` >= 2.3.0
- `openai` == 1.109.1 # Specific version for stability
- `python-dotenv`
- `textstat`

## 🎯 Key Features

✅ Auto-detection (monitors all messages)  
✅ AI-powered grammar checking (GPT-4o-mini)  
✅ Budget protection ($10/month limit)  
✅ Personalized statistics & recommendations  
✅ Dismissable corrections  
✅ Opt-out system  
✅ Clean reaction removal

## 📄 License

MIT License - See main README for details
