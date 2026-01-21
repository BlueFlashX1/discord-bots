# 🔍 Auto-Detection Mode - 24/7 Grammar Monitoring

## ✅ What You Asked For

> "detect 24/7 without needing commands but still keep it visible to the affected user only to avoid spamming and allow em to dismiss the msg"

**DONE!** Perfect solution implemented! ✅

---

## 🎯 How It Works

### File: `bot_auto_detect.py`

**24/7 Monitoring:**

- Bot reads **EVERY message** in the server
- Automatically checks for grammar errors
- Sends **PRIVATE corrections** via DM
- User can **DISMISS** the message with a button
- User can **DISABLE** auto-check anytime

```
User in #general: "I has went to the store"

Others see:                User receives (DM):
┌───────────────┐         ┌──────────────────────────┐
│ (normal chat) │         │ 💡 Grammar Tip           │
│               │         │ "has went" → "went"      │
│               │         │                          │
│               │         │ [✅ Dismiss] [🔕 Disable]│
└───────────────┘         └──────────────────────────┘
```

---

## 🌟 Key Features

### 1. **24/7 Auto-Detection**

- ✅ Monitors all messages in real-time
- ✅ No commands needed
- ✅ Automatic grammar checking
- ✅ Smart filtering (only important errors)

### 2. **Private DM Corrections**

- ✅ Sent via Direct Message
- ✅ Only the user sees them
- ✅ No public embarrassment

- ✅ No channel spam

### 3. **Dismissible Messages**

- ✅ **"Dismiss" button** - close the correction

- ✅ **"Disable Auto-Check" button** - turn off completely
- ✅ **5-minute timeout** - auto-dismiss if ignored

### 4. **Smart Features**

- ✅ **Cooldown system** - Max 1 correction per 5 minutes (not annoying!)
- ✅ **Filters minor issues** - Only shows important errors
- ✅ **Ignores short messages** - Skip "ok", "lol", etc.

- ✅ **Ignores commands** - Skip `/`, `!`, `?` commands
- ✅ **Ignores code blocks** - Skip `code`
- ✅ **Opt-out available** - Use `/autocheck off`

### 5. **User Control**

```
### 5. **User Control**

```

/autocheck on - Enable 24/7 monitoring (grammar + spelling)
/autocheck off - Disable 24/7 monitoring
/check <text> - Manual grammar check (command only)
/stats - View your statistics (command only)

```

---

## 🤖 Automatic vs Manual Features

### ✅ AUTOMATIC (24/7 Detection):
- **Grammar errors** - Auto-detected and corrected
- **Spelling errors** - Auto-detected and corrected
- **Typos** - Auto-detected and corrected

### 💬 MANUAL (Commands Only):
- **Manual checks** - Use `/check <text>`
- **Statistics** - Use `/stats`
- **Tips/suggestions** - Use `/check` for detailed feedback
- **Enable/disable** - Use `/autocheck on/off`

**Summary:** Only grammar + spelling are automatic. Everything else requires commands!

---

## 📊 What Gets Checked
```

---

## 📊 What Gets Checked

### ✅ Monitord

- Regular conversation messages
- Messages with 10+ characters
- Grammar, spelling, typos
- Important errors only

### ❌ Ignored

- Bot messages
- Commands (`/`, `!`, `?`, `.`)
- Very short messages (< 10 chars)
- URLs and links
- Emoji-only messages

