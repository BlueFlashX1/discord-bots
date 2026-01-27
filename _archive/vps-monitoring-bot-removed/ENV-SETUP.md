# Environment Variables Setup

Create a `.env` file in this directory with the following variables:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# VPS Connection Configuration
VPS_HOST=root@64.23.179.177
VPS_SSH_KEY=~/.ssh/id_rsa_deploy
```

## Required Variables

- **DISCORD_TOKEN** - Your Discord bot token (required)
- **CLIENT_ID** - Your Discord application client ID (required for command deployment)
- **VPS_HOST** - VPS host in format `user@host` (e.g., `root@64.23.179.177`)
- **VPS_SSH_KEY** - Path to SSH private key for VPS access (e.g., `~/.ssh/id_rsa_deploy`)

## Setup Steps

1. Copy this template to `.env`:
   ```bash
   cp ENV-SETUP.md .env
   # Then edit .env with your actual values
   ```

2. On VPS, the SSH key path should be:
   ```bash
   VPS_SSH_KEY=/root/.ssh/id_rsa_deploy
   ```

3. Make sure the SSH key has correct permissions:
   ```bash
   chmod 600 ~/.ssh/id_rsa_deploy
   ```
