# Discord OAuth & Bot Permissions Setup Guide

## Step 1: Create/Access Your Discord Application

1. Go to **[Discord Developer Portal](https://discord.com/developers/applications)**
2. Click **"New Application"** (top right)
3. Name it: **"Hangman Bot"**
4. Accept the terms and click **"Create"**

---

## Step 2: Configure Bot Settings

### 2a. Add Bot to Application

1. In the left sidebar, click **"Bot"**
2. Click **"Add Bot"**
3. Confirm the action

### 2b. Get Your Bot Token

1. Under **"TOKEN"** section, click **"Copy"**
2. **Paste this into your `.env` file:**

   ```
   BOT_TOKEN_HANGMAN=<your_copied_token>
   ```

3. **⚠️ NEVER share this token publicly!**

### 2c. Enable Required Intents

These let your bot read messages and interact properly:

1. Scroll down to **"GATEWAY INTENTS"**
2. **Enable these THREE intents:**
   - ✅ **PRESENCE INTENT** (know when users are online)
   - ✅ **SERVER MEMBERS INTENT** (access member info)
   - ✅ **MESSAGE CONTENT INTENT** (read message content)
3. Click **"Save Changes"**

---

## Step 3: Set Up OAuth2 Permissions

### 3a. Generate OAuth2 URL

1. In the left sidebar, click **"OAuth2"** → **"URL Generator"**

### 3b. Select Scopes

Under **"SCOPES"**, check these boxes:

- ✅ **bot** (makes it a bot account)
- ✅ **applications.commands** (for slash commands)

### 3c. Select Permissions

Under **"PERMISSIONS"**, check these boxes:

**Text Permissions:**

- ✅ Send Messages
- ✅ Send Messages in Threads
- ✅ Embed Links
- ✅ Attach Files
- ✅ Read Message History
- ✅ Mention @everyone, @here, and All Roles (if needed)

**Interaction Permissions:**

- ✅ Use Slash Commands
- ✅ Use External Apps

**Voice Permissions** (optional):

- ✅ Connect (if using voice features)
- ✅ Speak (if using voice features)

### 3d. Copy Generated URL

1. At the bottom, scroll to see the **"Generated URL"**
2. Click **"Copy"** to copy the invite link
3. **Save this URL** - you'll use it to invite the bot to your server

---

## Step 4: Invite Bot to Your Discord Server

1. **Open the OAuth2 URL** you generated in your browser
2. You'll see a dropdown: **"Select a Server"**
3. Choose your Discord server from the list
4. Click **"Authorize"**
5. Complete the CAPTCHA if prompted
6. You should see: **"Authorization successful!"**

✅ **Your bot is now in your server!**

---

## Step 5: Verify Bot Has Correct Permissions

In your Discord server:

1. Right-click the **"Hangman Bot"** in the member list
2. Click **"View Server Profile"** → **"Roles"**
3. Verify it has the correct role/permissions

### Fix Permissions if Needed

If the bot can't send messages:

1. In your server, go to **Server Settings** → **Roles**
2. Find the **"Hangman Bot"** role
3. Click it and ensure these are **enabled** (green):
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History

---

## Step 6: Test Bot Locally

Before running in production:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot/

# Test with the token and API key in .env
bash RUN_BOT.sh
```

**In Discord, test:**

```
/play        # Start a game
/guess a     # Guess a letter
/stats       # Check your stats
```

---

## Step 7: Security Best Practices

### ✅ DO

- Keep your bot token **SECRET** (never commit to git)
- Use `.env` files for sensitive data
- Regenerate token if leaked
- Use strong rate limiting
- Log bot actions for debugging

### ❌ DON'T

- Share bot token publicly
- Post token in Discord messages
- Commit `.env` to Git
- Use same token across multiple bots
- Allow bots to DM users without consent

---

## Step 8: Set Bot Presence/Status (Optional)

To show what the bot is doing:

In your bot code (in `src/core`), add:

```python
import discord
from discord.ext import commands

bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())

@bot.event
async def on_ready():
    # Set bot status
    activity = discord.Activity(
        type=discord.ActivityType.playing,
        name="/play hangman"
    )
    await bot.change_presence(activity=activity)
    print(f"✅ Bot logged in as {bot.user}")

bot.run(os.getenv("BOT_TOKEN_HANGMAN"))
```

---

## Step 9: Troubleshooting

### Bot appears offline

- Check token in `.env` is correct
- Verify intents are enabled
- Restart bot: `bash RUN_BOT.sh`

### Bot can't send messages

- Check role permissions (see Step 5)
- Verify "Send Messages" permission is enabled
- Check channel permissions (not overridden)

### Slash commands not showing

- Ensure "applications.commands" scope is selected
- Re-invite bot using updated OAuth2 URL
- Wait 5-10 minutes for Discord to sync

### Token error

- Regenerate token in Developer Portal
- Update `.env` file
- Restart bot

---

## Quick Reference: Your Setup

```
Bot Name:        Hangman Bot
Bot Token:       BOT_TOKEN_HANGMAN (in .env)
OAuth2 Scopes:   bot, applications.commands
Permissions:     Send Messages, Read History, Embed Links, Slash Commands
Intents:         Message Content, Server Members, Presence
Status:          /play hangman
```

---

## Next Steps

1. ✅ Ensure bot is invited to your Discord server
2. ✅ Test `/play` command in Discord
3. ✅ Verify bot responds correctly
4. ✅ Run `bash RUN_BOT.sh` for 24/7 automation
5. ✅ Set up LaunchAgent for auto-startup on reboot

---

**You're all set! 🎮 Your Hangman bot is ready to play!**
