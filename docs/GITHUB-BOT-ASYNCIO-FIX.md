# GitHub Bot AsyncIO Error - Root Cause Analysis & Fix

**Date:** January 22, 2026 (deployment fix); January 24, 2026 (code fix)  
**Duration:** Extended debugging session  
**Severity:** Critical - Bot completely non-functional  
**Status:** RESOLVED

---

## The Error

```
Error fetching stats: name 'asyncio' is not defined
Error fetching activity: name 'asyncio' is not defined
Error updating contributions for <username>: name 'asyncio' is not defined
```

These errors appeared when users ran `/stats` or `/activity` in Discord, or when the hourly contribution tracker ran in the background.

---

## Root Cause Analysis

**The error was NOT a code issue.** The actual problem was a **multi-layer deployment failure**:

### Layer 1: Uncommitted ecosystem.config.js

The `ecosystem.config.js` file had local changes that were **never committed to git**:
- The github-bot, reminder-bot, and exercism-bot were added to the local config
- These changes (234 lines) were never pushed to the repository
- The VPS was running an **old version** of the config that didn't include github-bot

**Symptom:** PM2 on VPS didn't know github-bot existed, so it was never started.

### Layer 2: Failed git pull on VPS

The GitHub Actions deployment used `git pull origin main`, which was **silently failing**:
```
error: Your local changes to the following files would be overwritten by merge:
    github-bot/github_service.py
    github-bot/track.py
Please commit your changes or stash them before you merge.
```

**Symptom:** Even when code was pushed to GitHub, the VPS never received the updates.

### Layer 3: PM2 reload vs start

After fixing Layer 2, we used `pm2 reload` which only restarts **running** processes:
- We deleted github-bot, reminder-bot, exercism-bot first
- Then `pm2 reload` didn't restart them because they weren't running
- They were never re-added to PM2

**Symptom:** Bots were deleted but never started again.

---

## The Fixes Applied

### Fix 1: Force reset VPS repository

Changed `deploy.yml` from:
```yaml
git pull origin main
```

To:
```yaml
git fetch origin main
git reset --hard origin/main
git clean -fd
```

This ensures VPS always matches the remote exactly, discarding any local changes.

### Fix 2: Use pm2 start instead of reload

Changed `deploy.yml` from:
```yaml
pm2 delete github-bot 2>/dev/null || true
pm2 delete reminder-bot 2>/dev/null || true
pm2 delete exercism-bot 2>/dev/null || true
pm2 reload ecosystem.config.js || pm2 restart all
```

To:
```yaml
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
```

This ensures ALL bots defined in ecosystem.config.js are started fresh.

### Fix 3: Commit ecosystem.config.js

The ecosystem.config.js had local changes that were never committed:
```bash
git add ecosystem.config.js
git commit -m "Add github-bot, reminder-bot, exercism-bot to ecosystem config"
git push origin main
```

---

## Final deploy.yml

```yaml
name: Deploy to DigitalOcean VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          script: |
            cd /root/discord-bots

            # Force reset to match remote (discard any local changes on VPS)
            git fetch origin main
            git reset --hard origin/main
            git clean -fd

            # Update dependencies for each bot
            for bot in coding-practice-bot command-control-bot hangman-bot spelling-bee-bot grammar-bot "todoist bot" reddit-filter-bot youtube-monitor-bot; do
              if [ -d "$bot" ] && [ -f "$bot/package.json" ]; then
                echo "Updating dependencies for $bot..."
                cd "$bot"
                npm install --production
                cd /root/discord-bots
              fi
            done

            # Clear Python bytecode cache for Python bots
            echo "Clearing Python bytecode cache..."
            find /root/discord-bots -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
            find /root/discord-bots -name "*.pyc" -delete 2>/dev/null || true

            # Stop all bots, then start fresh from ecosystem config
            echo "Restarting all bots from ecosystem config..."
            pm2 delete all 2>/dev/null || true
            pm2 start ecosystem.config.js

            # Save PM2 configuration
            pm2 save

            # Show status
            pm2 list
```

---

## Key Lessons Learned

### 1. Always commit configuration files
- `ecosystem.config.js` changes must be committed and pushed
- Use `git status` to check for uncommitted changes before debugging

### 2. Check deployment logs first
- Use `gh run view <run_id> --log` to see what's actually happening
- Look for git errors, PM2 errors, or missing files

