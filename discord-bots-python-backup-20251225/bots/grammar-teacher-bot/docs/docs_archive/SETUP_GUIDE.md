# Complete Setup Guide - Grammar Teacher Bot

## Step-by-Step Setup Instructions

### Part 1: Discord Developer Portal Setup

#### 1.1 Create a Discord Application

1. **Go to Discord Developer Portal**

   - Visit: <https://discord.com/developers/applications>
   - Click "Log in" and sign in with your Discord account

2. **Create New Application**

   - Click the blue "New Application" button (top right)
   - Enter a name: `Grammar Teacher Bot` (or your preferred name)
   - Read and accept Discord's Terms of Service
   - Click "Create"

3. **Application Created!**
   - You'll see your application dashboard
   - Note: The APPLICATION ID is shown - you don't need this yet

#### 1.2 Configure Bot Settings

1. **Go to Bot Section**

   - On the left sidebar, click "Bot"
   - Click "Add Bot" button
   - Confirm by clicking "Yes, do it!"

2. **Get Your Bot Token** (IMPORTANT - Keep This Secret!)

   - Under "TOKEN" section, click "Reset Token"
   - Click "Yes, do it!" to confirm
   - Click "Copy" to copy your token
   - **SAVE THIS IMMEDIATELY** - you can't see it again without resetting!

   ```
   Example token format:
   MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz
   ```

3. **Configure Bot Permissions**

   - Scroll down to "Privileged Gateway Intents"
   - **ENABLE** the following (REQUIRED for bot to work):
     - ✅ **PRESENCE INTENT** (optional)
     - ✅ **SERVER MEMBERS INTENT** (required)
     - ✅ **MESSAGE CONTENT INTENT** (required - bot needs to read messages!)
   - Click "Save Changes" at the bottom

4. **Optional: Add Bot Icon**
   - At the top, click "Upload" under APP ICON
   - Choose an image (square works best, 512x512 recommended)
   - Click "Save Changes"

#### 1.3 Generate Invite Link

1. **Go to OAuth2 Section**

   - On the left sidebar, click "OAuth2"
   - Click "URL Generator" (sub-menu)

2. **Select Scopes**

   - Under "SCOPES", check these boxes:
     - ✅ `bot`
     - ✅ `applications.commands` (for slash commands)

3. **Select Bot Permissions**

   - Under "BOT PERMISSIONS", check these:

     - ✅ **Read Messages/View Channels** (required)
     - ✅ **Send Messages** (required)
     - ✅ **Send Messages in Threads** (optional)
     - ✅ **Embed Links** (required - for formatted messages)
     - ✅ **Read Message History** (required)

   - Alternatively, use permission integer: `19456` (recommended minimum)

4. **Copy the Invite URL**

   - At the bottom, you'll see "GENERATED URL"
   - Click "Copy" button
   - Save this URL - you'll use it to invite the bot to your server

   ```
   Example URL:
   https://discord.com/api/oauth2/authorize?client_id=1234567890&permissions=19456&scope=bot%20applications.commands
   ```

#### 1.4 Invite Bot to Your Server

1. **Open Invite URL**

   - Paste the URL you copied into your browser
   - You'll see "Add Grammar Teacher Bot" page

2. **Select Server**

   - Choose the server you want to add the bot to
   - Note: You must have "Manage Server" permission

3. **Authorize Bot**

   - Review the permissions
   - Click "Authorize"
   - Complete the CAPTCHA if prompted

4. **Bot Added!**
   - You should see a success message
   - The bot will appear in your server's member list (offline until you run it)

---

### Part 2: Local Setup (Your Computer)

#### 2.1 Install Dependencies

1. **Navigate to Bot Directory**

   ```bash
   cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
   ```

2. **Install Required Packages**

   ```bash
   pip install discord.py python-dotenv language-tool-python textstat nltk
   ```

   **What each package does:**

   - `discord.py` - Discord bot framework (required)
   - `python-dotenv` - Load environment variables from .env file
   - `language-tool-python` - Grammar checking engine
   - `textstat` - Readability analysis (optional)
   - `nltk` - Natural language processing (optional)

