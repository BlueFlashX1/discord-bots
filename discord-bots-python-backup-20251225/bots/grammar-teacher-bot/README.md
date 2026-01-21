# 📚 Grammar Teacher Bot - Complete Documentation

> **Premium AI-Powered Grammar Bot for Discord**  
> Version 2.0 • Last Updated: October 18, 2025

---

## 📖 Table of Contents

1. [Quick Start](#-quick-start)
2. [Features](#-features)
3. [Commands](#-commands)
4. [Configuration](#-configuration)
5. [Customization](#-customization)
6. [Troubleshooting](#-troubleshooting)
7. [Development](#-development)

---

## 🚀 Quick Start

### Installation

1. **Clone/Download** the bot files
2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your bot token:**

   ```bash
   # Create .env file
   echo "BOT_TOKEN_GRAMMAR=your_token_here" > .env
   ```

4. **Run the bot:**
   ```bash
   python bot_auto_detect.py
   ```

### Auto-Startup (macOS)

Enable bot to start automatically on login:

```bash
./manage_startup.sh enable
./manage_startup.sh start
```

**Management commands:**

- `./manage_startup.sh status` - Check if running
- `./manage_startup.sh stop` - Stop the bot
- `./manage_startup.sh restart` - Restart the bot
- `./manage_startup.sh logs` - View output logs
- `./manage_startup.sh errors` - View error logs

---

## ✨ Features

### 1. **Auto-Detection Mode**

- Monitors ALL messages 24/7
- Sends private corrections (only you see them)
- Smart cooldown system (5 min between corrections per user)
- Opt-out available with `/autocheck off`

### 2. **Advanced Grammar Analysis**

- **6 error types detected:**
  - Grammar (subject-verb, tenses)
  - Spelling (comprehensive)
  - Punctuation (periods, commas, etc.)
  - Capitalization ("I", proper nouns)
  - Typography (smart quotes, dashes)
  - Style (clarity, word choice)

### 3. **Sentence Variations**

Get 4 different ways to phrase your message:

- 📘 **Standard (Formal)** - Professional tone
- ✂️ **Concise** - Shorter version
- 💼 **Professional** - Enhanced vocabulary
- ⚡ **Active Voice** - More dynamic

### 4. **Smart Analysis**

- **Tone Detection**: Formal, Casual, Urgent, Polite, Direct
- **Readability Scoring**: Flesch Reading Ease with grade level
- **Context-Aware Tips**: Smart insights based on actual errors

### 5. **Informal Expression Filter**

Automatically ignores 50+ common casual expressions:

- Thinking: hmm, hmmm, umm, uhh
- Laughter: haha, lol, lmao
- Emotions: aww, yay
- Casual: nah, yep, okay
- Abbreviations: brb, btw, imo, tbh
- Contractions: gonna, wanna, gotta

---

## 💬 Commands

### `/autocheck on|off`

Toggle automatic grammar checking.

- **on**: Bot monitors all your messages
- **off**: Manual checks only with `/check`

### `/check <text>`

Manually check grammar with advanced analysis.

- Tone detection
- Readability scoring
- Multiple variations
- Smart insights

### `/stats`

View your grammar statistics.

- Total messages monitored
- Errors found and corrected
- Error patterns
- Improvement trends

---

## ⚙️ Configuration

All settings are in `config.py`. Edit this file to customize behavior.

### Key Settings

```python
# Cooldown between corrections (seconds)
COOLDOWN_SECONDS = 300  # 5 minutes

# Minimum word count for "long sentence" warning
LONG_SENTENCE_THRESHOLD = 20

# Maximum errors to show in detail
MAX_ERRORS_DETAILED = 3

# Maximum suggestions per error
MAX_SUGGESTIONS_PER_ERROR = 4
```

### Adding Informal Expressions

```python
# In config.py, add to INFORMAL_EXPRESSIONS set:
INFORMAL_EXPRESSIONS = {
    'hmm', 'lol', 'brb',
    # Add your custom expressions here:
    'ikr', 'smh', 'fr',
}
```

### Customizing Error Thresholds

```python
# In config.py:
INSIGHT_THRESHOLDS = {
    'capitalization': 2,  # Show tip after 2+ errors
    'punctuation': 2,
    'grammar': 2,
    'spelling': 2,
    'style': 2,
}
```

---

## 🎨 Customization

### Project Structure

```
grammar-teacher-bot/
├── bot_auto_detect.py      # Main bot file
├── config.py               # All settings & rules
├── filters.py              # Error filtering logic
├── analysis.py             # Grammar analysis
├── utils.py                # Data management
├── requirements.txt        # Dependencies
├── manage_startup.sh       # Bot management script
├── .env                    # Bot token (keep secret!)
├── data/                   # User data
│   ├── user_stats.json
│   └── user_settings.json
├── logs/                   # Bot logs
│   ├── bot_output.log
│   └── bot_error.log
└── docs_archive/           # Old documentation
```

### Adding Custom Filtering Rules

Edit `config.py` and modify the `custom_should_ignore()` function:

````python
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    """Add custom filtering rules here."""

    # Example: Ignore errors in code blocks
    if '```' in original_text:
        return True

    # Example: Ignore errors in URLs
    if 'http://' in error_text or 'https://' in error_text:
        return True

    # Add your custom rules here

    return False
````

### Modifying Error Types

Edit `config.py`:

```python
# Add or remove error types to check
IMPORTANT_ERROR_TYPES = [
    "grammar",
    "misspelling",
    "typographical",
    "punctuation",
    "capitalization",
    "style",
    # Add more types here
]
```

### Customizing Messages

Edit `config.py`:

```python
MESSAGES = {
    'auto_correction_title': '✨ Your Custom Title',
    'perfect_title': '🎉 Amazing Writing!',
    'footer_auto': 'Your custom footer message',
}
```

---

## 🔧 Troubleshooting

### Bot Not Starting

**Check Python/Java:**

```bash
python --version  # Should be 3.8+
java -version     # Should be 17+
```

**Check token:**

```bash
cat .env  # Verify token is correct
```

**Check logs:**

```bash
./manage_startup.sh errors
```

### Slash Commands Not Showing

**Issue:** Commands not visible in Discord

**Fix:** Bot needs `applications.commands` scope

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to OAuth2 → URL Generator
4. Select scopes: `bot` AND `applications.commands`
5. Select permissions needed
6. Use generated URL to re-invite bot

### LanguageTool Errors

**Issue:** Grammar checking not working

**Fix:**

```bash
# Reinstall language-tool-python
pip uninstall language-tool-python
pip install language-tool-python

# Verify Java 17+
java -version
```

### Bot Running But Not Responding

**Check auto-check status:**

```
/autocheck on
```

**Check cooldown:**

- Bot has 5-minute cooldown per user
- Wait 5 minutes or check `/stats`

**Check bot permissions:**

- Bot needs permission to read messages
- Bot needs permission to send messages
- Bot needs permission to add reactions

---

## 👨‍💻 Development

### Making Changes

1. **Edit configuration** in `config.py` (easiest)
2. **Modify filtering** in `filters.py`
3. **Enhance analysis** in `analysis.py`
4. **Update data management** in `utils.py`
5. **Change bot behavior** in `bot_auto_detect.py`

### Testing Changes

```bash
# Stop the bot
./manage_startup.sh stop

# Make your changes

# Restart the bot
./manage_startup.sh start

# Check if working
./manage_startup.sh status

# View logs
./manage_startup.sh logs
```

### Adding New Features

**Example: Add new error type**

1. Edit `config.py`:

```python
IMPORTANT_ERROR_TYPES = [
    # ... existing types ...
    "my_new_type",  # Add new type
]
```

2. Test in Discord

3. If needed, add custom handling in `filters.py`

**Example: Add new sentence variation**

Edit `analysis.py` in `generate_sentence_variations()`:

```python
# Add your variation logic
if some_condition:
    variations.append({
        "title": "🌟 My Variation",
        "text": modified_text,
        "description": "Description of variation"
    })
```

### File Organization

**When to edit each file:**

- **config.py** - Settings, rules, thresholds, messages
- **filters.py** - What errors to show/hide
- **analysis.py** - How to analyze grammar
- **utils.py** - Data storage and retrieval
- **bot_auto_detect.py** - Main bot logic and Discord integration

---

## 📊 Data Files

### User Statistics (`data/user_stats.json`)

```json
{
  "user_id": {
    "auto_corrections": 10,
    "manual_checks": 5,
    "errors_found": 25,
    "messages_monitored": 100,
    "error_patterns": {...},
    "error_history": [...]
  }
}
```

### User Settings (`data/user_settings.json`)

```json
{
  "user_id": {
    "auto_check": true
  }
}
```

**Note:** Data files are automatically created and managed.

---

## 🎯 Best Practices

### For Users

1. **Use `/autocheck`** to toggle auto-checking on/off
2. **Use `/check`** for manual analysis of specific text
3. **Review `/stats`** regularly to track improvement
4. **Dismiss** corrections you don't need
5. **Provide feedback** for better filtering

### For Developers

1. **Always edit `config.py` first** for simple changes
2. **Test changes** before deploying
3. **Check logs** for errors
4. **Back up** `data/` folder before major changes
5. **Document** new features

---

## 📝 Quick Reference

### Common Tasks

| Task              | Command                                   |
| ----------------- | ----------------------------------------- |
| Start bot         | `./manage_startup.sh start`               |
| Stop bot          | `./manage_startup.sh stop`                |
| Restart bot       | `./manage_startup.sh restart`             |
| Check status      | `./manage_startup.sh status`              |
| View logs         | `./manage_startup.sh logs`                |
| Add informal word | Edit `config.py` → `INFORMAL_EXPRESSIONS` |
| Change cooldown   | Edit `config.py` → `COOLDOWN_SECONDS`     |
| Modify thresholds | Edit `config.py` → `INSIGHT_THRESHOLDS`   |

### File Quick Reference

| File                 | Purpose          | Edit Frequency |
| -------------------- | ---------------- | -------------- |
| `config.py`          | Settings & rules | Often          |
| `filters.py`         | Error filtering  | Sometimes      |
| `analysis.py`        | Grammar analysis | Rarely         |
| `utils.py`           | Data management  | Rarely         |
| `bot_auto_detect.py` | Main bot         | Rarely         |

---

## 🆘 Getting Help

### Error Messages

**"command not found: python"**

- Install Python 3.8+ or use `python3`

**"Java version too old"**

- Install Java 17+ via Homebrew

**"Bot token invalid"**

- Check `.env` file for correct token

**"Permission denied"**

- Run `chmod +x manage_startup.sh`

### Resources

- [Discord.py Documentation](https://discordpy.readthedocs.io/)
- [LanguageTool](https://languagetool.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🎉 Features Summary

✅ **Auto-Detection** - 24/7 monitoring  
✅ **6 Error Types** - Comprehensive checking  
✅ **Smart Filtering** - Ignores informal expressions  
✅ **Sentence Variations** - 4 different phrasings  
✅ **Tone Analysis** - Detects message tone  
✅ **Readability Scoring** - Grade level assessment  
✅ **Context-Aware Tips** - Smart insights  
✅ **Privacy-First** - Only you see corrections  
✅ **Easy Customization** - Simple config file  
✅ **Auto-Startup** - macOS LaunchAgent support

---

**Version:** 2.0 Premium  
**Status:** ✅ Active  
**Last Updated:** October 18, 2025

**Enjoy your premium grammar bot!** 🚀