### 3. Use `git reset --hard` for server deployments
- VPS should never have local changes
- Force reset ensures code matches repository exactly

### 4. Use `pm2 start` not `pm2 reload` after deleting processes
- `pm2 reload` only restarts running processes
- `pm2 start ecosystem.config.js` starts all defined apps

### 5. Check PM2 list to verify bots are running
```bash
pm2 list
```
If a bot isn't in the list, it's not running!

### 6. If "asyncio is not defined" returns after deployment fixes
- Ensure **no** `_ = asyncio` in exception handlers.
- Use **local** `import asyncio as _aio` at the use site for `asyncio.sleep` (e.g. in `contribution_tracker`, `retry`).
- Avoid `exc_info=True` when logging contribution update errors.
- **CRITICAL:** Never access `type(e).__name__` or `type(e).__module__` in exception handlers - use `str(e)` only.
- See "January 2026 – Code-level fix" above.

---

## Debugging Commands

### Check GitHub Actions logs
```bash
# List recent runs
gh run list --repo BlueFlashX1/discord-bots --limit 5

# View specific run logs
gh run view <run_id> --repo BlueFlashX1/discord-bots --log

# Search for specific issues
gh run view <run_id> --repo BlueFlashX1/discord-bots --log 2>&1 | grep -E "(error|Error|failed|github-bot)"
```

### Check PM2 status on VPS
```bash
# Via SSH or in deploy script
pm2 list
pm2 logs github-bot
pm2 logs github-bot --err --lines 50
```

### Check for uncommitted changes
```bash
git status
git diff HEAD -- ecosystem.config.js
```

---

## Timeline

**Jan 22, 2026 (deployment):**
1. Initial error: `NameError: name 'asyncio' is not defined`
2. Added `import asyncio` to files – didn't help
3. Cleared `__pycache__` on VPS – didn't help
4. Discovery 1: `git pull` failing due to local changes on VPS → Fix: `git reset --hard origin/main`
5. Discovery 2: PM2 reload not starting deleted bots → Fix: `pm2 delete all && pm2 start ecosystem.config.js`
6. Discovery 3: `ecosystem.config.js` never committed → Fix: committed and pushed
7. RESOLVED (deployment): github-bot running, `/stats` working

**Jan 24, 2026 (recurrence, code fix):**
8. Error returned: `/stats`, `/activity`, and "Error updating contributions" again showed "asyncio is not defined"
9. Root cause: `_ = asyncio` in exception handlers, `exc_info=True` in contribution tracker, asyncio use in task/retry contexts
10. Fix: Removed `_ = asyncio`, local `import asyncio as _aio` at use site, no `exc_info=True`, generic user message when asyncio in error
11. RESOLVED (code): github-bot stable, `/stats` and `/activity` working

**Jan 25, 2026 (final fix - exception metadata access):**
12. Error returned: `/stats` still showing "asyncio is not defined" intermittently
13. Root cause: Accessing `type(e).__name__` and `type(e).__module__` in exception handlers can trigger asyncio NameError when formatting exceptions
14. Fix: Simplified all exception handlers to use `str(e)` instead of accessing exception metadata (`type(e).__name__`, `getattr(type(e), "__module__", "")`)
15. Files fixed: `github_service.py`, `contribution_tracker.py`, `retry.py`, `repo_monitor.py`
16. RESOLVED (final): `/stats` command now stable, no more asyncio errors

---

## Prevention Checklist

Before deploying Python bots:

- [ ] All code changes committed (`git status`)
- [ ] `ecosystem.config.js` changes committed
- [ ] No `_ = asyncio` in exception handlers; use local `import asyncio as _aio` at use site for `asyncio.sleep` where needed
- [ ] No `type(e).__name__` or `type(e).__module__` access in exception handlers - use `str(e)` only
- [ ] No `exc_info=True` in exception logging that might format asyncio-related exceptions
- [ ] VPS has no local modifications (use `git reset --hard`)
- [ ] PM2 uses `start` not `reload` after deleting processes
- [ ] Check `pm2 list` shows bot as "online"
- [ ] Check `pm2 logs <bot-name>` for errors

---

## Files Modified

**Deployment (Jan 22):**
- `.github/workflows/deploy.yml` – Deployment workflow
- `ecosystem.config.js` – PM2 configuration

