# Quick Start - Visual Guide

## Setup Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DISCORD DEVELOPER PORTAL                 │
│                                                             │
│  Step 1: Create Application                                │
│  https://discord.com/developers/applications                │
│  → Click "New Application"                                  │
│  → Name it "Grammar Teacher Bot"                            │
│                                                             │
│  Step 2: Add Bot                                            │
│  → Go to "Bot" section                                      │
│  → Click "Add Bot"                                          │
│  → Copy TOKEN (save this!)                                  │
│                                                             │
│  Step 3: Enable Intents                                     │
│  → Scroll to "Privileged Gateway Intents"                   │
│  → Enable "SERVER MEMBERS INTENT"                           │
│  → Enable "MESSAGE CONTENT INTENT"                          │
│  → Click "Save Changes"                                     │
│                                                             │
│  Step 4: Generate Invite Link                               │
│  → Go to "OAuth2" → "URL Generator"                         │
│  → Check: bot + applications.commands                       │
│  → Check permissions: Read/Send Messages, Embed Links       │
│  → Copy the generated URL                                   │
│                                                             │
│  Step 5: Invite Bot                                         │
│  → Paste URL in browser                                     │
│  → Select your server                                       │
│  → Click "Authorize"                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      YOUR COMPUTER                          │
│                                                             │
│  Step 6: Install Dependencies                               │
│  $ cd grammar-teacher-bot/                                  │
│  $ pip install discord.py python-dotenv language-tool...    │
│                                                             │
│  Step 7: Create .env File                                   │
│  $ touch .env                                               │
│  Add: BOT_TOKEN_GRAMMAR=your_token_here                     │
│                                                             │
│  Step 8: Run Bot                                            │
│  $ python bot_auto_detect.py                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       SUCCESS!                              │
│                                                             │
│  ✓ Bot is online in Discord                                 │
│  ✓ Auto-detection is active                                 │
│  ✓ Slash commands are available                             │
│  ✓ DM corrections working                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5-Minute Quick Start

### 1. Developer Portal (2 minutes)

**Go to:** https://discord.com/developers/applications

**Click through:**

1. "New Application" → Name it → Create
2. "Bot" (sidebar) → "Add Bot" → Confirm
3. "Reset Token" → Copy it (SAVE THIS!)
4. Enable "MESSAGE CONTENT INTENT" → Save
5. "OAuth2" → "URL Generator"
   - Scopes: `bot`, `applications.commands`
   - Permissions: Read/Send Messages, Embed Links
6. Copy URL → Paste in browser → Add to server

**Done with portal!**

---

### 2. Local Setup (3 minutes)

**In Terminal:**

```bash
# Navigate to bot folder
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Install packages
pip install discord.py python-dotenv language-tool-python textstat nltk

# Create .env file
echo "BOT_TOKEN_GRAMMAR=YOUR_TOKEN_HERE" > .env

# Run bot
python bot_auto_detect.py
```

**Replace `YOUR_TOKEN_HERE` with your actual token!**

**Done!**

---

## Checklist

Use this to verify each step:

### Developer Portal

- [ ] Created application on Discord Developer Portal
- [ ] Added bot to application
- [ ] Copied bot token (saved somewhere safe)
- [ ] Enabled "MESSAGE CONTENT INTENT"
- [ ] Enabled "SERVER MEMBERS INTENT"
- [ ] Generated OAuth2 URL with correct scopes
- [ ] Invited bot to server (bot shows in member list)

### Local Setup

- [ ] Navigated to bot directory in terminal
- [ ] Installed all dependencies (discord.py, etc.)
- [ ] Created .env file in bot directory
- [ ] Added bot token to .env file
- [ ] Ran bot with `python bot_auto_detect.py`
- [ ] Bot shows "online" in terminal output

### Testing

- [ ] Bot appears online (green) in Discord server
- [ ] Bot status shows: "Auto-checking grammar | /autocheck"
- [ ] Slash commands appear when typing `/`
- [ ] Typing message with error triggers DM correction
- [ ] `/stats` command works and shows data

---

## Common Mistakes to Avoid

### 1. Wrong Intents

**Problem:** Bot can't read messages
**Fix:** Enable "MESSAGE CONTENT INTENT" in Developer Portal

### 2. Token Not Saved

**Problem:** "No bot token found!" error
**Fix:** Create .env file with `BOT_TOKEN_GRAMMAR=your_token`

### 3. Wrong Directory

**Problem:** Can't find bot files
**Fix:** Make sure you're in the correct directory:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
pwd  # Should show the path above
```

### 4. Dependencies Not Installed

**Problem:** "Import discord could not be resolved"
**Fix:** Install dependencies:

```bash
pip install discord.py python-dotenv language-tool-python
```

### 5. Old Token

**Problem:** Bot won't connect
**Fix:** Regenerate token in Developer Portal, update .env

---

## Visual: Token Setup

```
┌─────────────────────────────────────────────┐
│ Developer Portal → Bot Section              │
│                                             │
│ TOKEN                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl...  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Copy]  [Reset Token]                       │
└─────────────────────────────────────────────┘
                    ↓
                Copy This
                    ↓
┌─────────────────────────────────────────────┐
│ Your Computer: .env file                    │
│                                             │
│ BOT_TOKEN_GRAMMAR=MTIzNDU2Nzg5MDEyMzQ...   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Visual: Permission Setup

```
┌─────────────────────────────────────────────┐
│ OAuth2 → URL Generator                      │
│                                             │
│ SCOPES                                      │
│ ☑ bot                                       │
│ ☑ applications.commands                     │
│                                             │
│ BOT PERMISSIONS                             │
│ ☑ Read Messages/View Channels               │
│ ☑ Send Messages                             │
│ ☑ Embed Links                               │
│ ☑ Read Message History                      │
│                                             │
│ GENERATED URL                               │
│ https://discord.com/api/oauth2/authorize... │
│ [Copy]                                      │
└─────────────────────────────────────────────┘
```

---

## Need Help? Debug Steps

### Bot Won't Start

1. **Check terminal output** - Read the error message carefully
2. **Verify .env file exists** - `ls -la .env` should show it
3. **Check token format** - Should be very long string, no spaces
4. **Try reinstalling** - `pip install --force-reinstall discord.py`

### Bot Offline in Discord

1. **Check terminal** - Is the script running?
2. **Look for errors** - Any red error messages?
3. **Verify token** - Go to Developer Portal, regenerate if needed
4. **Check intents** - MESSAGE CONTENT INTENT must be enabled

### No DM Corrections

1. **Enable DMs** - Server Settings → Privacy → Allow DMs
2. **Check permissions** - Bot needs "Send Messages" permission
3. **Test manually** - Try `/check I has went` command
4. **View console** - Look for error messages about DMs

---

## Ready to Run!

**Your command:**

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot && python bot_auto_detect.py
```

**Expected output:**

```
Starting Grammar Teacher Bot (Auto-Detection Mode)...
Monitoring all messages 24/7
Sending private DM corrections
Users can dismiss messages
Users can opt-out with /autocheck off
Grammar Teacher Bot#1234 is online!
Grammar checking: Enabled
Auto-detection: Active
Synced 3 slash commands
```

**You're all set!** The bot is now monitoring messages and helping users improve their grammar!
