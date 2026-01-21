# Coding Practice Bot - Permissions Guide

## Discord Bot Permissions

### Required Permissions

Your Discord bot needs the following permissions to function properly:

#### Application Commands (Slash Commands)
- ✅ **Use Application Commands** - Required for all slash commands
- ✅ **Send Messages** - Required to respond to commands
- ✅ **Embed Links** - Required to display problem embeds
- ✅ **Read Message History** - Required for command context

#### Optional but Recommended
- ✅ **Attach Files** - If you want to support file attachments in submissions
- ✅ **Use External Emojis** - For better visual feedback

### How to Set Up Permissions

#### Method 1: Discord Developer Portal (Recommended)

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
   - ✅ Attach Files (optional)
   - ✅ Use External Emojis (optional)
6. Copy the generated URL
7. Open the URL in your browser
8. Select your server and authorize

#### Method 2: Manual Permission Setup

1. Go to your Discord server
2. Go to **Server Settings** > **Integrations** > **Bots**
3. Find your bot and click **Manage**
4. Enable the required permissions listed above

### Permission Integer

If you need the permission integer for programmatic setup:

```
Required: 68608
Full (with optional): 68608
```

Breakdown:
- Send Messages: 2048
- Embed Links: 16384
- Read Message History: 65536
- Attach Files: 32768 (optional)
- Use External Emojis: 262144 (optional)

### Channel-Specific Permissions

The bot needs to be able to:
- ✅ Read messages in channels where commands are used
- ✅ Send messages in channels where commands are used
- ✅ Send embeds (problem descriptions, stats, etc.)

### Server Permissions

The bot does NOT need:
- ❌ Administrator permission
- ❌ Manage Server
- ❌ Manage Channels
- ❌ Manage Roles
- ❌ Kick/Ban Members
- ❌ Any moderation permissions

### Troubleshooting

**Bot doesn't respond to commands:**
- Check bot has "Use Application Commands" permission
- Verify bot is in the server
- Check bot is online

**Bot can't send messages:**
- Check "Send Messages" permission is enabled
- Verify channel permissions allow bot to send messages
- Check if channel has slowmode that might interfere

**Embeds not showing:**
- Enable "Embed Links" permission
- Check channel allows embeds

**File attachments not working:**
- Enable "Attach Files" permission
- Check file size limits

## Python Permissions (For Code Validation)

The bot runs Python code validation locally, so it needs:

### System Permissions

- ✅ **Read/Write access** to temporary directory (`/tmp` or system temp)
- ✅ **Execute Python 3** - `python3` must be in PATH
- ✅ **Network access** (optional) - Only if fetching problems from APIs

### Security Considerations

- Code validation runs in isolated temporary files
- Files are automatically cleaned up after validation
- No permanent code storage
- No network access from executed code (sandboxed)

### Python Installation Check

Verify Python 3 is installed and accessible:

```bash
python3 --version
# Should output: Python 3.x.x

which python3
# Should output path to python3 executable
```

## API Permissions

### LeetCode API

- ✅ **No API key required** - Public GraphQL endpoint
- ✅ **Rate limiting** - Be respectful, don't spam requests

### Codewars API (Optional)

- ✅ **API key optional** - Works without key, but may have rate limits
- Get API key from [Codewars Settings](https://www.codewars.com/users/edit)

### No Special Permissions Needed

The bot uses public APIs and doesn't require special permissions for:
- LeetCode (public GraphQL)
- Codewars (public REST API, optional key)

## Environment Variables

### Required

- `DISCORD_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your bot's client ID
- `GUILD_ID` - Your Discord server ID

### Optional

- None - Codewars API v1 is public and requires no authentication

## Quick Permission Checklist

Before running the bot, verify:

- [ ] Bot has "Use Application Commands" permission
- [ ] Bot has "Send Messages" permission
- [ ] Bot has "Embed Links" permission
- [ ] Bot has "Read Message History" permission
- [ ] Python 3 is installed and accessible
- [ ] Bot token is valid and bot is online
- [ ] Commands are deployed (`npm run deploy`)

## Testing Permissions

Test if bot has correct permissions:

1. Use `/problem` command - Should get a problem embed
2. Use `/submit` with code - Should validate and respond
3. Use `/stats` - Should show statistics

If any command fails, check the permission requirements above.