3. **Verify Installation**

   ```bash
   python -c "import discord; print(f'discord.py version: {discord.__version__}')"
   ```

   Should output: `discord.py version: 2.x.x`

#### 2.2 Configure Environment Variables

1. **Create .env File**

   ```bash
   touch .env
   ```

2. **Add Your Bot Token**
   Open the `.env` file in a text editor and add:

   ```
   BOT_TOKEN_GRAMMAR=YOUR_TOKEN_HERE
   ```

   Replace `YOUR_TOKEN_HERE` with the token you copied from Developer Portal

   **Example .env file:**

   ```
   BOT_TOKEN_GRAMMAR=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz
   ```

3. **Secure Your .env File**

   ```bash
   chmod 600 .env
   ```

   This ensures only you can read the file (important for security!)

4. **Verify .gitignore**
   - Make sure `.env` is in your `.gitignore` file
   - **NEVER** commit your token to GitHub!

#### 2.3 Create Data Directory

The bot stores user statistics in JSON files:

```bash
mkdir -p data
```

This creates a `data/` folder where the bot will save:

- `user_stats.json` - User statistics and patterns
- `user_settings.json` - User preferences (auto-check on/off)

---

### Part 3: Running Your Bot

#### 3.1 Start the Bot

```bash
python bot_auto_detect.py
```

**Expected Output:**

```
Starting Grammar Teacher Bot (Auto-Detection Mode)...
Monitoring all messages 24/7
Sending private DM corrections
Users can dismiss messages
Users can opt-out with /autocheck off
[Bot Username] is online!
Grammar checking: Enabled
Auto-detection: Active
Synced 3 slash commands
```

#### 3.2 Verify Bot is Online

1. **Check Discord Server**

   - Look at your server's member list
   - The bot should now show as "Online" (green dot)

2. **Check Bot Status**
   - The bot's status should show: "Auto-checking grammar | /autocheck"

#### 3.3 Test the Bot

**Test Auto-Detection:**

1. Type a message with an error in any channel:

   ```
   I has went to the store
   ```

2. Check your DMs (Direct Messages)
   - You should receive a private correction from the bot
   - Only you can see this message!

**Test Slash Commands:**

1. Type `/` in any channel
2. You should see these commands:

   - `/autocheck` - Enable/disable auto-detection
   - `/check` - Manually check grammar
   - `/stats` - View your statistics

3. Try `/stats` to see your grammar statistics

---

### Part 4: Troubleshooting

#### Issue: "No bot token found!"

**Solution:**

- Check your `.env` file exists in the correct directory
- Verify the token is correctly copied (no extra spaces)
- Ensure the line is: `BOT_TOKEN_GRAMMAR=your_token`

#### Issue: "language-tool-python not installed"

**Solution:**

```bash
pip install language-tool-python
```

#### Issue: Bot is offline in Discord

**Possible Causes:**

1. Bot script not running - check your terminal
2. Token is invalid - regenerate token in Developer Portal
3. Internet connection issue

#### Issue: Bot can't read messages

**Solution:**

- Go to Developer Portal → Bot → Privileged Gateway Intents
- Enable "MESSAGE CONTENT INTENT"
- Click "Save Changes"
- Restart your bot

#### Issue: Slash commands not showing

**Solution:**

1. Wait 1-2 minutes after starting bot (Discord needs time to sync)
2. Restart Discord client
3. Check bot has `applications.commands` scope in invite URL

#### Issue: Bot can't send DMs

**Possible Causes:**

1. User has DMs disabled from server members

   - **Fix:** User Settings → Privacy & Safety → Allow DMs from server members

2. Bot doesn't have permission
   - **Fix:** Check bot has "Send Messages" permission

#### Issue: "Import discord could not be resolved"

**Solution:**

```bash
pip install --upgrade discord.py
```

---

### Part 5: Configuration Options

#### Change Bot Status

Edit `bot_auto_detect.py`, line ~690:

```python
await bot.change_presence(
    activity=discord.Game(name="Your custom status here")
)
```

#### Change Cooldown Time

Edit `bot_auto_detect.py`, line ~68:

```python
COOLDOWN_SECONDS = 300  # Change to desired seconds (300 = 5 minutes)
```

