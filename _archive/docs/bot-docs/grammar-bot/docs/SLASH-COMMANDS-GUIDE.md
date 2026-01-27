# Discord Slash Commands Update Guide

Complete guide for properly updating and deploying slash commands for the Grammar Bot.

---

## Quick Reference

```bash
# Deploy commands
cd ~/Documents/DEVELOPMENT/discord/bots/grammar-bot
npm run deploy

# Restart bot after deployment
cd ~/Documents/DEVELOPMENT/discord/bots
./stop-all-bots.sh
./start-all-bots.sh
```

---

## Understanding Slash Commands

### Global vs Guild Commands

**Global Commands:**
- Available in ALL servers where the bot is present
- Takes **up to 1 hour** to propagate across Discord
- Use for production/stable commands
- Deployed when `GUILD_ID` is not set or invalid

**Guild Commands:**
- Available only in ONE specific server (guild)
- Appears **instantly** (within seconds)
- Use for development/testing
- Deployed when `GUILD_ID` is set to a valid Discord server ID

### Command Lifecycle

1. **Code Changes** → Modify command files in `commands/`
2. **Deploy** → Run `npm run deploy` to register with Discord
3. **Wait** → Global: up to 1 hour | Guild: instant
4. **Restart Bot** → Ensure bot loads new command handlers
5. **Test** → Verify commands work in Discord

---

## Step-by-Step Update Process

### 1. Make Code Changes

Edit command files in `commands/`:

```bash
# Example: Update stats.js
nano commands/stats.js
# or
code commands/stats.js
```

**Important:** Ensure all commands have:
- `data` property (SlashCommandBuilder)
- `execute` function
- Proper error handling with `deferReply()`

### 2. Deploy Commands to Discord

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/grammar-bot
npm run deploy
```

**Expected Output:**
```
Loaded command: attack
Loaded command: buy
...
Started refreshing 11 application (/) commands.
Successfully deployed 11 commands globally
Deployed commands: attack, buy, check, inventory, leaderboard, ping, pvp-accept, pvp, shop, stats, toggle
```

**If you see errors:**
- Check `.env` has valid `DISCORD_TOKEN` and `CLIENT_ID`
- Ensure `GUILD_ID` is either unset or a valid Discord server ID (numbers only)
- Verify bot has proper permissions in Discord Developer Portal

### 3. Restart the Bot

After deploying, restart the bot to load updated command handlers:

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./stop-all-bots.sh
./start-all-bots.sh
```

**Or manually:**
```bash
# Stop
pkill -f "grammar-bot.*index.js"

# Start
cd grammar-bot
nohup npm start > ../logs/grammar-bot.log 2>&1 &
```

### 4. Verify in Discord

**For Global Commands (up to 1 hour wait):**
1. Type `/` in Discord
2. Wait for commands to appear (can take up to 1 hour)
3. If not appearing:
   - Restart Discord app (forces refresh)
   - Wait longer (global commands are slow)
   - Check bot is online and has permissions

**For Guild Commands (instant):**
1. Type `/` in Discord
2. Commands should appear within seconds
3. If not appearing:
   - Check bot is in the server
   - Verify `GUILD_ID` matches the server ID
   - Check bot has proper permissions

---

## Development Workflow

### Option 1: Fast Development (Guild Commands)

**Best for:** Testing new commands, rapid iteration

1. **Set Guild ID in `.env`:**
   ```bash
   # Get your server ID (right-click server → Copy Server ID)
   GUILD_ID=123456789012345678
   ```

2. **Deploy:**
   ```bash
   npm run deploy
   ```

3. **Test immediately** (commands appear in seconds)

4. **When ready for production:**
   - Remove or comment out `GUILD_ID` in `.env`
   - Deploy globally: `npm run deploy`
   - Wait up to 1 hour for propagation

### Option 2: Production (Global Commands)

**Best for:** Stable commands, production use

1. **Ensure `.env` has NO `GUILD_ID` or invalid value:**
   ```bash
   # .env
   DISCORD_TOKEN=your_token
   CLIENT_ID=your_client_id
   # GUILD_ID=  # Commented out or not present
   ```

2. **Deploy:**
   ```bash
   npm run deploy
   ```

3. **Wait up to 1 hour** for commands to propagate

4. **Restart bot:**
   ```bash
   ./stop-all-bots.sh && ./start-all-bots.sh
   ```

---

## Command Structure Requirements