**Code fix (Jan 24):** See "January 2026 – Code-level fix" section for the list of github-bot files.

---

## January 2026 – Code-level fix (recurrence)

The error recurred after deployment fixes were in place. The root cause was **code**, not deployment:

### What was wrong

1. **Exception handlers** in stats, activity, github_service, track, setusername used `_ = asyncio` to "keep asyncio in scope." In some run contexts this reference itself caused `NameError`, which was then caught and shown to users.

2. **Contribution tracker** used `logger.error(..., exc_info=True)`. Formatting the traceback could resolve asyncio-related exception types and trigger the same `NameError`.

3. **asyncio.sleep** in the contribution loop and in `retry_with_backoff` relied on module-level `import asyncio`. In task/loop contexts, a local import at the use site is more reliable.

### Fixes applied (Jan 24, 2026)

- **Removed all `_ = asyncio`** from exception handlers in:
  - `commands/stats.py`, `commands/activity.py`, `commands/track.py`, `commands/setusername.py`
  - `services/github_service.py`
- **Stopped using `exc_info=True`** in `contribution_tracker` when logging contribution update errors.
- **User-facing errors:** If the exception message contains `"asyncio"`, we now show  
  `"A temporary error occurred. Please try again."` instead of the raw `NameError` text.
- **Local asyncio import at use site:**
  - In `contribution_tracker.update_contributions`: `import asyncio as _aio` at start of try block, then `await _aio.sleep(2)`.
  - In `utils/retry.retry_with_backoff`: `import asyncio as _aio` immediately before `await _aio.sleep(delay)`.
- **Removed** the debug print block from the stats command.

### Final fix applied (Jan 25, 2026)

**Critical discovery:** Accessing exception metadata (`type(e).__name__`, `type(e).__module__`) in exception handlers can itself trigger the asyncio NameError when formatting exceptions.

**Solution:** Simplified all exception handlers to avoid accessing exception metadata:

**Before (problematic):**
```python
except Exception as e:
    error_type = type(e).__name__
    error_module = getattr(type(e), "__module__", "")
    error_msg = str(e)
    if error_module:
        error_details = f"{error_module}.{error_type}: {error_msg}"
    else:
        error_details = f"{error_type}: {error_msg}"
    logger.error(f"Error: {error_details}")
```

**After (safe):**
```python
except Exception as e:
    error_msg = str(e)
    user_msg = error_msg if "asyncio" not in error_msg.lower() else "A temporary error occurred. Please try again."
    logger.error(f"Error: {user_msg}")
```

**Changes:**
- **Removed `type(e).__name__` access** in `github_service.py` exception handlers
- **Removed `type(e).__name__` access** in `contribution_tracker.py` exception handler
- **Wrapped type access in try/except** in `retry.py` to safely handle NameError cases
- **Removed `exc_info=True`** in `repo_monitor.py` which formats tracebacks that could reference asyncio
- **Simplified exception formatting** to use `str(e)` only, avoiding all metadata access

### Files modified (code fix)

**Jan 24, 2026:**
- `github-bot/commands/stats.py`
- `github-bot/commands/activity.py`
- `github-bot/commands/track.py`
- `github-bot/commands/setusername.py`
- `github-bot/services/github_service.py`
- `github-bot/services/contribution_tracker.py`
- `github-bot/utils/retry.py`

**Jan 25, 2026 (final fix):**
- `github-bot/commands/stats.py` - Simplified exception handler to match activity.py pattern
- `github-bot/services/github_service.py` - Removed `type(e).__name__` access
- `github-bot/services/contribution_tracker.py` - Removed `type(e).__name__` access, added asyncio filtering
- `github-bot/utils/retry.py` - Wrapped type access in try/except for safety
- `github-bot/services/repo_monitor.py` - Removed `exc_info=True`

---

## Related Files

- `github-bot/services/github_service.py` – GitHub API + retry
- `github-bot/utils/retry.py` – retry with backoff, uses `asyncio.sleep`
- `github-bot/services/contribution_tracker.py` – hourly updates, uses `asyncio.sleep`
- `github-bot/bot.py` – main entry, `asyncio.run(main())`

---

**Author:** AI Assistant (Claude)  
**Reviewed by:** Matthew Thompson
