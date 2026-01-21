# Channel Redirection Guide

Guide for redirecting grammar corrections to a different channel when messages are in primary channels.

---

## Overview

**STRICT MODE:** The bot only analyzes messages from **explicitly configured servers**.

When users chat in **primary channels** (e.g., main chat), grammar corrections can be redirected to a **dedicated corrections channel** to keep the main channels clean.

**Requirements for analysis:**

- Server ID must be in `servers` configuration
- At least one primary channel ID must be configured
- Corrections channel ID must be configured
- Message must be in one of the configured primary channels

**Unconfigured servers:** Messages are completely ignored (no analysis, no logging, no API calls).

---

## Configuration

### Step 1: Get Channel IDs

1. **Enable Developer Mode** in Discord:

   - Settings → Advanced → Developer Mode (ON)

2. **Get Primary Channel ID** (where users chat):

   - Right-click channel name → Copy Channel ID
   - Example: `123456789012345678`

3. **Get Corrections Channel ID** (where corrections go):
   - Right-click corrections channel → Copy Channel ID
   - Example: `987654321098765432`

### Step 2: Configure `config.json`

Add channel configuration to `config.json`:

**Single Server (Legacy):**

```json
{
  "channels": {
    "default": {
      "correctionsChannelId": "987654321098765432",
      "primaryChannelIds": ["123456789012345678"]
    }
  }
}
```

**Multiple Servers (Required - Strict Mode):**

```json
{
  "channels": {
    "default": {
      "correctionsChannelId": null,
      "primaryChannelIds": []
    },
    "servers": {
      "1311948619091284009": {
        "correctionsChannelId": "1461876069719216219",
        "primaryChannelIds": ["1311948619678613568"]
      },
      "ANOTHER_SERVER_ID": {
        "correctionsChannelId": "DIFFERENT_CORRECTIONS_CHANNEL_ID",
        "primaryChannelIds": ["DIFFERENT_PRIMARY_CHANNEL_ID"]
      }
    }
  }
}
```

**Configuration Options:**

- `default`: Not used in strict mode (for backward compatibility only)
- `servers`: **REQUIRED** - Object mapping server IDs to their channel configurations
  - `correctionsChannelId`: **REQUIRED** - Channel ID where corrections should be sent
  - `primaryChannelIds`: **REQUIRED** - Array of channel IDs where messages should be analyzed (at least one required)

**Strict Mode Rules:**

- Server must be in `servers` object to be analyzed
- All three required: Server ID, Primary Channel(s), Corrections Channel
- Messages from unconfigured servers are completely ignored
- Multiple primary channels supported (array of channel IDs)

---

## How It Works

### Normal Behavior (No Redirection)

**Message in any channel:**

- User types in `#general`
- Bot replies in `#general` with correction

### With Redirection Enabled

**Message in primary channel:**

- User types in `#general` (primary channel)
- Bot sends correction to `#grammar-corrections` (corrections channel)
- Correction includes link to original message

**Message in non-primary channel:**

- User types in `#random` (not in primary list)
- Bot replies in `#random` normally

---

## Example

### Configuration

```json
{
  "channels": {
    "correctionsChannelId": "987654321098765432",
    "primaryChannelIds": ["123456789012345678"]
  }
}
```

### Scenario 1: Primary Channel

**User in `#general` (primary):**

```
User: "i did you so bad"
Bot: [Sends to #grammar-corrections channel]
     "Grammar Check
      Original Message: [Jump to message] → #general
      User: username#1234"
```

### Scenario 2: Non-Primary Channel

**User in `#random` (not primary):**

```
User: "i did you so bad"
Bot: [Replies in #random]
     "Grammar Check..."
```

---

## Setup Instructions

### Quick Setup

1. **Edit `config.json`:**

   ```bash
   nano grammar-bot/config.json
   ```

2. **Add channel configuration:**

   ```json
   "channels": {
     "correctionsChannelId": "YOUR_CORRECTIONS_CHANNEL_ID",
     "primaryChannelIds": ["YOUR_PRIMARY_CHANNEL_ID"]
   }
   ```

3. **Restart bot:**

   ```bash
   cd ~/Documents/DEVELOPMENT/discord/bots
   ./scripts/stop-all-bots.sh
   ./scripts/start-all-bots.sh
   ```

