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
- Only whitelisted scripts can execute
- Sensitive patterns are blocked
- Use `.gitignore` to prevent committing private data
- MoltBot cannot access any directories outside this folder
- All executions are logged to ../logs/audit.log

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