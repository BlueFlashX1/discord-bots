# Starboard & Todoist Bot Status

## Starboard Bot

### Issue: Commands Not Showing

**Root Cause**: Bot requires **Privileged Intents** to be enabled in Discord Developer Portal.

**Status**: 
- ✅ Commands synced (3 commands available)
- ⚠️ Bot running but needs intents enabled
- ⚠️ Bot will crash on message/reaction events until intents enabled

**Fix Required**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select bot application (Client ID: 1464874736537305100)
3. Go to **Bot** → **Privileged Gateway Intents**
4. Enable:
   - ✅ **MESSAGE CONTENT INTENT** (Required)
   - ✅ **SERVER MEMBERS INTENT** (Optional)
5. Save changes
6. Restart bot: `pm2 restart starboard-bot`

**Commands Available** (once intents enabled):
- `/starboard-set-channel` - Set forum channel
- `/starboard-set-threshold` - Set star threshold  
- `/starboard-config` - View configuration

**See**: `starboard-bot/INTENTS-SETUP.md` for detailed instructions

---

## Todoist Bot

### Issue: Constant Restarts (148+ restarts)

**Root Cause**: Syntax error in `commands/create.js` - duplicate `projectName` declaration

**Status**:
- ✅ Fixed on VPS (synced from local)
- ✅ Bot restarted
- ⏳ Monitoring for stability

**What Was Fixed**:
- Changed `let projectName = null;` to use `finalProjectName` variable
- Synced local version to VPS
- Restarted bot

**Next Steps**:
- Monitor bot for 5-10 minutes to ensure it stays online
- Check logs: `pm2 logs todoist-bot --lines 50`

---

## Todoist Bot: Keep or Remove?

### Analysis

**Discord Bot Features**:
- ✅ Create/complete/delay tasks from Discord
- ✅ Daily @mentions for tasks due today
- ✅ Real-time sync with Todoist
- ✅ Team collaboration (share tasks in channels)

**macOS Widget Features**:
- ✅ Shows today's tasks
- ✅ Reminders/notifications
- ✅ View-only (no task management)

### Recommendation

**Keep the bot IF**:
- You want to manage tasks from Discord (without opening Todoist app)
- You want team collaboration features
- You use Discord frequently for task management

**Remove the bot IF**:
- You only need reminders (widget is sufficient)
- You prefer managing tasks in Todoist app directly
- You don't actually use Discord for task management

### Decision

**My suggestion**: Keep it for now, test for a week, then decide.

The bot is now fixed and should be stable. Try using it:
- Create a task from Discord: `/create`
- Check today's tasks: `/today`
- See if you actually use it

If after a week you don't use it, we can remove it cleanly.

---

## All Bots Synced

✅ **Synced to VPS**:
- starboard-bot
- todoist-bot
- reminder-bot
- exercism-bot
- github-bot

All local changes are now on VPS.
