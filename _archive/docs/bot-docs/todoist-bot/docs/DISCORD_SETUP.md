# Discord Bot Setup & Invite Instructions

## ✅ Environment Check

Your `.env` file is properly configured with:

- ✅ Discord Bot Token
- ✅ Discord Client ID: `1462581225477902552`
- ✅ Discord Guild ID: `1429280769418858499`
- ✅ Todoist API Token
- ✅ Notification Channel ID
- ✅ Sync Interval: 30 seconds

## 🤖 Discord Bot Permissions Required

The bot needs these permissions to function:

### Required Permissions

- ✅ **Send Messages** - To respond to commands
- ✅ **Use Slash Commands** - To handle slash commands
- ✅ **Embed Links** - To send formatted task lists
- ✅ **Read Message History** - To read context (optional but recommended)
- ✅ **View Channels** - To see channels

### Optional (Recommended)

- ✅ **Mention Everyone** - To @ mention users for tasks due today
- ✅ **Add Reactions** - For future interactive features

## 🔗 Invite Bot to Your Server

### Method 1: Direct Invite Link (Easiest)

Use this pre-generated invite link with all required permissions:

```
https://discord.com/api/oauth2/authorize?client_id=1462581225477902552&permissions=277025508416&scope=bot%20applications.commands
```

**Just click the link above and select your server!**

### Method 2: Manual Setup

1. Go to: <https://discord.com/developers/applications/1462581225477902552/oauth2/url-generator>

2. **Select Scopes:**

   - ✅ `bot`
   - ✅ `applications.commands`

3. **Select Bot Permissions:**

   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ View Channels
   - ✅ Mention Everyone (optional)

4. **Copy the generated URL** and open it in your browser

5. **Select your Discord server** and click "Authorize"

## ⚙️ Enable Required Intents

**IMPORTANT:** You must enable Message Content Intent for the bot to work:

1. Go to: <https://discord.com/developers/applications/1462581225477902552/bot>

2. Scroll down to **"Privileged Gateway Intents"**

3. Enable:

   - ✅ **MESSAGE CONTENT INTENT** (Required for reading message content)

4. Click **"Save Changes"**

## 📋 Permission Summary

The bot needs these permissions (permission value: `277025508416`):

| Permission           | Why Needed                    |
| -------------------- | ----------------------------- |
| Send Messages        | Respond to commands           |
| Use Slash Commands   | Handle `/` commands           |
| Embed Links          | Send formatted task lists     |
| Read Message History | Read context                  |
| View Channels        | See channels                  |
| Mention Everyone     | @ mention users for due tasks |

## ✅ Verify Bot is Invited

After inviting:

1. Check your Discord server member list - bot should appear
2. The bot should show as "Online" (once you start it with `npm start`)
3. Try typing `/` in any channel - you should see bot commands

## 🚀 Next Steps

After inviting the bot:

1. **Deploy Commands:**

   ```bash
   cd "discord/bots/todoist bot"
   npm run deploy
   ```

2. **Start the Bot:**

   ```bash
   npm start
   ```

3. **Test Commands:**
   - Type `/list` in Discord
   - Type `/today` to see today's tasks
   - Type `/create content:"Test task" due:"today"` to create a task

## 🔧 Troubleshooting

### Bot appears offline

- Make sure you've started the bot: `npm start`
- Check console for errors
- Verify `DISCORD_TOKEN` is correct in `.env`

### Commands not appearing

- Run `npm run deploy` to register commands
- Wait 1-5 minutes for commands to propagate
- Restart Discord app
- Try typing `/` to see available commands

### Bot can't send messages

- Check bot has "Send Messages" permission in the channel
- Verify bot role is above the channel's permission requirements
- Check server settings for bot permissions

### "Missing Access" error

- Re-invite bot with correct permissions
- Make sure bot role has necessary permissions
- Check channel-specific permissions

## 📝 Quick Reference

**Your Bot Details:**

- Client ID: `1462581225477902552`
- Server ID: `1429280769418858499`
- Notification Channel: `1462582405696323818`

**Invite Link:**

```
https://discord.com/api/oauth2/authorize?client_id=1462581225477902552&permissions=277025508416&scope=bot%20applications.commands
```
