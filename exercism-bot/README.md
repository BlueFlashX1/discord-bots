# Exercism Discord Bot

Discord bot that integrates with Exercism CLI to deliver daily coding problems, track progress, and manage submissions.

## Features

- ✅ **Daily Problems** - Get a new coding problem delivered to Discord daily
- 📥 **Download Exercises** - Fetch exercises directly from Exercism using CLI
- 📤 **Submit Solutions** - Submit your solutions via Discord
- 📊 **Progress Tracking** - Track your Exercism progress
- 🎯 **Track Management** - Switch between programming language tracks
- 📝 **Exercise Info** - Get detailed exercise information and instructions

## Setup

### 1. Install Exercism CLI

```bash
# macOS
brew install exercism

# Or download from https://exercism.org/cli-walkthrough
```

### 2. Configure Exercism CLI

```bash
exercism configure --token=YOUR_EXERCISM_API_TOKEN
```

Get your token from: https://exercism.org/settings/api_cli

### 3. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
EXERCISM_WORKSPACE=~/exercism  # Default Exercism workspace
```

### 5. Deploy Commands

```bash
python deploy-commands.py
```

### 6. Start Bot

```bash
python bot.py
```

## Commands

- `/fetch [exercise] [track]` - Download an exercise from Exercism
- `/daily [track]` - Get today's recommended exercise
- `/submit [file]` - Submit a solution file
- `/progress [track]` - View your Exercism progress
- `/tracks` - List available programming tracks
- `/exercise [exercise] [track]` - Get exercise information
- `/workspace` - Show your Exercism workspace location

## How It Works

1. **Fetch Exercise**: Uses Exercism CLI to download exercises locally
2. **Daily Problems**: Sends a new problem each day (configurable)
3. **Submit Solutions**: Uses CLI to submit your code files
4. **Progress Tracking**: Reads CLI output to track your progress

## Exercism CLI Integration

The bot uses the Exercism CLI as a bridge for all operations:

- `exercism download --exercise=NAME --track=TRACK` - Download exercises
- `exercism submit FILE` - Submit solutions
- `exercism workspace` - Get workspace location
- `exercism whoami` - Get user info

## Data Storage

- `data/exercises.json` - Downloaded exercises tracking
- `data/progress.json` - User progress cache
- `data/submissions.json` - Submission history

## Troubleshooting

**CLI not found:**
- Install Exercism CLI: `brew install exercism`
- Verify installation: `exercism version`
- Check PATH includes exercism binary

**Authentication errors:**
- Configure CLI: `exercism configure --token=YOUR_TOKEN`
- Get token from: https://exercism.org/settings/api_cli

**Exercise download fails:**
- Verify exercise name and track are correct
- Check internet connection
- Ensure CLI is authenticated

## Notes

- Requires Exercism CLI to be installed and configured
- Exercises are downloaded to your Exercism workspace
- Bot tracks exercises but doesn't store solution files
- Daily problems are randomized from available exercises
