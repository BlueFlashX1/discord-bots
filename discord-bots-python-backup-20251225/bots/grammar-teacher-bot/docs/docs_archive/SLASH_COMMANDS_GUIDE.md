# 🎯 Grammar Bot Slash Commands - Quick Reference

## Available Commands

### 1. `/autocheck` - Toggle Auto-Correction

**Description:** Enable or disable automatic grammar checking on your messages

**Usage:**

```
/autocheck on   → Enable auto-checking
/autocheck off  → Disable auto-checking
```

**What it does:**

- ✅ **ON**: Bot automatically checks every message you send
- ❌ **OFF**: Bot ignores your messages (you can still use `/check`)
- Default: **ON** for all users
- Cooldown: 5 minutes between auto-corrections

**When to use:**

- Turn OFF when chatting casually or testing things
- Turn ON to improve your writing quality
- Great for learning and improving grammar

---

### 2. `/check` - Manual Grammar Check

**Description:** Manually check grammar in any text (only you see the result)

**Usage:**

```
/check <your text here>
```

**Example:**

```
/check I has went to the store yesterday
```

**What it shows:**

- All grammar errors found
- Spelling mistakes
- Typos and punctuation issues
- Suggestions for each error
- Fully corrected version

**When to use:**

- Check text before sending important messages
- Verify email/document content
- Learn from mistakes before posting
- No cooldown - use as much as you want!

---

### 3. `/stats` - View Your Statistics

**Description:** View your grammar statistics and improvement trends

**Usage:**

```
/stats
```

**What it shows:**

- 📝 **Activity**: Total messages checked, manual checks
- ⚠️ **Errors Found**: Total issues detected
- 🟢 **Accuracy Rate**: Percentage of error-free messages (with star rating!)
- 📈 **Error Breakdown**: Grammar vs Spelling vs Typos (with percentages)
- 📊 **Recent Trend**: Are you improving or need to slow down?
- 💡 **Smart Recommendations**: Personalized tips based on your patterns
- ✅ **Auto-Check Status**: Current on/off state
- 🕐 **Last Active**: When you last used the bot

**Visual Features:**

- 🟢 Green dot = 90%+ accuracy (excellent!)
- 🟡 Yellow dot = 75-89% accuracy (good)
- 🔴 Red dot = <75% accuracy (needs improvement)
- ⭐ Star rating (1-5 stars based on accuracy)
- 📉 Trend arrow showing if you're improving
- Error percentages showing which type you struggle with most

**What's NOT shown (but tracked):**

- Full error history (kept private, only used for trends)
- Exact error messages (only counts and types)
- Your actual message content

**When to use:**

- Check your progress weekly
- See which error types you make most often
- Get personalized improvement tips
- Motivate yourself with accuracy stats!

---

## Why Aren't Commands Showing Up?

### Issue: Commands not appearing when you type `/`

**Causes:**

1. **Bot lacks permissions** - Must have `application.commands` scope
2. **Commands not synced yet** - Can take up to 1 hour for global sync
3. **Guild (server) not synced** - Updated code now syncs instantly per-guild

**Solution:**
The bot now uses **dual sync**:

- ✅ **Global sync**: Commands work everywhere (takes up to 1 hour)
- ✅ **Guild sync**: Commands work in your server **instantly**

**Check bot logs:**

```bash
tail -f /path/to/logs/bot_error.log | grep "Synced"
```

You should see:

```
Synced 3 slash commands globally
Synced 3 commands to guild: YourServerName
```

### If commands still don't appear:

1. **Re-invite bot with correct permissions:**

   - Go to Discord Developer Portal
   - OAuth2 → URL Generator
   - Select: `bot` + `applications.commands`
   - Permissions: Send Messages, Read Messages, Embed Links
   - Copy new invite URL and re-invite bot

2. **Restart Discord:**

   - Sometimes Discord client needs refresh
   - Close Discord completely and reopen
   - Or use Ctrl+R (Cmd+R on Mac) to reload

3. **Wait 5-10 minutes:**

   - Guild sync is instant but may need client refresh
   - Global sync can take up to 1 hour

4. **Check bot is online:**
   - Bot should show as "Online" in member list
   - Should have status: "Grammar checking | /autocheck"

---

## Command Privacy

All commands are **ephemeral** (only you see them):

- ✅ `/autocheck` - Only you see the response
- ✅ `/check` - Only you see the grammar check
- ✅ `/stats` - Only you see your stats

**Auto-corrections** appear as:

- Reply to your message (looks public)
- But marked as "Only you can see this"
- Other users can't see the correction
- Can be dismissed with button

---

## Quick Tips

### Getting Started

1. Type `/autocheck on` to enable
2. Send a test message with an error
3. Wait for correction to appear
4. Use `/stats` to see your progress

### Best Practices

- Keep auto-check ON for learning
- Use `/check` before sending important messages
- Check `/stats` weekly to track improvement
- Turn OFF during casual chats if you prefer

### Cooldowns

- Auto-check: 5 minutes between corrections
- Manual `/check`: No cooldown
- `/stats`: No cooldown

### Privacy

- All corrections are private
- Stats only show counts, not content
- History tracked but never displayed
- Dismiss button hides corrections instantly

---

## Troubleshooting

### "Commands not showing"

- Wait 5-10 minutes after bot restart
- Reload Discord (Ctrl+R / Cmd+R)
- Check bot permissions
- Re-invite with applications.commands scope

### "Not getting corrections"

- Check `/autocheck on` is enabled
- Wait 5 minutes (cooldown)
- Message must be >10 characters
- No commands/code blocks/URLs

### "Stats showing wrong info"

- Data updates in real-time
- Trends need at least 5 errors
- Recommendations need 3+ of same error
- Everything tracked, just not all displayed

---

## Summary

| Command         | Purpose              | Visibility | Cooldown |
| --------------- | -------------------- | ---------- | -------- |
| `/autocheck`    | Toggle auto-checking | Private    | None     |
| `/check <text>` | Manual grammar check | Private    | None     |
| `/stats`        | View statistics      | Private    | None     |

All commands are **instant**, **private**, and **helpful**! 🎉
