# Why Bots Go Offline & How to Investigate

## Restart all bots (PM2 on VPS)

From your Mac:

```bash
cd discord/bots
./restart-pm2-vps.sh
```

Options:

- `./restart-pm2-vps.sh --status-only` – show PM2 list only (no restart)
- `./restart-pm2-vps.sh --logs` – restart then show last 20 log lines per app
- `./restart-pm2-vps.sh --err` – restart then show last 30 error log lines

Or SSH and run on the VPS:

```bash
ssh root@64.23.179.177
cd /root/discord-bots
pm2 restart all
pm2 save
pm2 list
```

---

## Why bots might go offline

| Cause | What to check |
|-------|----------------|
| **Process crash** | Uncaught exception, OOM. Check `pm2 logs <app> --err --lines 100`. |
| **VPS reboot** | PM2 not started on boot. On VPS: `pm2 startup` (run the command it prints), then `pm2 save`. |
| **Discord token** | Invalid/expired token or rate limit. Check bot’s error log; verify token in Discord Developer Portal. |
| **Missing .env** | Bots use `env_file` in ecosystem.config.js. Ensure `.env` exists in each bot’s `cwd` on VPS. |
| **External APIs** | Exercism, GitHub, Reddit, YouTube, etc. down or rate-limiting. Check error logs and status pages. |
| **MonitoRSS stack** | RabbitMQ, Redis, or Postgres down. `pm2 logs monitorss-monolith --err`; ensure services are running. |
| **Disk full** | Logs or data filling disk. On VPS: `df -h`, clear old logs or increase space. |
| **Node/Python path** | After OS or runtime updates, `node`/`python3` may be missing or different. Check `which node` / `which python3` and ecosystem `interpreter`. |

---

## Quick investigation on VPS

```bash
ssh root@64.23.179.177

# List apps and status (online/stopped/errored)
pm2 list

# Recent errors for one app
pm2 logs exercism-bot --err --lines 50 --nostream

# All apps’ last 30 err lines
pm2 logs --err --lines 30 --nostream

# Restart a single app
pm2 restart exercism-bot

# Restart all and persist
pm2 restart all && pm2 save
```

---

## Ecosystem and deploy

- PM2 config on the VPS: the deploy workflow **preserves** the existing `ecosystem.config.js` (backup, git reset, restore), then runs **merge** (`scripts/merge-ecosystem.js`): any app in the example that is missing on the VPS is **added** from the example; existing VPS app entries are left unchanged. So the VPS always ends up with all bots from the example, and any server-only customizations per app are kept.
- **Full app list** is in `ecosystem.config.example.js`. To push the full config to the VPS (e.g. after adding bots, or to fix a stale/minimal config):
  ```bash
  scp discord/bots/ecosystem.config.example.js root@64.23.179.177:/root/discord-bots/ecosystem.config.js
  ssh root@64.23.179.177 "cd /root/discord-bots && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js && pm2 save && pm2 list"
  ```
- **2025-02-05:** VPS had only 2 apps (minimal config preserved by deploy). Fixed via scp once. Deploy now runs a merge step so missing apps from the example are added automatically; no need to scp when adding new bots (just add to the example and push).

- Adding/removing apps: update ecosystem on the VPS, then `pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js && pm2 save`.
- Deploy workflow (GitHub Actions) does a full restart: `pm2 delete all`, `pm2 start ecosystem.config.js`, `pm2 save`.