---

## Multiple Primary Channels (Per Server)

You can configure **multiple primary channels** per server. Messages in ANY of these channels will be analyzed:

```json
{
  "channels": {
    "servers": {
      "1311948619091284009": {
        "correctionsChannelId": "1461876069719216219",
        "primaryChannelIds": [
          "1311948619678613568", // #general
          "111111111111111111", // #main-chat
          "222222222222222222" // #announcements
        ]
      }
    }
  }
}
```

**Behavior:**

- Messages in **ANY** of the primary channels → Analyzed
- Corrections from **ALL** primary channels → Redirected to corrections channel
- Messages in other channels → Completely ignored (no analysis)

**Example:**

- User sends message in `#general` → Analyzed → Correction sent to corrections channel
- User sends message in `#main-chat` → Analyzed → Correction sent to corrections channel
- User sends message in `#random` → Ignored (not in primary list)

---

## Disable Redirection

To disable channel redirection:

**Option 1: Empty primary channels list for a server**

```json
{
  "channels": {
    "servers": {
      "1311948619091284009": {
        "correctionsChannelId": "1461876069719216219",
        "primaryChannelIds": []
      }
    }
  }
}
```

**Option 2: Remove corrections channel ID for a server**

```json
{
  "channels": {
    "servers": {
      "1311948619091284009": {
        "correctionsChannelId": null,
        "primaryChannelIds": ["1311948619678613568"]
      }
    }
  }
}
```

**Option 3: Remove server from config (uses default)**

```json
{
  "channels": {
    "default": {
      "correctionsChannelId": null,
      "primaryChannelIds": []
    },
    "servers": {
      // Server not listed = uses default (no redirection)
    }
  }
}
```

---

## Features

### Link to Original Message

When redirecting, corrections include:

- **Jump link** to original message
- **Channel name** where message was sent
- **User tag** who sent the message

**Example:**

```
Original Message
[Jump to message] → #general
Channel: general
User: username#1234
```

### Fallback Behavior

If redirect fails (channel not found, no permissions, etc.):

- Falls back to normal reply in original channel
- Logs warning for debugging
- Never silently fails

---

## Troubleshooting

### Corrections Not Redirecting

**Problem:** Messages still reply in same channel

**Solutions:**

1. Check channel IDs are correct (numbers only)
2. Verify bot has permissions in corrections channel
3. Restart bot after changing `config.json`
4. Check `primaryChannelIds` includes the channel ID

### "Channel Not Found" Error

**Problem:** Bot can't find corrections channel

**Solutions:**

1. Verify channel ID is correct
2. Check bot has access to channel (not hidden/private)
3. Ensure bot has "View Channels" permission
4. Check channel exists in same server

### Permission Errors

**Problem:** Bot can't send messages to corrections channel

**Solutions:**

1. Check bot has "Send Messages" permission
2. Verify bot has "Embed Links" permission (for embeds)
3. Check channel allows bots to send messages
4. Verify bot role has correct permissions

---

## Multi-Server Configuration

The bot now supports per-server channel configuration:

```json
{
  "channels": {
    "default": {
      "correctionsChannelId": null,
      "primaryChannelIds": []
    },
    "servers": {
      "1311948619091284009": {
        "correctionsChannelId": "1461876069719216219",
        "primaryChannelIds": ["1311948619678613568"]
      },
      "ANOTHER_SERVER_ID": {
        "correctionsChannelId": "DIFFERENT_CORRECTIONS_CHANNEL_ID",
        "primaryChannelIds": ["DIFFERENT_PRIMARY_CHANNEL_ID"]
      }
    }
  }
}
```

**How it works:**

- Bot checks the server ID of incoming messages
- Looks up configuration in `servers[serverId]`
- Falls back to `default` if server not configured
- Each server can have different primary channels and corrections channel

---

## Current Implementation

The redirection is implemented in:

- **File:** `events/messageCreate.js`
- **Function:** `sendCorrectionMessage()`

**Logic:**

1. Check if message channel is in `primaryChannelIds`
2. Check if `correctionsChannelId` is configured
3. If both true → send to corrections channel
4. Otherwise → reply in same channel

---

**Last Updated:** 2026-01-17  
**Location:** `grammar-bot/config.json`
