# Reminder Bot Timezone Fixes (2026-02-07)

## Overview
Fixed critical timezone bugs that caused reminder times to be parsed, stored, and displayed incorrectly.

## Problems Identified

### 1. Missing `pytz` Import
**Symptom:** All time inputs (e.g., "9pm") returned "Invalid time format" error  
**Root Cause:** Code used `pytz.timezone()` but never imported `pytz`  
**Impact:** Complete failure of time parsing

**Fix:**
```python
# Added to reminder-bot/commands/remind.py line 7
import pytz
```

---

### 2. Timezone-Naive vs Timezone-Aware Comparison
**Symptom:** `TypeError: can't compare offset-naive and offset-aware datetimes`  
**Root Cause:** Comparing timezone-aware `remind_at_dt` with naive `datetime.utcnow()`  
**Impact:** Reminders couldn't be validated as "in the future"

**Fix:**
```python
# OLD (line 212, 333):
if remind_at_dt <= datetime.utcnow():

# NEW:
local_tz = pytz.timezone("America/Denver")
now = datetime.now(local_tz)
if remind_at_dt <= now:
```

---

### 3. Wrong Timezone (PST vs MST)
**Symptom:** Times displayed 1 hour late (9pm showed as 10pm)  
**Root Cause:** Hardcoded `America/Los_Angeles` (PST UTC-8) but user is in MST (UTC-7)  
**Impact:** All times off by 1 hour

**Calculation:**
- Input: "9pm"
- Parsed as: 21:00 PST (UTC-8) = 05:00 UTC
- Discord displays to MST viewer: 05:00 UTC = 22:00 MST (10pm) ❌

**Fix:**
```python
# Changed all 3 occurrences (lines 40, 212, 333):
# OLD:
local_tz = pytz.timezone("America/Los_Angeles")

# NEW:
local_tz = pytz.timezone("America/Denver")
```

---

### 4. Missing UTC Conversion for Storage
**Symptom:** Reminders would fire at wrong time  
**Root Cause:** Storing local time but checker uses UTC  
**Impact:** Reminders would fire 7 hours late

**Fix:**
```python
# Added before storing (lines 234-238, 352-356):
# Convert to UTC for storage (reminder_service uses UTC)
remind_at_utc = remind_at_dt.astimezone(pytz.UTC)

reminder_data = {
    "user_id": str(ctx.author.id),
    "message": message,
    "time": remind_at_utc,  # Changed from remind_at_dt
    ...
}
```

---

### 5. Poor UX for Canceling Reminders
**Symptom:** Users had to copy-paste long UUIDs  
**Root Cause:** No autocomplete/lookup mechanism  
**Impact:** Difficult to cancel reminders

**Fix:**
```python
# Added autocomplete to reminder-bot/commands/cancel.py
async def reminder_autocomplete(
    self, interaction: discord.Interaction, current: str
) -> List[app_commands.Choice[str]]:
    """Autocomplete handler for reminder selection."""
    reminders = self.data.get_user_reminders(interaction.user.id)
    sorted_reminders = sorted(reminders, key=lambda r: r.get("remind_at", ""))
    
    choices = []
    for i, reminder in enumerate(sorted_reminders[:25], 1):
        message = reminder.get("message", "No message")[:80]
        remind_at = reminder.get("remind_at", "")[:19]
        label = f"{i}. {message[:50]} ({remind_at})"
        choices.append(app_commands.Choice(name=label, value=reminder["id"]))
    
    return choices

@app_commands.autocomplete(reminder=reminder_autocomplete)
```

---

## Files Modified

### `/commands/remind.py`
- Added `import pytz` (line 7)
- Changed timezone from `America/Los_Angeles` to `America/Denver` (lines 40, 212, 333)
- Fixed datetime comparison using timezone-aware `now` (lines 212-214, 333-335)
- Added UTC conversion before storage (lines 234-238, 352-356)

### `/commands/cancel.py`
- Completely rewrote to use autocomplete dropdown
- Added `reminder_autocomplete()` function
- Users now see numbered list: "1. Message... (timestamp)"

---

## Testing Results

✅ **Time Parsing:** "9pm" correctly parses to 21:00 MST  
✅ **Storage:** Stored as 04:00 UTC (9pm MST = 04:00 UTC next day)  
✅ **Display:** Discord shows 9:00 PM in user's timezone  
✅ **Cancel UX:** Dropdown shows numbered reminders, no UUID copy-paste needed  

---

## Deployment Notes

**VPS Location:** `root@64.23.179.177:/root/discord-bots/reminder-bot/`  
**PM2 Process:** `reminder-bot`  
**Restart Command:** `pm2 restart reminder-bot`

**Verification:**
```bash
# Check logs for errors
pm2 logs reminder-bot --lines 50

# Verify timezone settings
ssh root@64.23.179.177 "grep 'America/' /root/discord-bots/reminder-bot/commands/remind.py"
```

---

---

### 6. Service Checker: Naive vs Aware Comparison (Reminders Never Fired)
**Symptom:** Reminders set correctly (e.g. daily 9pm) never triggered; no @ mention in channel  
**Root Cause:** `reminder_service._check_reminders()` used `now = datetime.utcnow()` (naive). Stored `remind_at` is timezone-aware UTC (from remind command). Comparing `remind_at <= now` raised `TypeError: can't compare offset-naive and offset-aware datetimes`. Exception was caught, reminder skipped, no notification sent.  
**Impact:** No reminders fired after the 2026-02-07 timezone fix (command stored UTC-aware; service still used naive now).

**Fix (2026-02-08):**
```python
# services/reminder_service.py

# OLD:
now = datetime.utcnow()
remind_at = datetime.fromisoformat(reminder["remind_at"])
if remind_at <= now:  # TypeError if remind_at is aware

# NEW:
import pytz
UTC = pytz.UTC
now = datetime.now(UTC)
raw = reminder["remind_at"]
remind_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
if remind_at.tzinfo is None:
    remind_at = UTC.localize(remind_at)
if remind_at <= now:
```

Also added:
- **fetch_user fallback:** If `get_user()` returns None (user not in cache after restart), try `await self.bot.fetch_user(user_id)` so the reminder can still be sent with @ mention.
- **Recurring next_time:** Ensure `next_time` is UTC-aware before storing (e.g. after `_get_next_recurring_time`).
- **Duplicate except:** Removed duplicate `except` block in `_send_reminder`.

### Files Modified (2026-02-08)

- **`/services/reminder_service.py`**
  - Use `datetime.now(pytz.UTC)` for checker loop.
  - Parse `remind_at` with `.replace("Z", "+00:00")` and localize if naive.
  - Fallback to `fetch_user` when `get_user` is None.
  - Normalize recurring `next_time` to UTC-aware before save.
  - Remove duplicate exception handler in channel send.

---

## Future Improvements

1. **Per-User Timezone:** Store user timezone preferences instead of hardcoding
2. **Configuration:** Move timezone to config file or environment variable
3. **Old Reminder Migration:** Script to convert old naive datetime reminders to UTC
4. **Timezone Detection:** Auto-detect user timezone from Discord server settings

---

## Related Documentation

- Original bug report: `time_conversion_bug_fix.md`
- Service checker fix: `reminder_service_timezone_fix.md`
- Implementation plan: `implementation_plan.md`
