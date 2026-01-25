# GitHub Actions Auto-Deployment Setup

Automatically deploy your bots to DigitalOcean VPS whenever you push to GitHub.

## 🎯 What This Does

When you push code to GitHub:
1. ✅ GitHub Actions triggers automatically
2. ✅ Connects to your VPS via SSH
3. ✅ Pulls latest code
4. ✅ Updates dependencies
5. ✅ Restarts bots with PM2
6. ✅ Your bots are live in ~2 minutes!

## 🔐 Step 1: Get Your VPS SSH Private Key

On your Mac, copy your SSH private key:

```bash
# Copy your private key to clipboard
cat ~/.ssh/id_rsa | pbcopy
```

**Or if you used a different key:**
```bash
cat ~/.ssh/id_rsa | pbcopy
```

**⚠️ Important:** This is your **private key** (starts with `-----BEGIN OPENSSH PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`)

## 🔑 Step 2: Add GitHub Secrets

1. **Go to your GitHub repository**: `https://github.com/BlueFlashX1/discord-bots`
2. **Click "Settings"** (top menu)
3. **Click "Secrets and variables"** → **"Actions"**
4. **Click "New repository secret"** for each:

### Secret 1: `VPS_HOST`
- **Name**: `VPS_HOST`
- **Value**: Your Droplet IP address (e.g., `123.45.67.89`)
- Click **"Add secret"**

### Secret 2: `VPS_USERNAME`
- **Name**: `VPS_USERNAME`
- **Value**: `root`
- Click **"Add secret"**

### Secret 3: `VPS_SSH_KEY`
- **Name**: `VPS_SSH_KEY`
- **Value**: Paste your **private SSH key** (the one you copied with `cat ~/.ssh/id_rsa | pbcopy`)
- Click **"Add secret"**

### Secret 4: `VPS_PORT` (Optional)
- **Name**: `VPS_PORT`
- **Value**: `22` (default SSH port)
- Click **"Add secret"**

## ✅ Step 3: Verify Workflow File

The workflow file is already created at:
`.github/workflows/deploy.yml`

It will automatically:
- Trigger on push to `main` branch
- Connect to your VPS
- Pull latest code
- Update dependencies
- Restart bots

## 🚀 Step 4: Test It!

Make a small change and push:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots

# Make a small change (add a comment to a file)
echo "# Auto-deployed" >> README.md

# Commit and push
git add .
git commit -m "Test auto-deployment"
git push
```

**Then check GitHub:**
1. Go to your repo → **"Actions"** tab
2. You should see "Deploy to DigitalOcean VPS" running
3. Click it to see the deployment progress
4. Green checkmark = success! ✅

## 📊 Monitoring Deployments

**View deployment status:**
- GitHub repo → **"Actions"** tab
- See all deployments and their status
- Click any deployment to see logs

**On your VPS, verify:**
```bash
# Check PM2 status
pm2 list

# View recent logs
pm2 logs --lines 20
```

## 🔄 How It Works

1. **You push code** → `git push`
2. **GitHub Actions triggers** → Runs workflow
3. **SSH to VPS** → Using your SSH key
4. **Pull code** → `git pull origin main`
5. **Update deps** → `npm install` for each bot
6. **Restart bots** → `pm2 reload ecosystem.config.js`
7. **Done!** → Bots are live with new code

## 🐛 Troubleshooting

### "Permission denied (publickey)"

**Problem**: SSH key not set up correctly

**Solution**:
1. Verify you copied the **private key** (not public)
2. Check secret name is exactly `VPS_SSH_KEY`
3. Make sure key includes `-----BEGIN` and `-----END` lines

### "Host key verification failed"

**Solution**: Add to workflow (already handled by the action)

### "Repository not found"

**Problem**: VPS doesn't have Git repo cloned

**Solution**: On VPS, run:
```bash
cd /root/discord-bots
git remote -v  # Should show GitHub URL
```

If not, clone it:
```bash
cd /root
rm -rf discord-bots  # If exists
git clone https://github.com/BlueFlashX1/discord-bots.git discord-bots
cd discord-bots
./deploy.sh
```

### Deployment fails but code is pushed

**Check logs:**
- GitHub Actions → Click failed workflow → See error logs
- Common issues: missing dependencies, PM2 not running, wrong paths

## 🔒 Security Notes

- ✅ SSH key is stored encrypted in GitHub Secrets
- ✅ Only accessible to GitHub Actions
- ✅ Private key never exposed in logs
- ✅ VPS IP is in secrets (not public)

## 🎯 Manual Deployment (Fallback)

If auto-deployment fails, deploy manually:

**On VPS:**
```bash
cd /root/discord-bots
git pull
pm2 restart all
```

## 📝 Workflow Customization

Edit `.github/workflows/deploy.yml` to:
- Deploy only specific bots
- Run tests before deployment
- Send notifications on success/failure
- Deploy to staging first

## ✅ Checklist

- [ ] GitHub Secrets added (VPS_HOST, VPS_USERNAME, VPS_SSH_KEY)
- [ ] Workflow file exists (`.github/workflows/deploy.yml`)
- [ ] Tested with a push
- [ ] Verified bots restart successfully
- [ ] Checked GitHub Actions logs

---

**You're all set!** Now every `git push` automatically deploys to your VPS! 🚀
