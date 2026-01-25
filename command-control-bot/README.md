# Discord Command Control Bot

Discord bot that provides a button-based interface for executing shell commands remotely.

## Features

- Slash command `/control-panel` to display command buttons
- Real-time status updates (every 5 seconds, rate-limit safe)
- Multiple processes can run simultaneously
- Admin-only access control
- Process management (start/stop/restart)
- Process timeout support
- View full logs button
- Stream output to Discord threads
- Category support with select menus
- Config hot-reload (edit commands.json without restart)
- JSON validation on startup
- Automatic process cleanup (30 min after completion)
- Error logging and diagnostics
- Graceful shutdown handling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
ADMIN_USER_IDS=your_discord_user_id,another_admin_id
LOG_LEVEL=info

# SSH Configuration (for remote commands - VPS → macOS)
# Required if you have commands with "remote": true in commands.json
SSH_HOST=your-mac.local
# Or use your public IP if not on same network:
# SSH_HOST=123.45.67.89
SSH_USER=your_mac_username
SSH_KEY=/path/to/your/ssh/private/key
SSH_PORT=22
```

#### Environment Variables

| Variable               | Required | Description                                                                        |
| ---------------------- | -------- | ---------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        | Yes      | Bot token from Discord Developer Portal                                            |
| `DISCORD_CLIENT_ID`    | Yes      | Application/Client ID from Discord                                                 |
| `DISCORD_GUILD_ID`     | No       | Guild ID for faster command deployment (testing)                                   |
| `ADMIN_USER_IDS`       | Yes      | Comma-separated Discord user IDs that can use the bot                              |
| `LOG_LEVEL`            | No       | Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`)              |
| `SCHEDULER_CHANNEL_ID` | No       | Channel for scheduler notifications (deprecated - use `/settings channel` instead) |
| `SSH_HOST`             | No*      | Hostname/IP of local machine for remote commands (required if using `remote: true`) |
| `SSH_USER`             | No       | SSH username (defaults to current system user)                                     |
| `SSH_KEY`              | No       | Path to SSH private key file (if not using password auth)                          |
| `SSH_PORT`             | No       | SSH port (default: 22)                                                             |

\* Required when commands have `"remote": true` in commands.json

**Log Levels:**

- `debug` - Verbose output for troubleshooting (writes to `logs/debug.log`)
- `info` - Standard operation logs
- `warn` - Warnings and potential issues
- `error` - Errors only (always written to `logs/errors.log`)

### 3. Set Up SSH Access (For Remote Commands)

If you're running the bot on a VPS and need to execute commands on your local macOS machine, you need to set up SSH access:

**Step 1: Enable SSH on macOS**

On your macOS machine:

```bash
# Enable Remote Login in System Settings → General → Sharing
# Or via command line:
sudo systemsetup -setremotelogin on

# Find your macOS hostname/IP (you'll need this for VPS)
hostname  # Shows your .local hostname (e.g., "Matthews-MacBook-Pro.local")
scutil --get ComputerName  # Alternative way to get hostname
ipconfig getifaddr en0  # Get your local IP address (e.g., 192.168.1.xxx)
# Or check System Settings → Network for your IP address
```

**Step 2: Generate SSH Key on VPS**

SSH into your VPS, then run:

```bash
# On VPS - generate key pair
ssh-keygen -t ed25519 -f ~/.ssh/mac_access
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one if preferred)
```

**Step 3: Copy Public Key to macOS**

Still on your VPS, copy the public key to your macOS:

```bash
# On VPS - replace "your-mac.local" with your actual macOS hostname from Step 1
# Example: if hostname shows "Matthews-MacBook-Pro.local", use that:
ssh-copy-id -i ~/.ssh/mac_access.pub matthewthompson@Matthews-MacBook-Pro.local

# Or if hostname doesn't work, use your macOS IP address (from Step 1):
# ssh-copy-id -i ~/.ssh/mac_access.pub matthewthompson@192.168.1.xxx
```

**Alternative: Manual Key Copy**

If `ssh-copy-id` doesn't work, manually copy the key:

