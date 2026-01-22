# DigitalOcean VPS - Quick Reference

## 🚀 Initial Setup (One-Time)

1. **Create Droplet** on DigitalOcean ($6/month)
2. **SSH into VPS**: `ssh root@YOUR_IP`
3. **Run setup**:
   ```bash
   apt-get update && apt-get upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs git
   npm install -g pm2
   ```
4. **Clone your repo**: `git clone YOUR_REPO /root/discord-bots`
5. **Run deploy script**: `cd /root/discord-bots && ./deploy.sh`
6. **Create .env files** for each bot with Discord tokens
7. **Restart**: `pm2 restart all`

## 📝 Daily Commands

```bash
# Check if bots are running
pm2 list

# View logs
pm2 logs --lines 50

# Restart a bot
pm2 restart coding-practice-bot

# Restart all bots
pm2 restart all
```

## 🔄 Update Bots

```bash
cd /root/discord-bots
git pull
pm2 restart all
```

## 🐛 Troubleshooting

```bash
# Bot not working?
pm2 logs <bot-name> --err

# Bot crashed?
pm2 restart <bot-name>

# Check system resources
free -h
df -h
```

## 💡 Pro Tips

- Use `pm2 monit` for real-time monitoring
- Logs are in `/root/discord-bots/logs/`
- Bots auto-restart on crash
- Bots auto-start on server reboot
