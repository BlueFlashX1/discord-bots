# DigitalOcean VPS Setup Guide for Discord Bots

Complete guide to deploy your Discord bots on DigitalOcean VPS for 24/7 uptime.

## 📋 Prerequisites

- DigitalOcean account (sign up at [digitalocean.com](https://www.digitalocean.com))
- Your Discord bot tokens (from Discord Developer Portal)
- Git repository with your bots (or ability to upload files)

## 🚀 Step 1: Create DigitalOcean Droplet

1. **Log in to DigitalOcean**
   - Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)

2. **Create a Droplet**
   - Click "Create" → "Droplets"
   - Choose:
     - **Image**: Ubuntu 22.04 (LTS)
     - **Plan**: Basic → Regular Intel → **$6/month** (1GB RAM, 1 vCPU) or **$12/month** (2GB RAM, 1 vCPU) for better performance
     - **Datacenter**: Choose closest to you
     - **Authentication**: SSH keys (recommended) or Password
   - **Hostname**: `discord-bots` (or your choice)
   - Click "Create Droplet"

3. **Wait for Droplet to be created** (1-2 minutes)

4. **Note your Droplet IP address** (shown on dashboard)

## 🔐 Step 2: Connect to Your VPS

### On macOS/Linux:

```bash
# Replace YOUR_IP with your Droplet IP
ssh root@YOUR_IP

# If using password, you'll be prompted
# If using SSH key, it should connect automatically
```

### On Windows:

Use **PuTTY** or **Windows Terminal** with SSH:
- Host: `YOUR_IP`
- Port: `22`
- User: `root`

## 📦 Step 3: Initial Server Setup

Once connected to your VPS, run:

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt-get install -y git

# Verify installations
node --version  # Should show v20.x.x
npm --version
pm2 --version
git --version
```

## 📥 Step 4: Deploy Your Bots

### Option A: Clone from Git Repository (Recommended)

```bash
# Create app directory
mkdir -p /root/discord-bots
cd /root/discord-bots

# Clone your repository
# Replace with your actual repo URL
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if you have a private repo:
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git .
```

### Option B: Upload Files Manually

```bash
# Create app directory
mkdir -p /root/discord-bots
cd /root/discord-bots

# Use SCP from your local machine to upload files
# On your Mac, run:
# scp -r /path/to/discord/bots/* root@YOUR_IP:/root/discord-bots/
```

## 🔧 Step 5: Run Deployment Script

```bash
cd /root/discord-bots

# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

The script will:
- ✅ Install all dependencies
- ✅ Check for .env files
- ✅ Start all bots with PM2
- ✅ Configure auto-start on reboot

## 🔑 Step 6: Configure Environment Variables

For each bot, you need to create a `.env` file with your Discord bot tokens.

### Create .env files:

```bash
cd /root/discord-bots

# Example: coding-practice-bot
nano coding-practice-bot/.env
```

Add your bot token:
```env
DISCORD_TOKEN=your_bot_token_here
# or
DISCORD_BOT_TOKEN=your_bot_token_here

# Add any other required environment variables
# (check each bot's .env.example file)
```

**Repeat for each bot:**
- `coding-practice-bot/.env`
- `command-control-bot/.env`
- `hangman-bot/.env`
- `spelling-bee-bot/.env`
- `grammar-bot/.env`
- `todoist bot/.env`
- `reddit-filter-bot/.env`
- `youtube-monitor-bot/.env`

### After creating .env files, restart bots:

```bash
pm2 restart all
```

## ✅ Step 7: Verify Bots Are Running

```bash
# Check PM2 status
pm2 list

# View logs for a specific bot
pm2 logs coding-practice-bot

# View all logs (last 50 lines)
pm2 logs --lines 50

# Monitor dashboard (real-time)
pm2 monit
```

You should see all bots with status "online" ✅

## 🎯 Useful PM2 Commands

```bash
# List all bots
pm2 list

# View logs
pm2 logs <bot-name>           # Specific bot
pm2 logs --lines 100          # All bots, last 100 lines
pm2 logs --err                # Only errors

# Control bots
pm2 restart all               # Restart all
pm2 restart <bot-name>        # Restart specific bot
pm2 stop all                  # Stop all
pm2 stop <bot-name>           # Stop specific bot
pm2 delete all                # Remove all from PM2
pm2 delete <bot-name>         # Remove specific bot

# Monitoring
pm2 monit                     # Real-time dashboard
pm2 status                    # Quick status

# Save configuration
pm2 save                      # Save current process list
pm2 startup                   # Generate startup script
```

## 🔄 Updating Your Bots

When you make changes to your bots:

```bash
cd /root/discord-bots

# Pull latest changes (if using Git)
git pull

# Or upload new files via SCP

# Restart bots to apply changes
pm2 restart all

# Or restart specific bot
pm2 restart coding-practice-bot
```

## 🔒 Security Best Practices

1. **Firewall Setup** (Optional but recommended):

```bash
# Install UFW (Uncomplicated Firewall)
apt-get install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS (if needed)
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

2. **Keep .env files secure**:
   - Never commit .env files to Git
   - Use strong, unique tokens
   - Rotate tokens if compromised

3. **Regular updates**:
```bash
# Update system packages monthly
apt-get update && apt-get upgrade -y

# Update Node.js packages
cd /root/discord-bots
# For each bot:
cd coding-practice-bot && npm update && cd ..
```

## 📊 Monitoring & Maintenance

### Check Bot Status Regularly

```bash
# Quick status check
pm2 status

# Detailed logs
pm2 logs --lines 20
```

### Set Up Log Rotation (Optional)

PM2 has built-in log rotation, but you can configure it:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor Resource Usage

```bash
# Check CPU and memory usage
pm2 monit

# Or use system tools
htop
# or
top
```

## 🐛 Troubleshooting

### Bot Not Starting

```bash
# Check logs for errors
pm2 logs <bot-name> --err

# Common issues:
# - Missing .env file
# - Invalid Discord token
# - Missing dependencies (run npm install in bot directory)
# - Port conflicts (unlikely for Discord bots)
```

### Bot Keeps Crashing

```bash
# Check error logs
pm2 logs <bot-name> --err

# Restart with more memory
pm2 restart <bot-name> --update-env

# Check system resources
free -h  # Memory
df -h   # Disk space
```

### Can't Connect to VPS

- Check DigitalOcean dashboard - is Droplet running?
- Verify IP address is correct
- Check firewall settings
- Try resetting root password in DigitalOcean dashboard

### Bots Offline After Reboot

```bash
# Re-run PM2 startup
pm2 startup systemd -u root --hp /root
pm2 save
```

## 💰 Cost Breakdown

- **DigitalOcean Droplet**: $6/month (1GB RAM) or $12/month (2GB RAM)
- **Bandwidth**: Usually included (1TB transfer)
- **Total**: ~$6-12/month for all bots

## 🎉 You're Done!

Your Discord bots should now be running 24/7 on DigitalOcean! 

**Next Steps:**
- Test your bots in Discord
- Monitor logs for the first few hours
- Set up alerts (optional) if you want notifications

## 📚 Additional Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Need Help?** Check the logs first: `pm2 logs --lines 50`
