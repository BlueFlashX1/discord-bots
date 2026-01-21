# 🔐 Discord Bot Credentials - Complete Transfer Summary & Guide

## ✅ What Has Been Transferred

### Hangman Bot (`hangman-bot/.env`)
- ✅ **DISCORD_TOKEN** - Transferred from Python backup
  - Token: `MTQzMDY0MzQ1MzE5NjM3MDA3Mg.Gkz0yx...`
- ✅ **CLIENT_ID** - Found in documentation
  - ID: `143064345319637007`
- ✅ **OPENAI_API_KEY** - Transferred from Python backup
- ✅ **MONGODB_URI** - Default set (can be changed)
- ⚠️ **GUILD_ID** - Still needs to be filled (optional)

**Status:** ✅ **READY TO USE** (just add GUILD_ID if you want faster command deployment)

---

### Grammar Bot (`grammar-bot/.env`)
- ✅ **DISCORD_TOKEN** - Transferred from Python backup
  - Token: `MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N...`
- ⚠️ **CLIENT_ID** - **NEEDS TO BE FILLED** (see guide below)
- ✅ **OPENAI_API_KEY** - Transferred from Python backup
- ✅ **MONGODB_URI** - Default set (can be changed)
- ⚠️ **GUILD_ID** - Still needs to be filled (optional)

**Status:** ⚠️ **NEEDS CLIENT_ID** (see step-by-step guide below)

---

### Spelling Bee Bot (`spelling-bee-bot/.env`)
- ⚠️ **DISCORD_TOKEN** - **NOT FOUND** (needs to be created/retrieved)
- ⚠️ **CLIENT_ID** - **NEEDS TO BE FILLED** (see guide below)
- ✅ **OPENAI_API_KEY** - Transferred from Python backup
- ✅ **MONGODB_URI** - Default set (can be changed)
- ⚠️ **GUILD_ID** - Still needs to be filled (optional)

**Status:** ⚠️ **NEEDS DISCORD_TOKEN AND CLIENT_ID** (see step-by-step guide below)

---

## 📋 What Still Needs to Be Filled

| Bot | DISCORD_TOKEN | CLIENT_ID | GUILD_ID | Status |
|-----|---------------|-----------|----------|--------|
| Hangman Bot | ✅ Done | ✅ Done | ⚠️ Optional | ✅ Ready |
| Grammar Bot | ✅ Done | ⚠️ **Need** | ⚠️ Optional | ⚠️ Needs CLIENT_ID |
| Spelling Bee Bot | ⚠️ **Need** | ⚠️ **Need** | ⚠️ Optional | ⚠️ Needs Both |

---

## 🎯 Step-by-Step Guide: Getting Missing Credentials

### Part 1: Get CLIENT_ID (Application ID)

**For Grammar Bot and Spelling Bee Bot**

1. **Go to Discord Developer Portal**
   - Open: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Find Your Bot Application**
   - Look for your bot's application in the list
   - Click on the application name to open it
   - If you don't see it, you may need to create a new application (see Part 2)

3. **Get Application ID (CLIENT_ID)**
   - In the left sidebar, click **"General Information"**
   - Find the **"Application ID"** field (also called Client ID)
   - Click the **copy icon** next to it
   - This is your `CLIENT_ID`

4. **Add to `.env` File**
   - Open the bot's `.env` file in TextEdit
   - Find the line: `CLIENT_ID=your_discord_bot_client_id_here`
   - Replace with: `CLIENT_ID=<paste_the_copied_id_here>`
   - Save the file

**Example:**
```env
CLIENT_ID=1429281302183673886
```

---

### Part 2: Get DISCORD_TOKEN (Bot Token)

**For Spelling Bee Bot (if token not found)**

1. **Go to Discord Developer Portal**
   - Open: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Select Your Bot Application**
   - Click on the Spelling Bee Bot application
   - If it doesn't exist, create it:
     - Click **"New Application"** (top right)
     - Name it "Spelling Bee Bot" or similar
     - Click **"Create"**

3. **Add Bot User (if not already added)**
   - In the left sidebar, click **"Bot"**
   - If you see "Add Bot" button, click it
   - Confirm by clicking **"Yes, do it!"**

4. **Get Bot Token**
   - Still in the **"Bot"** section
   - Find the **"Token"** section
   - Click **"Reset Token"** if you need a new one (or if token is hidden)
   - **⚠️ IMPORTANT:** Click **"Copy"** to copy the token
   - **⚠️ WARNING:** You can only see the full token once! Copy it immediately and store it securely.

