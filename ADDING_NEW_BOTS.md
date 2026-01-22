# Adding New Bots to Your VPS

Guide for adding new Discord bots to your DigitalOcean VPS after initial setup.

## 🔄 Workflow Overview

When you add a new bot, you need to:
1. Upload the bot files to VPS
2. Add bot to `ecosystem.config.js`
3. Install dependencies
4. Create `.env` file
5. Start with PM2

## 📝 Step-by-Step: Adding a New Bot

### Step 1: Upload New Bot to VPS

**Option A: Upload from Mac (if not in Git)**

On your Mac:
```bash
# Upload new bot folder
scp -r /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/new-bot-name root@YOUR_IP:/root/discord-bots/
```

**Option B: Pull from Git (if using Git)**

On your VPS:
```bash
cd /root/discord-bots
git pull
```

### Step 2: Add Bot to PM2 Ecosystem

Edit `ecosystem.config.js` on your VPS:

```bash
cd /root/discord-bots
nano ecosystem.config.js
```

Add a new entry in the `apps` array:

```javascript
{
  name: 'new-bot-name',
  script: './new-bot-name/index.js',
  cwd: '/root/discord-bots',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '300M',
  env: {
    NODE_ENV: 'production',
  },
  error_file: './logs/new-bot-name-error.log',
  out_file: './logs/new-bot-name-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
},
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Install Dependencies

```bash
cd /root/discord-bots/new-bot-name
npm install --production
cd /root/discord-bots
```

### Step 4: Create .env File

```bash
cd /root/discord-bots/new-bot-name
nano .env
```

Add your Discord token:
```env
DISCORD_TOKEN=your_bot_token_here
# Add any other required environment variables
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Start the New Bot

```bash
cd /root/discord-bots

# Start just the new bot
pm2 start ecosystem.config.js --only new-bot-name

# Or reload entire ecosystem (restarts all bots)
pm2 reload ecosystem.config.js

# Save PM2 configuration
pm2 save
```

### Step 6: Verify It's Running

```bash
# Check status
pm2 list

# View logs
pm2 logs new-bot-name

# Check if bot is online in Discord
```

## 🚀 Quick Add Script

You can also use this helper script (run on VPS):

```bash
cd /root/discord-bots
./scripts/add-new-bot.sh new-bot-name
```

## 📋 Updating Existing Bots

When you update an existing bot:

### Option A: Git Pull (if using Git)

```bash
cd /root/discord-bots
git pull

# Update dependencies if package.json changed
cd bot-name
npm install --production
cd ..

# Restart the bot
pm2 restart bot-name
```

### Option B: Upload Updated Files

On your Mac:
```bash
# Upload updated files
scp -r /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/bot-name/* root@YOUR_IP:/root/discord-bots/bot-name/
```

On VPS:
```bash
cd /root/discord-bots/bot-name
npm install --production  # If dependencies changed
cd ..
pm2 restart bot-name
```

## 🔄 Automated Updates (Future Enhancement)

For automatic updates, you could set up:

1. **GitHub Actions** - Auto-deploy on push
2. **Cron job** - Pull from Git periodically
3. **Webhook** - Trigger deployment from Git push

But for now, manual updates are fine and give you more control.

## 📝 Checklist for New Bot

- [ ] Bot files uploaded to VPS
- [ ] Added to `ecosystem.config.js`
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with token
- [ ] Bot started with PM2
- [ ] Verified in Discord (bot is online)
- [ ] PM2 config saved (`pm2 save`)

## 💡 Pro Tips

1. **Test locally first** - Make sure bot works before deploying
2. **Check logs** - `pm2 logs new-bot-name` if issues
3. **Update ecosystem.config.js** - Keep it in sync with your bots
4. **Backup .env files** - Keep tokens safe (never commit to Git)

## 🐛 Troubleshooting

**Bot not starting?**
```bash
pm2 logs new-bot-name --err
# Check for missing .env, wrong token, or dependency issues
```

**Bot keeps crashing?**
```bash
pm2 logs new-bot-name
# Check error messages
```

**Forgot to add to ecosystem.config.js?**
```bash
# Start manually first
cd /root/discord-bots/new-bot-name
pm2 start index.js --name new-bot-name
pm2 save
# Then add to ecosystem.config.js for consistency
```

---

**Remember:** New bots are NOT automatically added. You need to follow these steps each time, but it only takes a few minutes!
