# YouTube Monitor Bot - Permissions & Invite Guide

## Quick Invite Link

Use this link to invite the bot with correct permissions:

**Permission Integer**: `101376`

**Invite URL**:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=101376&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your bot's Client ID from Discord Developer Portal.

---

## Required Permissions

### Bot Permissions (101376)

| Permission           | Value  | Required For         |
| -------------------- | ------ | -------------------- |
| Send Messages        | 2048   | Post video embeds    |
| Embed Links          | 16384  | Display video embeds |
| Read Message History | 65536  | Command context      |
| Attach Files         | 32768  | Video thumbnails     |
| Use External Emojis  | 262144 | Visual feedback      |

**Total**: 101376

### OAuth2 Scopes

- ✅ `bot` - Bot functionality
- ✅ `applications.commands` - Slash commands

---

## Step-by-Step Invite Setup

### Method 1: URL Generator (Recommended)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** > **URL Generator**
4. Select **Scopes**:
   - ✅ `bot`
   - ✅ `applications.commands`
5. Select **Bot Permissions**:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Attach Files
   - ✅ Use External Emojis
6. Copy the generated URL
7. Open URL in browser
8. Select your server
9. Click **Authorize**

### Method 2: Manual Permission Setup

1. Invite bot with basic permissions
2. Go to your Discord server
3. **Server Settings** > **Integrations** > **Bots**
4. Find your bot and click **Manage**
5. Enable required permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Attach Files
   - Use External Emojis

---

## Channel-Specific Permissions

For each channel where videos will be posted:

**Required**:

- ✅ View Channel
- ✅ Send Messages
- ✅ Embed Links
- ✅ Attach Files

**How to Set**:

1. Right-click channel → **Edit Channel**
2. Go to **Permissions** tab
3. Add bot role or user
4. Enable required permissions

---

## Permission Breakdown

### Why Each Permission?

| Permission               | Why Needed                            |
| ------------------------ | ------------------------------------- |
| **Send Messages**        | Bot must post video notifications     |
| **Embed Links**          | Video embeds require embed permission |
| **Read Message History** | Bot needs context for commands        |
| **Attach Files**         | Video thumbnails are attached files   |
| **Use External Emojis**  | Better visual feedback in embeds      |

### Permissions NOT Needed

❌ **Administrator** - Not required  
❌ **Manage Server** - Not required  
❌ **Manage Channels** - Not required  
❌ **Manage Roles** - Not required  
❌ **Kick/Ban Members** - Not required  
❌ **Manage Messages** - Not required

---

## Testing Permissions

After inviting, test:

1. **Commands Work**:

   ```
   /add channel:https://youtube.com/@channelname
   /list
   /dashboard
   ```

2. **Bot Can Post**:

   - Add a channel
   - Wait for check interval
   - Verify video posts to Discord channel

3. **Check Health**:
   ```
   /health
   ```
   Should show channel status

---

## Troubleshooting

### "Missing Permissions" Error

**Solution**:

- Re-invite bot with correct permissions
- Check bot role has permissions in server
- Verify channel-specific permissions

### Bot Can't Post Videos

**Solution**:

- Check "Send Messages" permission
- Verify channel permissions allow bot to send
- Check "Embed Links" permission
- Verify bot can see the channel

### Commands Don't Work

**Solution**:

- Verify `applications.commands` scope is selected
- Run `npm run deploy` to register commands
- Check bot is online
- Verify bot has "Use Application Commands" permission

---

## Security Best Practices

1. **Minimum Permissions**: Only grant what's needed
2. **No Administrator**: Don't grant admin unless absolutely necessary
3. **Channel-Specific**: Set permissions per channel, not server-wide
4. **Monitor Activity**: Check bot logs regularly

---

## Quick Checklist

Before using the bot:

- [ ] Bot invited with correct permissions (101376)
- [ ] `applications.commands` scope selected
- [ ] Bot has permissions in target channels
- [ ] Commands deployed (`npm run deploy`)
- [ ] Bot is online
- [ ] Test `/add` command works
- [ ] Test video posting works

---

## Permission Integer Reference

**Required**: `101376`

**Full Breakdown**:

- Send Messages: 2048
- Embed Links: 16384
- Read Message History: 65536
- Attach Files: 32768
- Use External Emojis: 262144

**Total**: 101376

---

**Ready to invite?** Use the URL generator in Discord Developer Portal with the permissions above!
