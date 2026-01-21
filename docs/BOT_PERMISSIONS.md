# Discord Bot Permissions Guide

This document outlines the required Discord permissions for each bot.

## Bot Permissions (OAuth2 Scopes)

All bots require these OAuth2 scopes when inviting:

### Required Scopes
- ✅ **`bot`** - Required for all bots
- ✅ **`applications.commands`** - Required for slash commands

## Server Permissions

### All Three Bots (Exercism, GitHub, Reminder)

**Minimum Required Permissions:**

| Permission | Why Needed |
|------------|------------|
| ✅ **Send Messages** | All bots send messages and embeds |
| ✅ **Embed Links** | All bots use rich embeds for responses |
| ✅ **Read Message History** | Required for `message_content` intent |
| ✅ **Use External Emojis** | Bots use emojis in embeds (📋, ✅, etc.) |
| ✅ **Send Messages in Threads** | Modern Discord feature support |
| ✅ **Read Messages/View Channels** | Basic permission to access channels |

**Recommended Additional Permissions:**

| Permission | Why Recommended |
|------------|-----------------|
| ⚠️ **Attach Files** | Exercism bot may need to handle file uploads for submissions |
| ⚠️ **Use Slash Commands** | Explicit permission for slash commands (usually granted with `applications.commands` scope) |

## Bot-Specific Requirements

### Exercism Bot

**Additional Considerations:**
- ✅ **DM Permissions** - Can send daily problems via DM (requires bot to share a server with user)
- ⚠️ **File Attachments** - May need to handle file uploads for exercise submissions

**Intents Required:**
- `message_content` - Enabled in code

**Invite URL Permissions:**
```
applications.commands bot
Send Messages, Embed Links, Read Message History, Use External Emojis, Send Messages in Threads, Attach Files
```

### GitHub Bot

**Additional Considerations:**
- ✅ **Channel Notifications** - Sends release notifications to specified channels
- ✅ **DM Permissions** - Not required (only sends to channels)

**Intents Required:**
- `message_content` - Enabled in code

**Invite URL Permissions:**
```
applications.commands bot
Send Messages, Embed Links, Read Message History, Use External Emojis, Send Messages in Threads
```

### Reminder Bot

**Additional Considerations:**
- ✅ **DM Permissions** - Can send reminders via DM (default behavior)
- ✅ **Channel Permissions** - Can send reminders to specified channels
- ✅ **Real-time Checking** - Checks for due reminders every 30 seconds

**Intents Required:**
- `message_content` - Enabled in code

**Invite URL Permissions:**
```
applications.commands bot
Send Messages, Embed Links, Read Message History, Use External Emojis, Send Messages in Threads
```

## Discord Developer Portal Settings

### Required Intents

All three bots require the **Message Content Intent** to be enabled:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **Bot** → **Privileged Gateway Intents**
4. Enable: ✅ **MESSAGE CONTENT INTENT**

**Why:** All bots use `intents.message_content = True` in their code to read message content.

## Invite URL Generator

### Exercism Bot
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=18432&scope=bot%20applications.commands
```
**Permissions Value:** `18432` = Send Messages + Embed Links + Read Message History + Use External Emojis + Send Messages in Threads + Attach Files

### GitHub Bot
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=18432&scope=bot%20applications.commands
```
**Permissions Value:** `18432` = Send Messages + Embed Links + Read Message History + Use External Emojis + Send Messages in Threads

### Reminder Bot
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=18432&scope=bot%20applications.commands
```
**Permissions Value:** `18432` = Send Messages + Embed Links + Read Message History + Use External Emojis + Send Messages in Threads

## Permission Breakdown

### Permission Flags (Decimal Values)

| Permission | Decimal Value | Binary |
|------------|---------------|--------|
| Send Messages | 2048 | 100000000000 |
| Embed Links | 16384 | 100000000000000 |
| Read Message History | 65536 | 10000000000000000 |
| Use External Emojis | 262144 | 1000000000000000000 |
| Send Messages in Threads | 1073741824 | 1000000000000000000000000000000 |
| Attach Files | 32768 | 1000000000000000 |

**Total (without Attach Files):** `2048 + 16384 + 65536 + 262144 + 1073741824 = 1073745920`

**Total (with Attach Files):** `1073745920 + 32768 = 1073778688`

## Quick Setup Checklist

### For Each Bot:

- [ ] Enable **MESSAGE CONTENT INTENT** in Discord Developer Portal
- [ ] Use invite URL with `applications.commands` and `bot` scopes
- [ ] Grant minimum permissions: Send Messages, Embed Links, Read Message History, Use External Emojis, Send Messages in Threads
- [ ] For Exercism bot: Also grant Attach Files permission
- [ ] Test bot responds to slash commands
- [ ] Test bot can send messages/embeds in channels
- [ ] For Reminder/Exercism bots: Test DM functionality

## Troubleshooting

### "Bot doesn't respond to commands"
- ✅ Check `applications.commands` scope is included in invite URL
- ✅ Verify bot has "Use Slash Commands" permission in server
- ✅ Wait 1-2 minutes after inviting for commands to sync

### "Bot can't send messages"
- ✅ Check "Send Messages" permission is granted
- ✅ Verify bot has permission in the specific channel
- ✅ Check channel permissions don't override server permissions

### "Bot can't read messages"
- ✅ Enable **MESSAGE CONTENT INTENT** in Developer Portal
- ✅ Check "Read Message History" permission is granted
- ✅ Verify bot code has `intents.message_content = True`

### "Embeds don't show"
- ✅ Check "Embed Links" permission is granted
- ✅ Verify "Use External Emojis" is enabled for emoji support

### "DM not working"
- ✅ Bot and user must share at least one server
- ✅ User must have DMs enabled from server members
- ✅ Bot needs "Send Messages" permission (works in DM context)

## Notes

- **Permission Inheritance:** Channel-specific permissions can override server permissions
- **Intent Requirements:** Message Content Intent must be enabled in Developer Portal, not just in code
- **Command Syncing:** Slash commands may take 1-2 minutes to appear after bot is invited
- **DM Limitations:** Bots can only DM users they share a server with
