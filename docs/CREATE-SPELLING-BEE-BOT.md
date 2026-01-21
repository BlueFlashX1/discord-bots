# 🐝 Create Spelling Bee Bot Application - Step-by-Step Guide

## Overview

You need to create a **new Discord application** for the Spelling Bee Bot. This will give you both the `DISCORD_TOKEN` and `CLIENT_ID` you need.

---

## 📋 Step-by-Step Instructions

### Step 1: Go to Discord Developer Portal

1. Open your browser
2. Go to: **https://discord.com/developers/applications**
3. Log in with your Discord account

---

### Step 2: Create New Application

1. Click the **"New Application"** button (usually top right, blue button)
2. A popup will appear asking for a name
3. Enter a name: **"Spelling Bee Bot"** (or "SpellingBeeBot", "Spelling-Bee-Bot", etc.)
4. Click **"Create"**

**Note:** The application name doesn't have to match exactly - it's just for your reference in the Developer Portal.

---

### Step 3: Get Application ID (CLIENT_ID)

1. After creating the application, you'll be on the **"General Information"** page
2. Look for the **"Application ID"** field (also called Client ID)
3. It's a long number like: `123456789012345678`
4. Click the **copy icon** 📋 next to it
5. **Save this** - you'll need it for your `.env` file

**This is your `CLIENT_ID`** ✅

---

### Step 4: Create Bot User

1. In the left sidebar, click **"Bot"**
2. You'll see a page with "Add Bot" or "Create a Bot" button
3. Click **"Add Bot"** (or "Create a Bot")
4. A confirmation popup will appear
5. Click **"Yes, do it!"** to confirm

**Your bot user is now created!** 🤖

---

### Step 5: Get Bot Token (DISCORD_TOKEN)

1. Still on the **"Bot"** page
2. Scroll down to find the **"Token"** section
3. Click **"Reset Token"** (or "Copy" if token is visible)
4. A confirmation popup will appear
5. Click **"Yes, do it!"** to confirm
6. **⚠️ IMPORTANT:** The token will appear - **COPY IT IMMEDIATELY**
   - Click the **copy icon** 📋 next to the token
   - You can **only see the full token once**!
   - If you lose it, you'll need to reset it again

**This is your `DISCORD_TOKEN`** ✅

**Token format example:** `MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE`

---

### Step 6: Enable Required Intents

Your bot needs certain intents to work properly. Enable these:

1. Still on the **"Bot"** page
2. Scroll down to **"Privileged Gateway Intents"**
3. Enable these intents:
   - ✅ **MESSAGE CONTENT INTENT** (required for reading messages)
   - ✅ **SERVER MEMBERS INTENT** (optional, but useful for some features)
   - ✅ **GUILD MEMBERS INTENT** (optional, if available)

**Note:** Some intents may require verification if your bot is in 100+ servers. For development, you can enable them freely.

---

### Step 7: Configure Bot Settings (Optional)

1. Still on the **"Bot"** page
2. You can configure:
   - **Username** - What your bot will be called in Discord
   - **Icon** - Bot's profile picture (upload an image)
   - **Public Bot** - Uncheck this for now (private bot)
   - **Requires OAuth2 Code Grant** - Leave unchecked

---

### Step 8: Get Bot Invite URL (To Add Bot to Your Server)

1. In the left sidebar, click **"OAuth2"** → **"URL Generator"**
2. Under **"Scopes"**, check:
   - ✅ **bot**
   - ✅ **applications.commands**
3. Under **"Bot Permissions"**, check these permissions:
   - ✅ **Send Messages**
   - ✅ **Read Message History**
   - ✅ **Use Slash Commands**
   - ✅ **Embed Links** (for embeds)
   - ✅ **Attach Files** (if your bot sends files)
   - ✅ **Read Messages/View Channels**
4. Scroll down - you'll see a **"Generated URL"** at the bottom
5. **Copy this URL**