#### Change Error Limit

Edit `bot_auto_detect.py`, line ~365:

```python
for i, match in enumerate(important_matches[:3], 1):  # Change :3 to :5 for 5 errors
```

---

### Part 6: Running Bot 24/7

#### Option 1: Keep Terminal Open (Simple)

```bash
python bot_auto_detect.py
```

- Keep terminal window open
- Bot stops when you close terminal or shut down computer

#### Option 2: Run in Background (Mac/Linux)

```bash
nohup python bot_auto_detect.py > bot.log 2>&1 &
```

- Bot runs in background
- Logs saved to `bot.log`
- Survives terminal closing
- To stop: `pkill -f bot_auto_detect.py`

#### Option 3: Use Screen (Mac/Linux)

```bash
# Start screen session
screen -S grammar_bot

# Run bot
python bot_auto_detect.py

# Detach: Press Ctrl+A, then D
# Reattach later: screen -r grammar_bot
```

#### Option 4: Host on Cloud (Always Online)

**Free Options:**

- **Replit** - <https://replit.com> (free tier available)
- **Railway** - <https://railway.app> (free tier available)
- **Heroku** - <https://heroku.com> (requires payment verification)

**Paid Options:**

- **DigitalOcean** - $5/month droplet
- **AWS EC2** - Free tier for 12 months
- **Google Cloud** - Free tier with $300 credit

---

### Part 7: Security Best Practices

#### Protect Your Token

1. **Never share your token publicly**
2. **Never commit .env to GitHub**
3. **Regenerate token if exposed**
   - Go to Developer Portal → Bot → Reset Token

#### Use Environment Variables

Always use `.env` files for sensitive data:

```python
TOKEN = os.getenv("BOT_TOKEN_GRAMMAR")
```

Never hardcode tokens:

```python
TOKEN = "MTIzNDU2..."  # NEVER DO THIS!
```

#### Rate Limiting

The bot has built-in cooldowns (5 minutes) to avoid:

- Spamming users
- Hitting Discord rate limits
- Getting banned

---

### Part 8: Updating the Bot

#### Pull New Changes

If you modify the bot or get updates:

```bash
# Stop the bot (Ctrl+C in terminal)

# Make your changes or pull updates

# Restart the bot
python bot_auto_detect.py
```

#### Sync Slash Commands

If you add new slash commands:

```python
# The bot auto-syncs on startup (line ~688)
await bot.tree.sync()
```

---

### Quick Reference Card

#### Essential Commands

```bash
# Install dependencies
pip install discord.py python-dotenv language-tool-python textstat nltk

# Run bot
python bot_auto_detect.py

# Run in background
nohup python bot_auto_detect.py > bot.log 2>&1 &

# View logs
tail -f bot.log

# Stop background bot
pkill -f bot_auto_detect.py
```

#### Essential Links

- **Developer Portal**: <https://discord.com/developers/applications>
- **Discord.py Docs**: <https://discordpy.readthedocs.io/>
- **Bot Support**: Check console output for errors

#### File Structure

```
grammar-teacher-bot/
├── bot_auto_detect.py      # Main bot file
├── .env                     # Bot token (SECRET!)
├── data/                    # Auto-created
│   ├── user_stats.json      # User statistics
│   └── user_settings.json   # User preferences
└── requirements.txt         # Dependencies
```

---

### Need Help?

**Common Issues:**

1. Bot offline → Check token and intents
2. No DMs → User privacy settings
3. Commands not working → Wait 2 minutes after start
4. Import errors → Install dependencies

**Check Console Output:**

- The terminal shows helpful error messages
- Read carefully for clues about issues

**Still Stuck?**

- Review this guide step-by-step
- Check Developer Portal settings
- Verify all dependencies installed
- Ensure .env file is correct

---

## You're Ready

Your Grammar Teacher Bot is now set up and ready to help users improve their writing!

**What the bot does:**

- Monitors all messages 24/7
- Detects grammar, spelling, and typo errors automatically
- Sends private DM corrections (only the user sees them)
- Tracks patterns and provides smart recommendations
- Shows improvement trends and statistics
- Allows users to opt-out anytime

**Enjoy your smart grammar bot!**
