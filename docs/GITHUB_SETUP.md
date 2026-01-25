# GitHub Repository Setup Guide

Complete step-by-step guide to set up a private GitHub repository for your Discord bots.

## 🎯 Step 1: Create GitHub Repository

1. **Go to GitHub**: [github.com](https://github.com)
2. **Sign in** (or create account if needed)
3. **Click the "+" icon** (top right) → **"New repository"**
4. **Fill in details**:
   - **Repository name**: `discord-bots` (or your choice)
   - **Description**: "Discord bots for various purposes" (optional)
   - **Visibility**: ✅ **Private** (IMPORTANT!)
   - **DO NOT** check "Add a README file"
   - **DO NOT** add .gitignore (we'll create our own)
   - **DO NOT** choose a license (unless you want to)
5. **Click "Create repository"**

## 🔐 Step 2: Verify .gitignore is Set Up

Before pushing, make sure sensitive files are excluded:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots

# Check if .gitignore exists
cat .gitignore

# Verify it excludes .env files
grep -i "\.env" .gitignore
```

**If .gitignore doesn't exist or is missing .env**, it's already created at the root level.

## 🚀 Step 3: Initialize Git and Push

Run these commands on your Mac:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots

# Check if Git is already initialized
if [ -d ".git" ]; then
    echo "Git already initialized"
else
    # Initialize Git repository
    git init
fi

# Check what files will be committed (verify .env is NOT listed)
git status

# Add all files (except those in .gitignore)
git add .

# Verify .env files are NOT being added
git status | grep -i "\.env"
# Should return nothing (no .env files should be staged)

# Create initial commit
git commit -m "Initial commit: Discord bots setup

- Multiple Discord bots (coding-practice, command-control, hangman, etc.)
- PM2 ecosystem configuration
- Deployment scripts for DigitalOcean VPS
- All sensitive data excluded via .gitignore"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/discord-bots.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**When prompted for credentials:**

- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your GitHub password)

## 🔑 Step 4: Create Personal Access Token (if needed)

If GitHub asks for a password, you need a Personal Access Token:

1. **Go to GitHub** → Click your profile (top right) → **Settings**
2. **Scroll down** → **Developer settings** (left sidebar)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. **Name it**: "Discord Bots VPS"
6. **Select scopes**: Check **`repo`** (full control of private repositories)
7. **Generate token**
8. **COPY THE TOKEN** (you won't see it again!)
9. **Use this token as your password** when pushing

## ✅ Step 5: Verify Everything is Pushed

Check GitHub:

1. Go to your repository: `https://github.com/YOUR_USERNAME/discord-bots`
2. Verify files are there
3. **VERIFY `.env` files are NOT visible** (they should be excluded)

## 📥 Step 6: Clone on Your VPS

Now on your DigitalOcean VPS:

```bash
# Create directory
mkdir -p /root/discord-bots
cd /root/discord-bots

# Clone repository
git clone https://github.com/YOUR_USERNAME/discord-bots.git .

# Verify files
ls -la

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

## 🔄 Step 7: Future Updates Workflow

### When you make changes

**On your Mac:**

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots

# Make your changes to bot files...

# Stage changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push
```

**On your VPS:**

```bash
cd /root/discord-bots

# Pull latest changes
git pull

# If package.json changed, update dependencies
cd bot-name
npm install --production
cd ..

# Restart affected bots
pm2 restart bot-name
# or
pm2 restart all
```

## 🔒 Security Checklist

Before pushing, verify:

- [ ] `.gitignore` exists and includes `.env`
- [ ] No `.env` files are staged (`git status` shows none)
- [ ] No hardcoded tokens in code files
- [ ] Repository is set to **Private**
- [ ] Personal Access Token is saved securely

## 🐛 Troubleshooting

### "Repository not found" error

**Problem**: Wrong repository URL or permissions

**Solution**:

```bash
# Check remote URL
git remote -v

# Update if wrong
git remote set-url origin https://github.com/YOUR_USERNAME/discord-bots.git
```

### "Authentication failed"

**Problem**: Need Personal Access Token

**Solution**: Create token (see Step 4) and use it as password

### ".env files are showing in GitHub"

**Problem**: .gitignore not working or files already committed

**Solution**:

```bash
# Remove from Git (but keep local file)
git rm --cached .env
git rm --cached "**/.env"

# Update .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "Remove .env files from repository"

# Push
git push
```

### "Everything up to date" but changes not showing

**Problem**: Forgot to commit or push

**Solution**:

```bash
# Check status
git status

# If files are modified but not staged:
git add .
git commit -m "Your message"
git push
```

## 📝 Quick Reference

**Initial Setup:**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/discord-bots.git
git push -u origin main
```

**Daily Updates:**

```bash
# Mac: Make changes, then:
git add .
git commit -m "Description"
git push

# VPS: Pull changes
git pull
pm2 restart all
```

## 🎉 You're Done

Your bots are now:

- ✅ Backed up on GitHub
- ✅ Version controlled
- ✅ Easy to update
- ✅ Secure (private repo, .env excluded)

---

**Need help?** Check the troubleshooting section or verify your `.gitignore` is working correctly.