- Code blocks (```)
- Messages from users who opted out

---

## 🔒 Privacy & Anti-Sam

### Privacy Protection

1. **DMs only** - Corrections sent privately
2. **No public messages** - Channel stays clean
3. **User-specific** - Only affects individual users
4. **Opt-out available** - Can disable anytime

### Anti-Spam Features

1. **5-minute cooldown** - Max 1 correction per user per 5 mins
2. **Smart filtering** - Only important errors (grammar/spelling)

3. **Limit to 3 errors** - Don't overwhelm users
4. **Auto-dismiss timeout** - Messages expire after 5 minutes

---

## 💡 User Experience

### Example Flow

**1. User types normally:**

```
User in #general: "I has went to the store yesterday"
```

**2. Bot detects error (privately):**

```
[DM from Grammar Teacher Bot]
┌────────────────────────────────────────┐
│ 💡 Grammar Tip                         │
│                                        │
│ I noticed an issue in your message:    │
│                                        │
│ 📝 Your Message                        │
│ "I has went to the store yesterday"   │
│                                        │
│ Issue 1: Grammar error                │
│ Suggestion: went                       │
│                                        │
│ ✨ Suggested Correction                │

│ "I went to the store yesterday"       │
│                                        │
│ 💡 Auto-detected • Only you see this  │
│ Use /autocheck off to disable          │
│                                        │

│ [✅ Dismiss] [🔕 Disable Auto-Check]   │
└────────────────────────────────────────┘
```

**3. User's choices:**

**Option A: Dismiss**

- Click "✅ Dismiss"
- Message disappears
- Bot continues monitoring

**Option B: Disable**

- Click "🔕 Disable Auto-Check"
- Bot stops monitoring this user
- Can re-enable with `/autocheck on`

**Option C: Ignore**

- Do nothing
- Message auto-dismisses after 5 minutes
- Bot continues monitoring

---

## 📈 Statistics Traking

Bot tracks for each user:

- **Messages monitored** - How many checked
- **Auto-corrections sent** - How many errors found
- **Manual checks** - How many `/check` commands used
- **Total errors found** - Cumulative count
- **Last active** -Last interaction time

View with: `/stats`

---

## ⚙️ Configuration

### Default Settings

- **Auto-check:** Enabled for everyone
- **Cooldown:** 5 minutes between corrections
- **Error limit:** Show max 3 errors per message
- **Min message length:** 10 characters
- **Language:** English (US)
- **Timeout:** DM buttons expire after 5 minutes

### User Can Change

```
/autocheck on    - Enable monitoring
/autocheck off   - Disable monitoring
```

---

## 🆚 Comparison: All 3 Versions

| Feature          | `bot.py`          | `bot_private.py`  | `bot_auto_detect.py` |
| ---------------- | ----------------- | ----------------- | -------------------- |
| **Detection**    | Manual (`!check`) | Manual (`/check`) | **24/7 Auto**        |
| **Privacy**      | ❌ Public         | ✅ Ephemeral      | ✅ Private DM        |
| **User Control** | Must type command | Must type command | **Always on**        |
| **Dismissible**  | ❌ No             | ⚠️ Auto-delete    | ✅ **Button**        |
| **Spam Control** | ❌ None           | ✅ Ephemeral      | ✅ **Cooldown**      |
| **Opt-out**      | N/A               | N/A               | ✅ `/autocheck off`  |
| **Best For**     | Teaching          | Privacy           | **24/7 Learning**    |

---

## 🚀 How to Use

### 1. Run the Bot

```bash

cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

python bot_auto_detect.py
```

### 2. Bot Starts Monitoring

```
✅ Bot is online!
🔍 Auto-detection: Active
📧 Sending DM corrections
```

### 3. Important:DM Permissions

**Users must allow DMs from server members!**

If user has DMs disabled:

- Bot can't send corrections
- Fails silently (no spam)
- User should enable DMs: Server Menu → Privacy Settings → Allow DMs

### 4. Start Chatting

Bot monitors automatically:

- No commands needed
- Corrections sent via DM
- Users can dismiss or disable

---

## 🎯 Perfect For

✅ **English learning servers** - Constant feedback
✅ **Study groups** - Passive learning
✅ **Writing communities** - Improve naturally
✅ **Professional servers** - Maintain quality
✅ **Education servers** - 24/7 teaching assistant

---

## 🔧 Technical Details

### How Auto-Detection Works

```python
@bot.event
async def on_message(message):
    # 1. Check if should ignore (bots, commands, short msgs)
    if should_ignore_message(message):
        return

    # 2. Check if user opted out
    if not is_auto_check_enabled(user):
        return

    # 3. Check cooldown (5 min limit)
    if is_on_cooldown(user):
        return

    # 4. Run grammar check
    errors = tool.check(message.content)

    # 5. Filter important errors only
    important = filer_important(errors)

    # 6. Send private DM with dismiss button
    if important:
        await user.send(correction_embed, view=DismissView())
```

### Message Filtering Logic

```python
Ignored if:
- From a bot
- Starts with /, !, ?, .
- Less than 10 characters
- Contains code bloks

- Only emojis or URLs
- User opted out
- User on cooldown
```

### Cooldown System

```python
- Per-user basis
- 5 minutes between corrections
- Prevents spam
- Resets after correction sent
- No limit on manual /check commands
```

---

## 💡 Tips for Users

### Getting Started

1. **Enable DMs** - Allow messages from server members
2. **Start chatting** - Bot monitors automatically
3. **Learn passively** - Get corrections in DMs
4. **Dismiss or disable** - Full control

### Managing Corrections

- **Too many?** → Use `/autocheck off`
- **Want more?** → Already max frequency!
- \*_Manual check?_ → Use `/check <text>`

- **See stats?** → Use `/stats`

---

## 🎉 Summary

### What You Get

✅ **24/7 monitoring** - No commands needed
✅ **Private DM corrections** - Only you see them  
✅ **Dismissible buttons** - Close or disable
✅ **Smart filtering** - Only importan errors
✅ **Cooldown system** - Not annoying (5 min)
✅ **Opt-out available** - Full user control
✅ **Stats tracking** - See your progress
✅ **English only** - Configured for English (US)

---

## 🚨 Important Notes

### DM Requirement

- Bot **CANNOT** send ephemeral messages outside of slash command responses
- **MUST** use DMs for auto-detection corrections
- Users need DMs enabled from server members

### Alternative (If DMs Don't Work)

- Bot silently skips that user
- No errors or spam
- User can use `/check` manually

---

## 🎯 This is EXACTLY What You Wanted

✅ **Detects 24/7** - Always monitoring
✅ **No commands needed** - Automatic
✅ **Visible to user only** - Private DMs
✅ **Dismissible** - Button to close
✅ **Avoids spam** - 5-minute cooldown
✅ **User control** - Can disable anytime

**Perfect solution!** 🎊
