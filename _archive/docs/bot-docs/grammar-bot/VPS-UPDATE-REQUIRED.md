# ⚠️ VPS UPDATE REQUIRED

**When fixing this bot, you MUST update BOTH local AND VPS versions.**

## Quick Update Command

```bash
cd ~/Documents/DEVELOPMENT/discord/bots
./scripts/update-grammar-bot-vps.sh
```

## Why This Matters

- **Local bot** = Development/testing on macOS
- **VPS bot** = Production server (64.23.179.177) where users interact
- **Both must be updated** or users won't see your fixes

## Full Documentation

See: `../docs/VPS-DEPLOYMENT-REQUIREMENT.md`

## Common Workflow

1. Fix code locally
2. Test locally (optional)
3. **Run update script** ← Don't forget this step!
4. Verify VPS logs

---

**This file exists because AI assistants keep forgetting to update VPS.**
