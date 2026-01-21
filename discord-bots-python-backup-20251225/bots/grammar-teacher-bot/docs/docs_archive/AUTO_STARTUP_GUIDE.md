# 🚀 Auto-Startup Guide for Grammar Teacher Bot

## Quick Start

The bot can now automatically start when you log in to your Mac!

### Commands

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Enable automatic startup on login
./manage_startup.sh enable

# Disable automatic startup
./manage_startup.sh disable

# Start the bot manually
./manage_startup.sh start

# Stop the bot
./manage_startup.sh stop

# Restart the bot
./manage_startup.sh restart

# Check if bot is running
./manage_startup.sh status

# View bot logs
./manage_startup.sh logs

# View error logs
./manage_startup.sh errors
```

## What Was Set Up

### 1. LaunchAgent Configuration
- **File**: `~/Library/LaunchAgents/com.user.grammar-teacher-bot.plist`
- **Purpose**: macOS LaunchAgent that manages automatic startup
- **Features**:
  - Starts bot automatically on login (`RunAtLoad`)
  - Keeps bot alive (restarts if it crashes)
  - Logs all output to files
  - Sets correct Java 17 environment

### 2. Log Files
- **Output Log**: `logs/bot_output.log` - Normal bot messages
- **Error Log**: `logs/bot_error.log` - Error messages and warnings

### 3. Management Script
- **File**: `manage_startup.sh`
- **Purpose**: Easy-to-use script for controlling the bot

## Requirements Installed

✅ **Java 17** - Required for LanguageTool grammar checking
- Installed via Homebrew: `temurin@17`
- Location: `/Library/Java/JavaVirtualMachines/temurin-17.jdk`

✅ **Python 3.12.11** - From conda miniforge
- Location: `/opt/homebrew/Caskroom/miniforge/base/bin/python`

✅ **All Python packages** - Verified installed
- discord.py 2.6.4
- language-tool-python 2.9.4
- python-dotenv 1.0.0
- textstat 0.7.10
- nltk 3.9.2

## How to Enable Auto-Startup

### Option 1: Using the Management Script (Recommended)

```bash
./manage_startup.sh enable
```

This will:
1. Load the LaunchAgent
2. Start the bot immediately
3. Configure it to start on every login

### Option 2: Manual LaunchAgent Control

```bash
# Enable (load the agent)
launchctl load ~/Library/LaunchAgents/com.user.grammar-teacher-bot.plist

# Disable (unload the agent)
launchctl unload ~/Library/LaunchAgents/com.user.grammar-teacher-bot.plist
```

## Checking Bot Status

### Quick Check
```bash
./manage_startup.sh status
```

### Manual Check
```bash
# Check if bot process is running
launchctl list | grep grammar-teacher-bot

# Or check Python processes
ps aux | grep bot_auto_detect.py
```

## Viewing Logs

### Using Management Script
```bash
# View normal output
./manage_startup.sh logs

# View errors
./manage_startup.sh errors
```

### Manual Log Access
```bash
# Live output (follow mode)
tail -f logs/bot_output.log

# Live errors
tail -f logs/bot_error.log

# Last 50 lines
tail -n 50 logs/bot_output.log
```

## Troubleshooting

### Bot Won't Start
1. Check error logs: `./manage_startup.sh errors`
2. Verify Java 17 is installed: `java -version` (should show 17.x)
3. Check token is in .env file: `cat .env`
4. Manually test: 
   ```bash
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
   /opt/homebrew/Caskroom/miniforge/base/bin/python bot_auto_detect.py
   ```

### Bot Keeps Crashing
1. View error logs: `./manage_startup.sh errors`
2. Check if Discord token is valid (may have been reset)
3. Disable auto-restart temporarily:
   ```bash
   ./manage_startup.sh disable
   # Test manually to see errors
   ```

### Bot Not Starting on Login
1. Check LaunchAgent is loaded:
   ```bash
   launchctl list | grep grammar-teacher-bot
   ```
2. Re-enable if needed:
   ```bash
   ./manage_startup.sh disable
   ./manage_startup.sh enable
   ```

### Java Version Issues
Make sure Java 17 is being used:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
java -version  # Should show 17.x
```

## First Run Notes

When the bot runs for the first time:
1. ✅ Java 17 installed successfully
2. ⏳ LanguageTool will download (254MB) - takes 1-2 minutes
3. ⚠️ "PyNaCl is not installed" warning is **NORMAL** (voice features not needed)
4. ✅ Bot will connect to Discord once download completes

## What Happens on Login

When you log in to your Mac:
1. macOS loads the LaunchAgent automatically
2. LaunchAgent starts the bot in the background
3. Bot connects to Discord
4. All output is logged to `logs/` folder
5. If bot crashes, it automatically restarts

## Disabling Auto-Startup

If you want to stop the bot from starting automatically:

```bash
./manage_startup.sh disable
```

This keeps the LaunchAgent file but stops it from running.

## Complete Removal

To completely remove auto-startup:

```bash
# 1. Unload the agent
./manage_startup.sh disable

# 2. Remove the plist file (optional)
rm ~/Library/LaunchAgents/com.user.grammar-teacher-bot.plist
```

## Summary

🎯 **To enable**: `./manage_startup.sh enable`  
🛑 **To disable**: `./manage_startup.sh disable`  
📊 **To check status**: `./manage_startup.sh status`  
📝 **To view logs**: `./manage_startup.sh logs`

The bot is now ready to run 24/7 and will automatically start whenever you log in! 🚀
