# Exercism Bot

Discord bot for Exercism coding challenges and practice.

## Features

- Exercism challenge integration
- Progress tracking
- Solution submissions
- User statistics

## Setup

1. Copy `.env.example` to `.env` and fill in your Discord bot token
2. Install Python dependencies: `pip install -r requirements.txt`
3. Run the bot: `python bot.py`

## Environment Variables

See `.env.example` for required variables.

### Slash commands and updates

- On startup the bot syncs slash commands **globally** (can take up to ~1 hour to propagate).
- **Instant updates:** Set `GUILD_ID` in `.env` to your dev/test server ID. The bot will also sync to that guild; guild commands update **instantly** (Discord docs). Use that server to verify new commands right after deploy.
- To force-update commands without restarting the bot, run `python3 deploy-commands.py` (loads cogs, syncs, then exits).
- **Verify what Discord has:** Run `python3 verify-commands.py` after deploy. It GETs global commands from the Discord API and prints names/count so you can confirm the app is registered correctly.

### Troubleshooting: slash commands not updating after 1h+

1. Run `python3 verify-commands.py` on the VPS. If it lists your commands, Discord has them; the issue is likely **scope** or **client cache**.
2. **Re-invite the bot** with `applications.commands`: Developer Portal → your app → OAuth2 → URL Generator → scopes `bot` and `applications.commands` → generate link → add to server. Old invites may lack slash-command scope.
3. Set `GUILD_ID` to your dev server and redeploy. Use that server to test; guild updates are instant.
4. Fully quit Discord (desktop/app) and reopen, or try the web client / another server.
