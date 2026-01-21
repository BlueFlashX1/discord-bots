# GitHub Discord Bot

Comprehensive GitHub tracking bot that monitors repositories, tracks contributions, and provides GitHub statistics.

## Features

- ✅ **Repository Tracking** - Monitor GitHub repos for releases, commits, and updates
- 📊 **Contribution Stats** - Track your GitHub contributions, commits, PRs, and issues
- ⚡ **Activity Feed** - View recent GitHub activity
- 🔔 **Release Notifications** - Get notified when tracked repositories release new versions
- 📈 **Stats Tracking** - View detailed contribution statistics and streaks
- 👤 **User Profiles** - Set and track your GitHub username

## Setup

### 1. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Get GitHub Token

1. Go to <https://github.com/settings/tokens>s>
2. Click "Generate new token (classic)"
3. Select scopes:
   - `public_repo` (for public repository access)
   - `read:user` (for user profile information)
4. Copy the token

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id  # Optional - only needed for faster command syncing
GITHUB_TOKEN=your_github_token  # Optional but recommended
```

### 4. Deploy Commands

```bash
python deploy-commands.py
```

### 5. Start Bot

```bash
python bot.py
```

## Commands

### Repository Tracking

- `/track <repository>` - Track a GitHub repository for updates
  - Example: `/track discord/discord.py`
  - Options:
    - `events` - Events to track (releases, commits, issues)
    - `channel` - Channel to send notifications to (defaults to current channel, autocomplete available)
- `/untrack <repository>` - Stop tracking a repository
- `/tracked` - List all repositories you're tracking

### User Statistics

- `/stats [username]` - Get GitHub contribution statistics
  - Shows commits, PRs, issues, repositories, and streak
  - Defaults to your configured username
- `/activity [username] [limit]` - Get recent GitHub activity
  - Shows recent events and actions
- `/setusername <username>` - Set your GitHub username for stats

## How It Works

1. **Repository Tracking**: Bot checks tracked repositories every 15 minutes for new releases
2. **Contribution Tracking**: Updates contribution stats hourly for all configured users
3. **Notifications**: Sends notifications to channels when new releases are detected
4. **Channel Selection**: Select channels directly via autocomplete in `/track` command - no need to configure channels in environment variables

## GitHub API

The bot uses the GitHub REST API:

- Repository information
- Releases and tags
- User events and activity
- Contribution statistics

**Rate Limits**: GitHub API has rate limits (5000 requests/hour with token, 60 without). The bot respects these limits.

## Data Storage

- `data/tracked_repos.json` - Tracked repositories
- `data/user_config.json` - User GitHub usernames
- `data/repo_updates.json` - Cached repository updates
- `data/contributions.json` - User contribution statistics

## Troubleshooting

**Bot not detecting releases:**

- Ensure GitHub token is set in `.env`
- Check that repository exists and is accessible
- Verify bot has permission to send messages in the channel

**Stats not updating:**

- Set your GitHub username with `/setusername`
- Ensure GitHub token has proper permissions

- Stats update hourly - wait for next check

**API rate limit errors:**

- Use a GitHub token for higher rate limits
- Reduce number of tracked repositories
- Bot automatically respects rate limits

## Notes

- GitHub token is recommended but optional (limited features without it)
- Repository monitoring checks every 15 minutes
- Contribution stats update every hour
- All times are in UTC
