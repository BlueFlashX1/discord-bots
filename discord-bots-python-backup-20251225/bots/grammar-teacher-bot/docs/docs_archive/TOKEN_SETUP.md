# Where to Put Your Bot Token - Visual Guide

## Step 1: Get Your Token from Discord

1. Go to: https://discord.com/developers/applications
2. Select your application (or create one if you haven't)
3. Click "Bot" in the left sidebar
4. Under "TOKEN" section, click "Reset Token"
5. Click "Copy" - this copies your token to clipboard

**Your token looks like this:**

```
MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz
```

(This is fake - yours will be different!)

---

## Step 2: Put Token in .env File

### Option A: Using Text Editor (Easiest)

1. **Open the .env file** in your bot folder:

   ```
   /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/.env
   ```

2. **You'll see this:**

   ```
   BOT_TOKEN_GRAMMAR=YOUR_TOKEN_HERE
   ```

3. **Replace `YOUR_TOKEN_HERE` with your actual token:**

   ```
   BOT_TOKEN_GRAMMAR=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz
   ```

4. **Save the file** (Cmd+S)

**IMPORTANT:**

- No spaces around the `=` sign
- No quotes around the token
- Token should be on the same line as `BOT_TOKEN_GRAMMAR=`

### Option B: Using Terminal

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Edit with nano (simple text editor)
nano .env

# Paste your token after BOT_TOKEN_GRAMMAR=
# Press Ctrl+X to exit
# Press Y to save
# Press Enter to confirm
```

### Option C: Using VS Code

1. Open VS Code
2. Open the folder: `grammar-teacher-bot`
3. Look for `.env` file in the file explorer (left sidebar)
   - If you don't see it, click the refresh icon or press Cmd+Shift+E
4. Click on `.env` to open it
5. Replace `YOUR_TOKEN_HERE` with your actual token
6. Save (Cmd+S)

---

## Visual Example

### BEFORE (What you have now):

```
File: .env
─────────────────────────────────────────
BOT_TOKEN_GRAMMAR=YOUR_TOKEN_HERE
─────────────────────────────────────────
```

### AFTER (What it should look like):

```
File: .env
─────────────────────────────────────────────────────────────────────────
BOT_TOKEN_GRAMMAR=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGh
─────────────────────────────────────────────────────────────────────────
```

(Your token will be different - this is just an example!)

---

## Common Mistakes to Avoid

### ❌ WRONG - Has extra spaces:

```
BOT_TOKEN_GRAMMAR = YOUR_TOKEN_HERE
```

### ❌ WRONG - Has quotes:

```
BOT_TOKEN_GRAMMAR="YOUR_TOKEN_HERE"
```

### ❌ WRONG - Token on next line:

```
BOT_TOKEN_GRAMMAR=
YOUR_TOKEN_HERE
```

### ✅ CORRECT:

```
BOT_TOKEN_GRAMMAR=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKl
```

---

## Verify Your Token is Set

Run this command to check if your token is loaded correctly:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('Token found!' if os.getenv('BOT_TOKEN_GRAMMAR') and os.getenv('BOT_TOKEN_GRAMMAR') != 'YOUR_TOKEN_HERE' else 'Token not set - check .env file')"
```

**Expected output:**

- ✅ `Token found!` - You're good to go!
- ❌ `Token not set` - Check your .env file again

---

## Security Reminder

**NEVER share your token!**

- Don't post it in Discord
- Don't commit it to GitHub
- Don't screenshot it
- Keep it secret!

If your token is exposed, go to Developer Portal and click "Reset Token" immediately!

---

## File Location Reference

**Your .env file is here:**

```
/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/
  └── active/
      └── discord-bots/
          └── bots/
              └── grammar-teacher-bot/
                  └── .env  ← RIGHT HERE!
```

**To navigate there in terminal:**

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
```

**To open in Finder:**

```bash
open /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot
```

---

## Quick Test

After setting your token, test if it works:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

python bot_auto_detect.py
```

**If token is correct, you'll see:**

```
Starting Grammar Teacher Bot (Auto-Detection Mode)...
Monitoring all messages 24/7
[BotName]#1234 is online!
```

**If token is wrong, you'll see:**

```
ERROR: No bot token found!
Add BOT_TOKEN_GRAMMAR to your .env file
```

---

## Still Stuck?

1. **Make sure .env file exists**

   ```bash
   ls -la /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/.env
   ```

   Should show the file. If not, create it!

2. **Check file contents**

   ```bash
   cat /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/.env
   ```

   Should show: `BOT_TOKEN_GRAMMAR=your_actual_token`

3. **Make sure no hidden characters**
   - Copy token directly from Developer Portal
   - Paste directly into .env file
   - Don't manually type it (too long and error-prone!)

---

## Summary

**3 Simple Steps:**

1. **Get token** - Copy from Discord Developer Portal
2. **Open .env** - Located in `grammar-teacher-bot/` folder
3. **Paste token** - Replace `YOUR_TOKEN_HERE` with your actual token

That's it! Your token is now configured.