```bash
# On VPS - display the public key
cat ~/.ssh/mac_access.pub

# Copy the output, then on macOS, add it to authorized_keys:
# On macOS
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Step 4: Test SSH Connection**

On your VPS, test the connection:

```bash
# On VPS - replace "your-mac.local" with your actual macOS hostname or IP
# Example using hostname:
ssh -i ~/.ssh/mac_access matthewthompson@Matthews-MacBook-Pro.local "whoami"

# Or using IP address:
# ssh -i ~/.ssh/mac_access matthewthompson@192.168.1.xxx "whoami"

# Should output: matthewthompson
```

**Step 5: Configure .env on VPS**

On your VPS, edit the bot's `.env` file:

```bash
# On VPS - edit .env file
nano discord/bots/command-control-bot/.env
```

Add these lines (replace with your actual values):

```
# Replace "your-mac.local" with your actual macOS hostname or IP from Step 1
SSH_HOST=Matthews-MacBook-Pro.local  # or use IP: 192.168.1.xxx
SSH_USER=matthewthompson  # your macOS username
SSH_KEY=/root/.ssh/mac_access  # path to private key on VPS (adjust if not root user)
SSH_PORT=22
```

**Note:** If you're not the root user on VPS, adjust the SSH_KEY path:

- For root: `/root/.ssh/mac_access`
- For other users: `/home/username/.ssh/mac_access`

**Troubleshooting:**

- **`.local` hostname doesn't work**: This only works on the same local network. If your VPS is in the cloud and macOS is at home, you need one of these solutions:

  **Option A: Use Public IP (if you have one)**

  ```bash
  # Find your public IP on macOS
  curl ifconfig.me
  # Then use that IP in SSH_HOST (requires port forwarding on router)
  ```

  **Option B: Use Tailscale (Recommended - Easiest)**

  ```bash
  # Install Tailscale on both VPS and macOS
  # On macOS: Download from tailscale.com
  # On VPS: curl -fsSL https://tailscale.com/install.sh | sh
  # Both devices get a Tailscale IP (e.g., 100.x.x.x)
  # Use that IP in SSH_HOST
  ```

  **Option C: Use SSH Reverse Tunnel (Background Service)**

  This sets up autossh as a background service so you don't need to keep a terminal open.

  **Step 1: Install autossh on macOS**

  ```bash
  brew install autossh
  ```

  **Step 2: Create LaunchAgent to run autossh in background**

  ```bash
  # Create the plist file
  nano ~/Library/LaunchAgents/com.ssh.tunnel.plist
  ```

  Paste this (replace with your VPS details):

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
    <dict>
      <key>Label</key>
      <string>com.ssh.tunnel</string>
      <key>ProgramArguments</key>
      <array>
        <string>/opt/homebrew/bin/autossh</string>
        <string>-M</string>
        <string>0</string>
        <string>-f</string>
        <string>-N</string>
        <string>-i</string>
        <string>/Users/matthewthompson/.ssh/vps_key</string>
        <string>-R</string>
        <string>2222:localhost:22</string>
        <string>root@your_droplet_ip</string>
        <string>-o</string>
        <string>ServerAliveInterval=60</string>
        <string>-o</string>
        <string>ServerAliveCountMax=3</string>
        <string>-o</string>
        <string>ExitOnForwardFailure=yes</string>
      </array>
      <key>RunAtLoad</key>
      <true/>
      <key>KeepAlive</key>
      <true/>
      <key>StandardOutPath</key>
      <string>/tmp/ssh-tunnel.log</string>
      <key>StandardErrorPath</key>
      <string>/tmp/ssh-tunnel.error.log</string>
    </dict>
  </plist>
  ```

  **Important:** Replace these values:
  - `/Users/matthewthompson/.ssh/vps_key` - Your SSH key path (adjust username if different)
  - `root@your_droplet_ip` - Your VPS username and IP (e.g., `root@123.45.67.89`)
  - `/opt/homebrew/bin/autossh` - Change to `/usr/local/bin/autossh` if you're on Intel Mac

  **Step 3: Load the service**

  ```bash
  # Load the service (starts automatically)
  launchctl load ~/Library/LaunchAgents/com.ssh.tunnel.plist

  # Check if it's running
  launchctl list | grep ssh.tunnel

  # View logs if needed
  tail -f /tmp/ssh-tunnel.log
  ```

  **Step 4: Test from VPS**

  ```bash
  # On VPS - test the tunnel
  ssh -i ~/.ssh/mac_access -p 2222 matthewthompson@localhost "whoami"
  # Should output: matthewthompson
  ```

  **Useful commands:**

  ```bash
  # Stop the tunnel
  launchctl unload ~/Library/LaunchAgents/com.ssh.tunnel.plist

  # Start the tunnel
  launchctl load ~/Library/LaunchAgents/com.ssh.tunnel.plist

  # Restart the tunnel
  launchctl unload ~/Library/LaunchAgents/com.ssh.tunnel.plist
  launchctl load ~/Library/LaunchAgents/com.ssh.tunnel.plist
  ```

  **Then configure .env on VPS:**

  ```
  SSH_HOST=localhost
  SSH_PORT=2222
  SSH_USER=matthewthompson
  SSH_KEY=/root/.ssh/mac_access
  ```

