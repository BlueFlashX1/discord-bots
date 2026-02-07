# Personal Intelligence & Memory System

This automation system transforms Discord data into a personal intelligence system with digests, journals, and searchable memory.

## Quick Setup

1. **Environment Variables Required:**
   ```bash
   DISCORD_BOT_TOKEN=your_bot_token
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

2. **Configure Channels:**
   Edit `automations/config/channels.json` to add your Discord channel IDs:
   ```json
   {
     "channels": {
       "YOUR_CHANNEL_ID": {
         "category": "News",
         "enabled": true,
         "description": "News and RSS feeds"
       }
     }
   }
   ```

## Usage

### Data Ingestion
```bash
# Test ingestion (dry run)
node automations/scripts/ingest_discord.js --dry-run

# Actually ingest data
node automations/scripts/ingest_discord.js
```

### Generate Digests
```bash
# 6-hour digest (default)
node automations/scripts/generate_digest.js

# Custom time range
node automations/scripts/generate_digest.js --hours 24

# Test mode (mock data)
node automations/scripts/generate_digest.js --test
```

### Generate Journals
```bash
# Today's journal
node automations/scripts/generate_journal.js

# Specific date
node automations/scripts/generate_journal.js --date 2026-01-15
```

### Query Memory
```bash
# Last week summary
node automations/scripts/query_memory.js --range "7d"

# Search by keyword
node automations/scripts/query_memory.js --keyword "security"

# Specific month
node automations/scripts/query_memory.js --month "2026-01"

# Answer questions
node automations/scripts/query_memory.js --query "What progress did I make?" --range "30d"
```

## File Structure

```
automations/
├── config/
│   └── channels.json          # Channel configuration
├── data/
│   └── raw/                   # Ingested Discord data
├── output/
│   ├── digests/              # Short-term summaries
│   └── journal/
│       ├── YYYY/MM/          # Daily journals
│       └── summaries/        # Weekly/Monthly rollups
└── scripts/
    ├── ingest_discord.js     # Data ingestion
    ├── generate_digest.js    # Create summaries
    ├── generate_journal.js   # Daily journals + rollups
    └── query_memory.js       # Search and query
