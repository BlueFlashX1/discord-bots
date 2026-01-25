# Starboard Bot - Configuration Checklist

## Pre-Deployment Checklist

### 1. Environment Setup ✅
- [x] `.env` file created with bot credentials
- [ ] `DISCORD_TOKEN` filled in
- [ ] `CLIENT_ID` filled in

### 2. Discord Bot Setup
- [ ] Bot created in Discord Developer Portal
- [ ] Bot invited to server with required permissions (see PERMISSIONS.md)
- [ ] Bot is online and responding

### 3. Forum Channel Setup
- [ ] Forum channel created (e.g., `#starboard`)
- [ ] Tags created in forum channel matching `config/tags.json`:
  - [ ] `AI`
  - [ ] `Data Science`
  - [ ] `Programming`
  - [ ] `Question`
  - [ ] `Resource`
  - [ ] `Discussion`
  - [ ] `Announcement`

### 4. Bot Configuration
- [ ] Run `/starboard-set-channel` command to set forum channel
- [ ] (Optional) Run `/starboard-set-threshold` to change from default (5)
- [ ] Verify with `/starboard-config` command

### 5. Testing
- [ ] Post a test message
- [ ] Add ⭐ reactions until threshold is met
- [ ] Verify message appears in forum channel
- [ ] Verify tags are applied correctly
- [ ] Verify title format: `[Tag1] [Tag2] Original Title`

## Post-Deployment Verification

### Check Logs
```bash
# On VPS
pm2 logs starboard-bot --lines 50

# Look for:
# - "Bot connected" message
# - "Starboard service initialized"
# - Guild configuration status
# - Any errors or warnings
```

### Test Commands
- `/starboard-config` - Should show current configuration
- `/starboard-set-channel` - Should set forum channel
- `/starboard-set-threshold` - Should set threshold

### Test Starboard
1. Post a message with AI-related content
2. Add 5+ ⭐ reactions
3. Check if:
   - Message appears in forum channel
   - Tags are applied (should have `AI` tag)
   - Title is formatted correctly
   - Embed shows original message info

## Troubleshooting

### Bot Not Responding
- Check if bot is online in Discord
- Check PM2 status: `pm2 list | grep starboard-bot`
- Check logs for errors

### Messages Not Posting
- Verify forum channel is set: `/starboard-config`
- Check star threshold: Should match your reaction count
- Check bot permissions in forum channel
- Check logs for permission errors

### Tags Not Applying
- Verify tags exist in forum channel (exact name match)
- Check `config/tags.json` for keyword definitions
- Check logs for tag matching: Look for "Classified tags" messages
- Verify tag names match exactly (case-sensitive in Discord)

### Title Format Issues
- Check logs for "Generated title" messages
- Verify tags are being classified correctly
- Check Discord title length limit (100 chars)

## Required Files

Ensure these files exist on VPS:
- `bot.py`
- `deploy-commands.py`
- `requirements.txt`
- `.env` (with credentials)
- `config/tags.json`
- `services/starboard_service.py`
- `services/tag_classifier.py`
- `utils/data_manager.py`
- `utils/embeds.py`
- `commands/config.py`

## Data Files (Auto-created)

These will be created automatically:
- `data/starboard.json` - Tracks posted messages
- `data/config.json` - Server configurations