Every command file must have:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description'),
  
  async execute(interaction) {
    // ALWAYS defer first for long operations
    await interaction.deferReply();
    
    try {
      // Your command logic here
      await interaction.editReply({ content: 'Success!' });
    } catch (error) {
      console.error('Command error:', error);
      await interaction.editReply({ 
        content: '❌ Error: ' + error.message 
      });
    }
  }
};
```

**Critical Rules:**
1. ✅ Always use `deferReply()` for commands that take >3 seconds
2. ✅ Use `editReply()` after `deferReply()`, not `reply()`
3. ✅ Handle errors gracefully
4. ✅ Respond within 3 seconds OR defer first

---

## Troubleshooting

### Commands Not Appearing in Discord

**Problem:** Commands don't show up after deployment

**Solutions:**
1. **Global commands:** Wait up to 1 hour, restart Discord app
2. **Guild commands:** Verify `GUILD_ID` matches server ID
3. **Check bot status:** Ensure bot is online and in the server
4. **Permissions:** Bot needs "applications.commands" scope
5. **Cache:** Restart Discord app to clear command cache

### "Application did not respond" Error

**Problem:** Commands timeout and show error message

**Solutions:**
1. **Add `deferReply()`** at the start of `execute()`:
   ```javascript
   async execute(interaction) {
     await interaction.deferReply(); // Add this!
     // ... rest of code
   }
   ```

2. **Check response time:** Must respond within 3 seconds OR defer first

3. **Verify error handling:** Wrap code in try/catch

### Deploy Script Errors

**Problem:** `npm run deploy` fails

**Common Errors:**

**"Invalid Form Body - guild_id":**
- `GUILD_ID` is set to a placeholder value
- Fix: Remove `GUILD_ID` from `.env` or set to valid server ID

**"401 Unauthorized":**
- Invalid `DISCORD_TOKEN`
- Fix: Check `.env` has correct token

**"Missing CLIENT_ID":**
- `CLIENT_ID` not set in `.env`
- Fix: Add `CLIENT_ID=your_client_id` to `.env`

**"Command missing data or execute":**
- Command file is malformed
- Fix: Ensure command has both `data` and `execute` properties

---

## Best Practices

### 1. Deploy After Code Changes

**Always deploy after:**
- Adding new commands
- Modifying command names/descriptions
- Changing command options/parameters
- Removing commands

**You don't need to deploy after:**
- Changing command logic only (not structure)
- Bug fixes that don't change command structure

### 2. Test Before Global Deployment

1. Use guild commands for testing
2. Verify everything works
3. Then deploy globally for production

### 3. Version Control

**Before deploying:**
```bash
git add commands/
git commit -m "Update slash commands: [description]"
```

**After deploying:**
```bash
git add deploy-commands.js
git commit -m "Deploy commands: [what changed]"
```

### 4. Monitor Command Usage

Check logs for command errors:
```bash
tail -f ~/Documents/DEVELOPMENT/discord/bots/logs/grammar-bot.log | grep -i "command\|error"
```

---

## Command Deployment Checklist

Before deploying, verify:

- [ ] All command files have `data` and `execute` properties
- [ ] Commands use `deferReply()` for long operations
- [ ] Error handling is implemented
- [ ] `.env` has valid `DISCORD_TOKEN` and `CLIENT_ID`
- [ ] `GUILD_ID` is set correctly (or unset for global)
- [ ] Bot is online and has proper permissions
- [ ] Code changes are committed to git

After deploying:

- [ ] Deployment succeeded (no errors)
- [ ] Bot restarted successfully
- [ ] Commands appear in Discord (wait if global)
- [ ] Commands execute without errors
- [ ] Tested in actual Discord server

---

## Advanced: Command Updates

### Updating Existing Commands

**Changing command name:**
1. Old command will remain until you remove it
2. Deploy new command with new name
3. Old command will disappear after ~1 hour (global) or immediately (guild)
4. Consider keeping old name as alias temporarily

**Changing command options:**
- Just redeploy: `npm run deploy`
- Changes apply immediately for guild commands
- Takes up to 1 hour for global commands

**Removing commands:**
- Delete command file from `commands/`
- Deploy: `npm run deploy`
- Command removed from Discord

### Command Limits

- **Global commands:** 100 commands per bot
- **Guild commands:** 100 commands per guild
- **Command name length:** 1-32 characters
- **Description length:** 1-100 characters

---

## Quick Commands Reference

```bash
# Deploy commands
npm run deploy

# Check bot status
./check-bots-status.sh

# View logs
tail -f logs/grammar-bot.log

# Restart bot
./stop-all-bots.sh && ./start-all-bots.sh

# List all commands
ls -1 commands/*.js

# Test command structure
node -e "require('./commands/stats.js')"
```

---

## Getting Server ID (for Guild Commands)

1. Enable Developer Mode in Discord:
   - Settings → Advanced → Developer Mode (ON)

2. Get Server ID:
   - Right-click server name → Copy Server ID
   - Or: Right-click server icon → Copy Server ID

3. Add to `.env`:
   ```bash
   GUILD_ID=123456789012345678
   ```

---

## Summary

**For Development:**
1. Set `GUILD_ID` in `.env`
2. `npm run deploy` → instant updates
3. Test immediately

**For Production:**
1. Remove `GUILD_ID` from `.env`
2. `npm run deploy` → global deployment
3. Wait up to 1 hour
4. Restart bot

**Always:**
- Use `deferReply()` for long operations
- Handle errors gracefully
- Test before global deployment
- Monitor logs for issues

---

**Last Updated:** 2025-01-21  
**Bot:** Grammar Bot (Node.js)  
**Location:** `/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/grammar-bot`
