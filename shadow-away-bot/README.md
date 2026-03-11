# shadow-away-bot

Owner-only Discord bot that replies when you are away and sends a return digest when you come back.

## Features
- Owner-only `/shadowaway` command suite
- Ephemeral command responses (private to owner)
- Mention auto-reply with allowlist, dedupe, cooldown, and hourly limits
- Pending mention queue + return digest with jump links
- Optional OpenAI rephrase mode for lore-accurate shadow tone
- Optional signed bridge API for BetterDiscord companion events

## Quick Start
1. Copy `.env.example` to `.env`
2. Set `DISCORD_TOKEN`, `CLIENT_ID`, `OWNER_USER_IDS`
3. Install deps: `npm install`
4. Deploy commands: `npm run deploy`
5. Run bot: `npm start`

## Command
Use `/shadowaway` with subcommands:
- `on`, `off`, `enabled`, `status`, `set`, `back`
- AI control: `ai mode` (`static` or `ai`)
- Scope policy: if `deployedGuildIds` is configured, replies are restricted to those guild(s); channels are allowed by default.

## Bridge API (Optional)
Enable with `SHADOWAWAY_BRIDGE_ENABLED=true` and set `SHADOWAWAY_BRIDGE_SECRET`.

### BetterDiscord Companion (ShadowAwayBridge)
- Build output path: `betterdiscord-assets/plugins/ShadowAwayBridge.plugin.js`
- Install/enable the plugin in BetterDiscord.
- In plugin settings, set:
  - `Bridge URL` to `http://127.0.0.1:8787/shadowaway/bridge` (local), or your HTTPS VPS bridge endpoint
  - `Bridge Secret` to the same value as `SHADOWAWAY_BRIDGE_SECRET`
- Supported bridge events:
  - `away_on` (enable away mode + status text)
  - `away_off` (disable away mode)
  - `user_back_online` (close away session + send digest; requires guild/channel scope)
  - `peek_pending_digest` (owner-only, read-only digest summary for UI badges)
  - `consume_pending_digest` (owner-only, channel-locked fetch + clear of cached return digest)
- Auto return mode:
  - plugin can emit `user_back_online` on your first outbound normal text message in guild channels.
  - channel-header widget can emit `consume_pending_digest` to open a private local report view and clear the cached digest.

### Remote Bridge on VPS (DigitalOcean)
- `shadow-away-bot` is in the VPS PM2 ecosystem/deploy workflow (`ecosystem.config.example.js` + `.github/workflows/deploy.yml`).
- Recommended env on VPS:
  - `SHADOWAWAY_BRIDGE_ENABLED=true`
  - `SHADOWAWAY_BRIDGE_HOST=0.0.0.0`
  - `SHADOWAWAY_BRIDGE_PORT=8787`
  - `SHADOWAWAY_BRIDGE_PATH=/shadowaway/bridge`
  - `SHADOWAWAY_BRIDGE_SECRET=<strong-random-secret>`
  - `SHADOWAWAY_BRIDGE_ALLOWED_ORIGINS=https://discord.com,https://ptb.discord.com,https://canary.discord.com`
  - `SHADOWAWAY_BRIDGE_TRUSTED_IPS=<optional-csv-of-client-public-ips>`
- Expose bridge through HTTPS reverse proxy (recommended) and point BD plugin `Bridge URL` to that HTTPS URL.
- Keep `SHADOWAWAY_BRIDGE_SECRET` identical between bot env and plugin settings.

## AI Mode
- Set `OPENAI_API_KEY` in `.env`
- Optional model override: `OPENAI_MODEL` (default `gpt-4o-mini`)
- Set mode with `/shadowaway ai mode value:ai`
- If AI is unavailable, bot safely falls back to static replies
