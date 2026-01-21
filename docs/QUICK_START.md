# 🚀 Quick Start Guide - Discord Bots Migration

## Phase 0 Setup: ✅ COMPLETE

### What We Built

**Spelling Bee Bot** - Node.js/Discord.js v14 foundation is ready!

```
spelling-bee-bot/
├── 📁 commands/       → Slash commands
├── 📁 events/         → Discord event handlers
├── 📁 utils/          → Helper functions
├── 📁 database/       → Data models (ready for Phase 1)
├── 📁 scripts/        → Migration tools (ready for Phase 1)
├── 📁 data/           → Player data storage
├── 📁 logs/           → Bot logs
├── 🔧 index.js        → Main bot entry point
├── 🔧 config.json     → Bot settings
└── 📝 README.md       → Full documentation
```

---

## ⚡ How to Run the Bot

### 1. Set Up Environment Variables

```bash
cd ~/Documents/DEVELOPMENT/discord-bots-node/spelling-bee-bot
cp .env.example .env
```

**Edit `.env` with your tokens:**
- `DISCORD_TOKEN` - From Discord Developer Portal
- `CLIENT_ID` - Your bot's application ID
- `GUILD_ID` - Your test server ID (optional)
- `OPENAI_API_KEY` - Your OpenAI API key

### 2. Deploy Slash Commands

```bash
npm run deploy
```

### 3. Start the Bot

```bash
npm start
```

### 4. Test It

In Discord, type: `/ping`

You should see a response with latency info!

---

## 📊 What's Next?

### Phase 1: Implement Game Logic (Weeks 2-3)

**Commands to build:**
1. `/spelling` - Start spelling challenge
2. `/mystats` - View player statistics
3. `/leaderboard` - Top players

**Files to create:**
- `commands/spelling.js`
- `commands/mystats.js`
- `commands/leaderboard.js`
- `utils/wordGenerator.js` (OpenAI integration)
- `database/models/Player.js`
- `database/models/Session.js`
- `scripts/migrate-spelling-bee.js`

**Reference Python implementation:**
```bash
~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/spelling-bee-bot/
```

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| [index.js](spelling-bee-bot/index.js) | Bot startup, loads commands/events |
| [config.json](spelling-bee-bot/config.json) | Colors, game settings, rate limits |
| [utils/embedBuilder.js](spelling-bee-bot/utils/embedBuilder.js) | Create beautiful Discord embeds |
| [deploy-commands.js](spelling-bee-bot/deploy-commands.js) | Register slash commands |

---

## 📚 Documentation

- **Full Migration Plan:** `~/.claude/plans/majestic-skipping-rocket.md`
- **Setup Summary:** `MIGRATION_SETUP.md`
- **Bot README:** `spelling-bee-bot/README.md`

---

## 💾 Backups

Your Python bots are safely backed up:

- **Full backup:** `discord-bots-python-backup-20251225/`
- **Data backup:** `discord-bots-data-20251225.tar.gz`

Python bots are still running - don't deactivate yet!

---

## 🛠️ Useful Commands

```bash
# Navigate to project
cd ~/Documents/DEVELOPMENT/discord-bots-node/spelling-bee-bot

# Install new package
npm install package-name

# Deploy commands (after adding new ones)
npm run deploy

# Start bot
npm start

# View logs
tail -f logs/*.log

# Check git status
git status
```

---

## 🎯 Current Status

✅ Environment setup complete
✅ Bot structure created
✅ Can connect to Discord
✅ Slash commands working
✅ Git repository initialized

**Next:** Implement spelling game logic!

---

## 🐛 Troubleshooting

**Bot won't start:**
- Check `.env` file exists and has correct tokens
- Run `npm install` to ensure dependencies are installed

**Commands not showing:**
- Run `npm run deploy` first
- Check `CLIENT_ID` and `GUILD_ID` in `.env`
- Wait a few seconds after deploying

**"Missing Permissions" error:**
- Reinvite bot with `applications.commands` scope
- Check bot has proper role in your server

---

**Ready to code? Let's build the spelling game! 🎮**
