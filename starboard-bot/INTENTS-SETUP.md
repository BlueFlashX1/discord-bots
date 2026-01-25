# Starboard Bot - Intents Setup Required

## ⚠️ CRITICAL: Enable Privileged Intents

The starboard bot requires **privileged intents** to be enabled in Discord Developer Portal.

### Required Intents

1. **Message Content Intent** ✅ (Required)
   - Bot needs to read message content for auto-tagging

2. **Server Members Intent** ⚠️ (Optional)
   - Only needed if you want member-specific features

### How to Enable

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **Bot** section
4. Scroll down to **Privileged Gateway Intents**
5. Enable:
   - ✅ **MESSAGE CONTENT INTENT**
   - (Optional) Server Members Intent
6. Save changes

### After Enabling

The bot will automatically reconnect and work properly. Commands are already synced (3 commands available).

### Verify Intents

After enabling, restart the bot:

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 'pm2 restart starboard-bot'
```

Check logs to verify no more `PrivilegedIntentsRequired` errors:

```bash
ssh -i ~/.ssh/id_rsa_deploy root@64.23.179.177 'pm2 logs starboard-bot --lines 20'
```

### Commands Available

Once intents are enabled, these commands will work:
- `/starboard-set-channel` - Set forum channel
- `/starboard-set-threshold` - Set star threshold
- `/starboard-config` - View configuration

### Current Status

- ✅ Commands synced (3 commands)
- ⚠️ Bot running but needs intents enabled
- ⚠️ Bot will crash on message/reaction events until intents enabled
