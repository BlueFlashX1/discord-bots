# 🚀 Quick Start Guide - Grammar Teacher Bot

## ✅ Bot Status

Your bot is **RUNNING** and ready to use!

---

## 📋 Step-by-Step: How to Use

### 1️⃣ Check Bot is Online in Discord

1. Open Discord
2. Go to your server: **「 🫧 CurioSscales 🫧 ﮩ٨ـ♡ﮩ٨ 」's Lab**
3. Look at the member list (right side)
4. Find your bot - should show as **Online** (green dot)
5. Status should say: **"Grammar checking | /autocheck"**

---

### 2️⃣ Test Slash Commands

**Important:** Commands may take 5-60 minutes to appear after first sync!

#### Try typing `/` in any channel:

You should see these commands:

**Option 1: Toggle Auto-Check**

```
/autocheck on    → Enable automatic checking
/autocheck off   → Disable automatic checking
```

**Option 2: Manual Grammar Check**

```
/check I has went to the store yesterday
```

- Bot will show you all errors
- Provides multiple suggestions
- Shows corrected sentence

**Option 3: View Your Stats**

```
/stats
```

- See your accuracy rate
- View error breakdown
- Get smart recommendations
- See if you're improving

---

### 3️⃣ Test Auto-Correction (Works Immediately!)

**Even if slash commands aren't showing yet, auto-correction works!**

1. Go to any channel in your server
2. Type a message with a grammar error:
   ```
   I has went to the store yesterday
   ```
3. Send the message
4. Wait 2-3 seconds
5. **Bot will reply with correction** (only you can see it!)

#### What You'll See:

- ✍️ A reply to your message
- 📝 Your original message
- ⚠️ Issues found with suggestions
- ✅ Fully corrected sentence at bottom
- Buttons: "✓ Dismiss" and "Turn Off Auto-Check"

---

## 🎯 Testing Checklist

### ✅ Verify Bot Works:

- [ ] Bot shows as Online in Discord
- [ ] Type a message with error → Get correction
- [ ] Correction appears only to you (ephemeral)
- [ ] Can dismiss the correction
- [ ] Original message gets ✍️ reaction

### ✅ Slash Commands (after 5-60 min):

- [ ] Type `/` and see bot commands
- [ ] Try `/autocheck on`
- [ ] Try `/check <some text>`
- [ ] Try `/stats`

---

## 🔧 If Commands Don't Appear

### Option 1: Wait & Reload

1. Wait 5-10 minutes
2. Press **Cmd+R** (Mac) or **Ctrl+R** (Windows) in Discord
3. Type `/` again

### Option 2: Re-invite Bot with Correct Permissions

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** → **URL Generator**
4. Select scopes:
   - ☑️ `bot`
   - ☑️ `applications.commands` ← **CRITICAL!**
5. Select permissions:
   - ☑️ Read Messages/View Channels
   - ☑️ Send Messages
   - ☑️ Embed Links
   - ☑️ Add Reactions
6. Copy the URL and open it
7. Re-authorize to your server
8. Commands should appear instantly!

---

## 💡 Pro Tips

### For Best Experience:

1. **Keep auto-check ON** to learn from every message
2. **Check `/stats` weekly** to track improvement
3. **Use `/check`** before sending important messages
4. **Dismiss corrections** you don't need

### Privacy Features:

- ✅ All corrections only visible to you
- ✅ Other users can't see your errors
- ✅ Stats track patterns but don't show content
- ✅ Dismiss button hides corrections instantly

### Smart Features:

- 🎯 Only shows important errors (grammar, spelling, typos)
- ⏱️ 5-minute cooldown to avoid spam
- 📊 Trend analysis shows if you're improving
- 💡 Personalized recommendations based on your patterns

---

## 🎮 Example Usage

### Scenario 1: Learning Mode

```
You type: "I has went to the store yesterday"
```

**Bot responds (only you see):**

```
✍️ Grammar Suggestions
Found 2 issue(s) in your message:

📝 Original Message
```

I has went to the store yesterday

```

Issue #1: Grammar
Problem: Incorrect verb form
In: ...I has went to the store...
Suggestions:
• have gone
• had gone
• went

Issue #2: Grammar
Problem: Subject-verb agreement
In: ...I has went...
Suggestions:
• have
• had

✅ Fully Corrected Version
```

I went to the store yesterday

```

```

### Scenario 2: Manual Check

```
You type: /check The email are send tomorrow
```

**Bot responds:**

```
Found 2 Errors

Issue 1: Subject-verb agreement
Context: The email are send
Suggestion: is

Issue 2: Verb form
Context: are send tomorrow
Suggestion: sent, will be sent

Corrected Version:
The email is sent tomorrow
or
The email will be sent tomorrow
```

### Scenario 3: Track Progress

```
You type: /stats
```

**Bot shows:**

```
📊 Grammar Statistics for YourName

📝 Activity
**152** total checks
**148** messages monitored
**4** manual checks

⚠️ Errors Found
**23** total issues
**21** auto-corrections

🟢 Accuracy Rate
**85.8%** error-free messages
⭐⭐⭐⭐

📈 Error Breakdown
📖 Grammar: **12** (52%)
✏️ Spelling: **8** (35%)
⌨️ Typos: **3** (13%)

📊 Recent Trend
📉 **Improving!** Fewer recent errors

💡 Smart Recommendations
• Grammar issue repeated 5x: Focus on sentence structure
• Spelling pattern (3x): Review commonly misspelled words

✅ Auto-Check Status
**Enabled**
```

---

## 🛠️ Management Commands

### Check Bot Status:

```bash
cd ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

./manage_startup.sh status
```

### View Logs:

```bash
./manage_startup.sh logs
```

### Restart Bot:

```bash
./manage_startup.sh restart
```

### Stop Bot:

```bash
./manage_startup.sh stop
```

### Start Bot:

```bash
./manage_startup.sh start
```

---

## 📚 Documentation

All guides available:

- `COMMANDS_STATUS.md` - Full status & troubleshooting
- `SLASH_COMMANDS_GUIDE.md` - Detailed command reference
- `UPDATE_CHANGELOG.md` - What changed today
- `AUTO_STARTUP_GUIDE.md` - Auto-startup management
- `QUICK_START.md` - This file!

---

## 🆘 Quick Troubleshooting

| Problem                  | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| Bot offline              | `./manage_startup.sh start`                           |
| No corrections appearing | Check `/autocheck on` is enabled                      |
| Commands not showing     | Wait 1 hour OR re-invite with `applications.commands` |
| Discord not updating     | Reload Discord (Cmd+R / Ctrl+R)                       |
| Want to disable          | `/autocheck off` or click "Turn Off" button           |

---

## ✨ You're All Set!

Your bot is:

- ✅ Running 24/7
- ✅ Auto-starts on login
- ✅ Ready to help improve your grammar
- ✅ Completely private (only you see corrections)

**Start testing now!** Type a message with an error in your Discord server! 🚀

---

## 🎯 Next Steps

1. **Immediate:** Test auto-correction by typing a message with an error
2. **5-10 minutes:** Try slash commands (after they propagate)
3. **1 day:** Check `/stats` to see your progress
4. **1 week:** Review recommendations and see improvement trends

Happy writing! 📝✨