```

## Discord Bot Integration

The scripts are integrated with Moltbot - users can DM the bot commands like:
- "Give me a digest of the last 6 hours"
- "Update today's journal" 
- "What did I work on last week?"
- "Search for security issues"

## Privacy & Security

- All data stays in your local filesystem
- **Script allowlist:** only scripts listed in \`config/security.js\` → \`automations.allowedScripts\` can be run (e.g. \`mac_control.js\`, \`generate_digest.js\`).
- **Command blocklist:** \`config/security.js\` → \`commands.blocked\` blocks raw commands containing \`sudo\`, \`open\`, \`osascript\`, etc. Allowlisted automation scripts are exempt so \`mac_control.js\` can run its fixed actions.
- Sensitive patterns are blocked
- Use `.gitignore` to prevent committing private data
- MoltBot cannot access any directories outside this folder
- All executions are logged to ../logs/audit.log

## Troubleshooting: "Found 0 messages" / "No messages found in the specified time range"

The digest reads from **raw ingested data** in `data/raw/<category>/<channel>/<date>.jsonl`. It only counts messages whose **timestamp** falls within the requested window (e.g. last 12 hours).

**Common cause:** Ingestion has not run recently (or at all on this machine). If the only `.jsonl` files are old (e.g. `2026-02-02.jsonl`), then "last 12 hours" will correctly find 0 messages.

**Fix:**
1. Run ingestion so recent messages are written to `data/raw/`:
   ```bash
   cd /path/to/moltbot && node automations/scripts/ingest_discord.js
   ```
2. Run ingestion **regularly** (e.g. cron every 10 minutes) so raw data stays current.
3. Then run the digest again; it will find messages in the time window.

If the digest is triggered from the **VPS** (e.g. via MoltBot in Discord), ingestion must run **on the VPS** too (same repo path, `.env`, and `automations/config/channels.json`). Add a cron job there or run `ingest_discord.js` before the digest schedule.

## More automation ideas (for MoltBot to run)

Scripts here stay in the sandbox and must be added to \`config/security.js\` → \`automations.allowedScripts\` before use.

| Idea | What it does | Trigger examples |
|------|----------------|------------------|
| **Standup** | Read journal + last 24h digest, output "Done / Doing / Blockers" | "Give me my standup", "standup for today" |
| **Weekly review** | \`query_memory.js --range 7d\` + optional formatting (or a thin wrapper script) | "Weekly review", "What did I do this week" |
| **Channel activity** | Read \`data/raw/\`, count messages by channel/author, output top N | "Most active channels this week", "Who posted most in #news" |
| **Catch-up for #channel** | Filter raw by channel + date, summarize (or run digest with channel filter if you add it) | "Summarize #dev since yesterday" |
| **"What's new"** | Alias: run \`generate_digest.js --hours 12\` | "What's new", "Catch me up" |
| **Sync then journal** | Run \`ingest_discord.js\` then \`generate_journal.js --date today\` | "Update my memory and today's journal" |
| **Reminders / todos** | If you have a #todos or #reminders channel, script filters raw for keywords or embeds and lists "To do" | "What do I need to do", "List my reminders" |
| **Deploy / status** | Read a file in \`data/\` (e.g. \`data/status.json\`) written by a cron or webhook; report "Last deploy: …" | "Deploy status", "Is the app up" (data must be written by something else) |

### Mac control (approval required)

\`mac_control.js\` runs **only on macOS** and **always requires you to reply "yes"** in Discord before it runs. It executes a fixed allowlist of actions (no arbitrary commands). If the requested app or action is unclear, MoltBot will ask a short clarifying question instead of guessing.

| Action | Trigger examples |
|--------|------------------|
| Lock screen | "Lock my mac", "Lock screen" |
| Sleep display | "Sleep display", "Turn off screen" |
| Mute / unmute | "Mute", "Unmute" |
| Open app | "Open Spotify", "Open Cursor", "Open Vivaldi", "Open Obsidian", "open my browser", "open my notes" |
| Quit app | "Quit Vivaldi", "Close Obsidian", "quit Spotify", "quit Cursor" |
| List laggy | "List laggy processes", "What's using CPU", "Top processes" |
| Kill process | "Kill process 12345", "Kill PID 12345" (use PID from list_laggy output) |

Open/quit apps use \`open_app\` / \`quit_app --app <key>\`: **Vivaldi**, **Obsidian**, **Spotify**, **Cursor**. To add more: edit \`scripts/mac_control.js\` → \`ALLOWED_APPS\`. \`list_laggy\` shows top 20 by CPU; \`kill_pid --pid N\` sends TERM (PIDs 10–999999 only). For other actions (lock, sleep, mute): add an entry to \`ACTIONS\` (command must be a fixed string, no user input).

### Mac control from VPS (run on your Mac via SSH)

When MoltBot runs on the **VPS** (Linux), \`mac_control.js\` cannot run locally (it is macOS-only). To have the VPS trigger Mac control on your **Mac**:

1. **On the Mac**
   - Enable **Remote Login**: System Settings → General → Sharing → Remote Login (on).
   - Ensure the MoltBot repo is present (e.g. \`~/Documents/DEVELOPMENT/discord/bots/moltbot\`).
   - Make the wrapper executable: \`chmod +x automations/scripts/mac_control_remote_wrapper.sh\`.
   - Restrict the VPS SSH key to only run this wrapper. In \`~/.ssh/authorized_keys\`, add a line like:
     \`command="/Users/YOUR_USER/Documents/DEVELOPMENT/discord/bots/moltbot/automations/scripts/mac_control_remote_wrapper.sh" ssh-ed25519 AAAA...\`
     (Use the full path to \`mac_control_remote_wrapper.sh\` and paste the VPS public key.)

2. **Reachability**
   - The VPS must be able to SSH to the Mac. Options: same network, VPN, or Tailscale (e.g. \`mac-tailscale-name\`) so the VPS can \`ssh user@mac-host\`.

3. **On the VPS** (in MoltBot \`.env\`)
   - \`MAC_CONTROL_SSH=user@mac-host\` — e.g. \`matthew@mac.local\` or \`matthew@100.x.x.x\` (Tailscale).
   - \`MAC_CONTROL_WRAPPER=/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/moltbot/automations/scripts/mac_control_remote_wrapper.sh\` — the **path on the Mac** (used as the remote command).
   - \`MAC_CONTROL_SSH_KEY=/root/.ssh/mac_control_key\` — (optional) path to the private key on the VPS used to log in to the Mac. If unset, default SSH keys are used.

After that, when you ask the bot on Discord (VPS) to e.g. "open Vivaldi" or "list laggy processes", it will run the command on your Mac via SSH. The wrapper only allows allowlisted actions (no arbitrary shell commands).

To add one: create the script under \`scripts/\`, add its filename to \`allowedScripts\` in \`config/security.js\`, and add an intent line in \`src/ai/prompts.js\` (Intent → Command table) so the bot maps natural language to the script.

## Automation

Set up cron jobs for automated processing:
```bash
# Ingest data every 10 minutes
*/10 * * * * cd /path/to/moltbot && node automations/scripts/ingest_discord.js

# Generate digest every 6 hours
0 */6 * * * cd /path/to/moltbot && node automations/scripts/generate_digest.js --hours 6

# Update journal daily at midnight
0 0 * * * cd /path/to/moltbot && node automations/scripts/generate_journal.js
```