**Example URL:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147764224&scope=bot%20applications.commands
```

---

### Step 9: Add Bot to Your Discord Server

1. Open the **invite URL** you just copied in a new browser tab
2. A Discord authorization page will open
3. Select the **server** you want to add the bot to (dropdown at top)
4. Click **"Authorize"**
5. Complete any CAPTCHA if prompted
6. The bot should now appear in your server's member list! ✅

---

### Step 10: Update `.env` File

Now add the credentials to your `spelling-bee-bot/.env` file:

1. Open: `~/Documents/DEVELOPMENT/discord/bots/spelling-bee-bot/.env`
2. Find and update these lines:

```env
# Replace with your actual values:
DISCORD_TOKEN=<paste_your_bot_token_here>
CLIENT_ID=<paste_your_application_id_here>

# Optional: Add your test server ID for faster deployment
GUILD_ID=<your_test_server_id_here>
```

**Example:**
```env
DISCORD_TOKEN=MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE
CLIENT_ID=1429281302183673886
GUILD_ID=123456789012345678
```

3. **Save** the file

---

### Step 11: Verify Setup

Run this to check all credentials are set:

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/spelling-bee-bot
grep -E "^DISCORD_TOKEN=|^CLIENT_ID=" .env
```

You should see:
```
DISCORD_TOKEN=<your_token>
CLIENT_ID=<your_client_id>
```

Both should **NOT** contain `your_` or be empty.

---

### Step 12: Deploy Commands

Now deploy the slash commands to Discord:

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/spelling-bee-bot
npm run deploy
```

You should see:
```
✅ Successfully deployed X commands to guild <GUILD_ID>
```

Or if GUILD_ID is not set:
```
✅ Successfully deployed X commands globally
```

---

### Step 13: Start the Bot

Start your Spelling Bee Bot:

```bash
cd ~/Documents/DEVELOPMENT/discord/bots/spelling-bee-bot
npm start
```

You should see:
```
✅ Logged in as Spelling Bee Bot#1234
🔧 Serving 1 guild(s)
📊 Loaded X command(s)
```

---

### Step 14: Test in Discord

1. Go to your Discord server
2. Type `/ping` in any channel
3. The bot should respond! ✅

---

## 📋 Quick Checklist

- [ ] Created new application in Discord Developer Portal
- [ ] Copied Application ID (CLIENT_ID)
- [ ] Created bot user
- [ ] Copied bot token (DISCORD_TOKEN)
- [ ] Enabled MESSAGE CONTENT INTENT
- [ ] Generated invite URL
- [ ] Added bot to Discord server
- [ ] Updated `spelling-bee-bot/.env` with DISCORD_TOKEN
- [ ] Updated `spelling-bee-bot/.env` with CLIENT_ID
- [ ] Ran `npm run deploy` successfully
- [ ] Started bot with `npm start`
- [ ] Tested `/ping` command in Discord

---

## 🚨 Important Security Notes

1. **Never Share Your Token**
   - Your bot token is like a password
   - Never commit it to git (`.env` should be in `.gitignore`)
   - Never share it publicly or in screenshots

2. **If Token is Leaked**
   - Go to Discord Developer Portal
   - Bot section → Reset Token
   - Update your `.env` file immediately
   - The old token will no longer work

3. **Token Format**
   - Tokens look like: `MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE`
   - If you see `your_token_here`, it's a placeholder and needs to be replaced

---

## 🆘 Troubleshooting

### Bot won't start
- ✅ Check `.env` file has DISCORD_TOKEN and CLIENT_ID (no `your_` placeholders)
- ✅ Verify token is correct (copy from Developer Portal again if needed)
- ✅ Check bot is invited to at least one server

### Commands not showing
- ✅ Run `npm run deploy` first
- ✅ Wait a few seconds after deploying (Discord needs time to sync)
- ✅ Check CLIENT_ID is correct
- ✅ Make sure bot has `applications.commands` scope when invited

### Bot appears offline
- ✅ Make sure bot is running (`npm start`)
- ✅ Check for error messages in terminal
- ✅ Verify token is valid (not expired or reset)

---

## 📚 Resources

- **Discord Developer Portal:** https://discord.com/developers/applications
- **Discord.js Guide:** https://discordjs.guide
- **Bot Setup Guide:** `CREDENTIALS-GUIDE.md`

---

**Ready to create your Spelling Bee Bot! 🐝**

Follow the steps above, and you'll have your bot running in no time! ✅
