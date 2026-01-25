# Starboard Bot - Required Permissions

## Discord Bot Permissions

When inviting the bot to your server, you need to grant the following permissions:

### Required Permissions

1. **View Channels** ✅
   - Bot needs to see messages and channels

2. **Send Messages** ✅
   - Bot needs to create forum posts

3. **Manage Messages** ✅
   - Required to create forum threads/posts

4. **Read Message History** ✅
   - Bot needs to read original messages to post to starboard

5. **Add Reactions** ⚠️ (Optional)
   - Not strictly required, but useful if you want bot to react

6. **Use External Emojis** ⚠️ (Optional)
   - Only needed if using custom emojis

### Recommended Permissions

- **Embed Links** - For rich embeds in starboard posts
- **Attach Files** - If you want to preserve attachments in starboard

## Permission Integer

You can use this permission integer when creating the invite URL:

```
294912
```

Or use the Discord Developer Portal to select permissions manually.

## Invite URL Format

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=294912&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your bot's Client ID from `.env`.

## Forum Channel Setup

After inviting the bot:

1. **Create Forum Channel**
   - Create a new forum channel (e.g., `#starboard`)

2. **Create Tags in Forum**
   - The bot expects these tags to exist in the forum:
     - `AI`
     - `Data Science`
     - `Programming`
     - `Question`
     - `Resource`
     - `Discussion`
     - `Announcement`
   
   - You can add more tags by editing `config/tags.json` and creating matching tags in Discord

3. **Set Forum Channel**
   - Use `/starboard-set-channel` command to configure the bot
   - Select your forum channel

4. **Set Star Threshold** (Optional)
   - Use `/starboard-set-threshold` to set minimum stars (default: 5)

## Verification Checklist

- [ ] Bot invited with correct permissions
- [ ] Forum channel created
- [ ] All tags created in forum channel (matching `config/tags.json`)
- [ ] `/starboard-set-channel` command executed
- [ ] Bot is online and responding
- [ ] Test with a message that gets enough stars
