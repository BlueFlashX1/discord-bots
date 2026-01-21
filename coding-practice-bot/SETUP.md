# Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- Python 3 installed (for code validation)
- Discord Bot Token
- Discord Bot Client ID and Guild ID

## Setup Steps

### 1. Install Dependencies

```bash
cd coding-practice-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
AUTO_POST_INTERVAL_HOURS=24
```

**Note**: Codewars API v1 is public and requires no API key. No `CODEFORCES_API_KEY` or `CODEWARS_API_KEY` needed!

### 3. Deploy Commands

```bash
npm run deploy
```

### 4. Start Bot

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Testing

1. Invite bot to your server
2. Use `/problem` to get a problem
3. Submit code with `/submit`
4. Check stats with `/stats`

## Troubleshooting

**Bot doesn't respond:**

- Check bot has proper permissions
- Verify token is correct
- Check bot is online

**Commands not showing:**

- Run `npm run deploy` again
- Wait a few minutes for Discord to update
- Try restarting Discord

**Code validation fails:**

- Ensure Python 3 is installed: `python3 --version`
- Check Python is in PATH
- Verify code syntax is correct

## Next Steps

- See `CODE_SUBMISSION_GUIDE.md` for submission formats
- See `README.md` for full documentation
- Customize problem sources in `services/problemService.js`