- If you can't connect, check macOS firewall settings
- Make sure Remote Login is enabled in System Settings
- Check VPS can reach your macOS (same network or port forwarding)

**Note:** For commands that need to run on your local machine (like `rojo serve`), add `"remote": true` to the command in `commands.json`.

### 4. Configure Commands

Edit `config/commands.json` to add your commands:

```json
{
  "commands": [
    {
      "id": "my-server",
      "label": "Start Server",
      "command": "npm start",
      "directory": "~/projects/my-app",
      "description": "Start the development server",
      "category": "Development",
      "timeout": 3600000
    },
    {
      "id": "run-tests",
      "label": "Run Tests",
      "command": "npm test",
      "directory": "~/projects/my-app",
      "description": "Run test suite",
      "category": "Development",
      "timeout": 300000
    },
    {
      "id": "deploy",
      "label": "Deploy",
      "command": "./deploy.sh",
      "directory": "~/projects/my-app",
      "description": "Deploy to production",
      "category": "Operations"
    }
  ]
}
```

#### Command Options

| Field         | Required | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `id`          | Yes      | Unique identifier for the command                      |
| `label`       | Yes      | Button/menu label shown in Discord                     |
| `command`     | Yes      | Shell command to execute                               |
| `directory`   | Yes      | Working directory (supports `~` expansion)             |
| `description` | No       | Description shown in embed                             |
| `category`    | No       | Group commands into categories (shows as select menus) |
| `timeout`     | No       | Auto-kill after N milliseconds (0 = no timeout)        |
| `remote`      | No       | Set to `true` to execute command via SSH on local machine (VPS → macOS) |

### 5. Deploy Commands

```bash
npm run deploy
```

### 6. Start Bot

```bash
npm start
```

## Usage

1. Use `/control-panel` in Discord (admin only)
2. Select a command from buttons or category dropdown
3. Watch real-time status updates in the embed
4. Available buttons while running:
   - **Stop Process** - Kill the running process
   - **Stream to Thread** - Create a thread with live output
5. Available buttons when finished:
   - **Restart** - Run the command again
   - **View Logs** - Download full stdout/stderr
   - **Delete** - Remove the status message
6. Use **Reload Config** to apply changes to commands.json

### Settings

- `/settings channel [channel]` - Set notification channel for scheduled commands (admin only)
  - With channel: Sets notification channel (autocomplete available)
  - Without channel: Removes notification channel
- `/settings view` - View current bot settings

## Project Structure

```
command-control-bot/
├── index.js               # Main bot file
├── deploy-commands.js     # Command deployment
├── config/
│   └── commands.json      # Command definitions
├── commands/
│   └── control-panel.js   # /control-panel command
├── events/
│   ├── ready.js
│   └── interactionCreate.js
├── services/
│   ├── configManager.js   # Config loading/validation/hot-reload
│   ├── processManager.js  # Process execution & lifecycle
│   ├── statusUpdater.js   # Status updates & thread streaming
│   └── logger.js          # Error logging
└── logs/
    └── errors.log         # Error logs
```

## Permissions Required

The bot needs these Discord permissions:

- Send Messages
- Embed Links
- Attach Files
- Create Public Threads
- Send Messages in Threads
- Manage Threads