5. **Add to `.env` File**
   - Open `spelling-bee-bot/.env` in TextEdit
   - Find the line: `DISCORD_TOKEN=your_discord_bot_token_here`
   - Replace with: `DISCORD_TOKEN=<paste_the_copied_token_here>`
   - Save the file

**Example:**
```env
DISCORD_TOKEN=MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE
```

---

### Part 3: Get GUILD_ID (Server ID) - Optional

**For faster command deployment during development**

1. **Enable Developer Mode in Discord**
   - Open Discord app
   - Go to **User Settings** (gear icon)
   - Go to **Advanced** section
   - Enable **"Developer Mode"**

2. **Get Server ID**
   - Right-click on your test server (in server list)
   - Click **"Copy Server ID"**
   - This is your `GUILD_ID`

3. **Add to `.env` File**
   - Open the bot's `.env` file
   - Find: `GUILD_ID=your_test_guild_id_here`
   - Replace with: `GUILD_ID=<paste_the_copied_id_here>`
   - Save the file

**Example:**
```env
GUILD_ID=123456789012345678
```

**Note:** GUILD_ID is optional. If not set, commands deploy globally (takes up to 1 hour). If set, commands deploy instantly to that server.

---

## 🔍 How to Find Which Application Belongs to Which Bot

If you're not sure which application is for which bot:

1. **Check Application Name**
   - Look at the application name in the Developer Portal
   - It should match your bot's purpose (e.g., "Grammar Bot", "Hangman Bot")

2. **Check Bot Username**
   - In the **"Bot"** section, look at the bot username
   - This should match the bot's name in Discord

3. **Check Bot Token (if you have it)**
   - The token format is: `[numbers].[letters].[long_string]`
   - Compare the first part with your existing tokens to match them

4. **Check Application ID**
   - The Application ID (CLIENT_ID) is a long number
   - Hangman Bot's ID is: `143064345319637007`
   - Grammar Bot and Spelling Bee Bot will have different IDs

---

## 📝 Quick Reference: What Goes Where

### For Each Bot's `.env` File:

```env
# Required - Bot Authentication
DISCORD_TOKEN=<bot_token_from_developer_portal>
CLIENT_ID=<application_id_from_developer_portal>

# Optional - For faster command deployment
GUILD_ID=<your_test_server_id>

# Already Set - OpenAI API Key
OPENAI_API_KEY=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

# Optional - Database (uses JSON if not set)
MONGODB_URI=mongodb://localhost:27017/bot-name
```

---

## 🚨 Important Security Notes

1. **Never Share Your Tokens**
   - Bot tokens are like passwords
   - Never commit them to git (`.env` should be in `.gitignore`)
   - Never share them publicly

2. **If Token is Leaked**
   - Go to Discord Developer Portal
   - Bot section → Reset Token
   - Update your `.env` file immediately

3. **Token Format**
   - Tokens look like: `MTQyOTI4MTMwMjE4MzY3Mzg4Ng.GD9d-N.uH0eL8hFtfghutmQqAY4-WH5vHnkMDIoWNIemE`
   - If you see `your_token_here` or similar, it's a placeholder and needs to be replaced

---

## ✅ Verification Checklist

After filling in all credentials:

- [ ] Hangman Bot: DISCORD_TOKEN ✅, CLIENT_ID ✅
- [ ] Grammar Bot: DISCORD_TOKEN ✅, CLIENT_ID ⚠️
- [ ] Spelling Bee Bot: DISCORD_TOKEN ⚠️, CLIENT_ID ⚠️
- [ ] All bots: OPENAI_API_KEY ✅
- [ ] Optional: GUILD_ID for faster deployment

---

## 🚀 Next Steps After Filling Credentials

1. **Deploy Slash Commands**
   ```bash
   cd hangman-bot && npm run deploy
   cd grammar-bot && npm run deploy
   cd spelling-bee-bot && npm run deploy
   ```

2. **Start the Bots**
   ```bash
   cd hangman-bot && npm start
   cd grammar-bot && npm start
   cd spelling-bee-bot && npm start
   ```

3. **Test in Discord**
   - Try `/ping` command in your Discord server
   - Should see bot response

---

## 📚 Resources

- **Discord Developer Portal:** https://discord.com/developers/applications
- **Discord.js Guide:** https://discordjs.guide
- **Discord API Docs:** https://discord.com/developers/docs

---

**Need Help?** Check the Discord Developer Portal documentation or the bot-specific README files in each bot's directory.
