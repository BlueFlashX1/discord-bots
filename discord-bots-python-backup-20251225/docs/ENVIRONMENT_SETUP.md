# Discord Bots - Environment Setup

## ✅ Conda Environment

This project uses your conda base environment located at:

```
/opt/homebrew/Caskroom/miniforge/base
```

## 📦 Installed Dependencies

The following packages are now installed in your conda environment:

- **discord.py 2.6.4** - Discord API wrapper
- **python-dotenv 1.0.0** - Environment variable management
- **aiohttp 3.9.1** - Async HTTP client
- **PyYAML 6.0.3** - YAML configuration parser
- **python-dateutil 2.8.2** - Date/time utilities
- **pytz 2025.2** - Timezone support

## 🚀 Running Bots

All bots will automatically use the conda environment. You can run them directly:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots
python bot.py  # Uses conda's Python automatically
```

Or explicitly:

```bash
/opt/homebrew/Caskroom/miniforge/base/bin/python3 bot.py
```

## 📝 Adding More Dependencies

To add more packages to this environment:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots
pip install package-name
```

The pip command will automatically use your conda environment's pip.

## 🔧 Optional Dependencies

If you want to add music bot capabilities or other features, uncomment the relevant lines in `requirements.txt` and run:

```bash
pip install -r requirements.txt
```

### Music Bot Features

```bash
pip install yt-dlp PyNaCl
```

### Database Support

```bash
pip install SQLAlchemy aiosqlite
```

### Web Scraping

```bash
pip install beautifulsoup4 lxml
```

## ✨ Ready to Build!

Your conda environment is set up and ready for Discord bot development!
