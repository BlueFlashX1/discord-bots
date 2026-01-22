# What's Next? - Your Discord Bots Are Live! 🎉

## ✅ What's Working Now

Your Discord bots are now:

- ✅ Running 24/7 on DigitalOcean VPS
- ✅ Auto-deploying on every `git push`
- ✅ Managed by PM2 (auto-restart on crashes)
- ✅ Auto-start on server reboot (PM2 startup script)
- ✅ Monitored and logged

**How 24/7 Works:**
- PM2 process manager keeps bots running
- Auto-restarts if a bot crashes
- `pm2 startup` ensures bots start after server reboots
- You don't need to run any commands - it's all automatic!

## 🚀 Daily Workflow

### Making Changes to Bots

1. **Edit code locally** on your Mac
2. **Test locally** (if needed)
3. **Commit and push:**

   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

4. **That's it!** GitHub Actions automatically:
   - Deploys to VPS
   - Updates dependencies
   - Restarts bots with PM2

### Checking Deployment Status

- **GitHub Actions:** <https://github.com/BlueFlashX1/discord-bots/actions>
- **VPS Status:** SSH to your VPS and run `pm2 list`

## 📋 Common Tasks

### View Bot Logs

**On VPS:**

```bash
ssh root@64.23.179.177
pm2 logs [bot-name]    # Specific bot
pm2 logs               # All bots
```

**Or use helper script:**

```bash
./scripts/manage-bots.sh logs [bot-name]
```

### Restart a Bot

**On VPS:**

```bash
pm2 restart [bot-name]
pm2 restart all        # All bots
```

**Or use helper script:**

```bash
./scripts/manage-bots.sh restart [bot-name]
```

### Check Bot Status

**On VPS:**

```bash
pm2 list               # See all bots
pm2 status             # Detailed status
pm2 monit              # Real-time monitoring
```

### Stop/Start Bots

**On VPS:**

```bash
pm2 stop all           # Stop all
pm2 start all          # Start all
pm2 stop [bot-name]    # Stop specific bot
```

## 🚀 Initial Deployment (First Time Only)

If you haven't deployed to VPS yet, see: `docs/INITIAL_DEPLOYMENT.md` or `docs/QUICK_DEPLOY.md`

**Quick summary:**
1. SSH to VPS: `ssh root@64.23.179.177`
2. Clone repo: `git clone https://github.com/BlueFlashX1/discord-bots.git /root/discord-bots`
3. Run: `cd /root/discord-bots && ./deploy.sh`
4. Create `.env` files for each bot
5. Restart: `pm2 restart all && pm2 save`

**After this one-time setup, bots stay online 24/7 automatically!**

## ➕ Adding New Bots

See: `docs/ADDING_NEW_BOTS.md`

**Quick steps:**

1. Create bot directory locally
2. Add to `ecosystem.config.js`
3. Push to GitHub (auto-deploys)
4. SSH to VPS and create `.env` file for the bot
5. Restart: `pm2 restart [bot-name]`

## 🔧 Troubleshooting

### Bot Not Responding

1. **Check if it's running:**

   ```bash
   ssh root@64.23.179.177
   pm2 list
   ```

2. **Check logs:**

   ```bash
   pm2 logs [bot-name] --lines 50
   ```

3. **Restart:**

   ```bash
   pm2 restart [bot-name]
   ```

### Deployment Failed

1. **Check GitHub Actions:** <https://github.com/BlueFlashX1/discord-bots/actions>
2. **Check logs** for error messages
3. **Common issues:**
   - Missing `.env` file on VPS
   - Missing dependencies (run `npm install` on VPS)
   - Syntax errors in code

### SSH Connection Issues

- **Test connection:** `./scripts/test-ssh-connection.sh 64.23.179.177`
- **Copy key to clipboard:** `./scripts/copy-deploy-key.sh`
- **See:** `docs/SSH_TROUBLESHOOTING.md`

## 📁 Important Files

- **PM2 Config:** `ecosystem.config.js` - Controls all bots
- **Deployment:** `.github/workflows/deploy.yml` - Auto-deployment
- **Helper Scripts:** `scripts/` - Management tools
- **Documentation:** `docs/` - All guides

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| **Deploy changes** | `git push` (auto) |
| **View logs** | `pm2 logs [bot]` (on VPS) |
| **Restart bot** | `pm2 restart [bot]` (on VPS) |
| **Check status** | `pm2 list` (on VPS) |
| **SSH to VPS** | `ssh root@64.23.179.177` |
| **Test SSH** | `./scripts/test-ssh-connection.sh 64.23.179.177` |
| **Copy deploy key** | `./scripts/copy-deploy-key.sh` |

## 📚 Documentation

All guides are in `docs/`:

- `ADDING_NEW_BOTS.md` - Add new bots
- `DIGITALOCEAN_SETUP.md` - VPS setup
- `GITHUB_ACTIONS_SETUP.md` - Auto-deployment
- `SSH_KEY_SETUP.md` - SSH configuration
- `QUICK_REFERENCE.md` - Common commands

## 🎉 You're All Set

Your bots are now running 24/7 with automatic deployment. Just code, commit, and push - everything else is automated!

**Need help?** Check the docs or run the helper scripts in `scripts/`.
