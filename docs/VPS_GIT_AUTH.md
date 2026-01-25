# VPS Git Authentication Setup

## Problem

GitHub no longer supports password authentication. You need either:

1. **Personal Access Token (PAT)** - Easier for HTTPS
2. **SSH Key** - More secure, better for automation

## Solution 1: Personal Access Token (Recommended for Quick Setup)

### Step 1: Create GitHub Personal Access Token

1. Go to: <https://github.com/settings/tokens>
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "VPS Deployment"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Use Token on VPS

**Option A: Clone with token in URL (one-time)**

```bash
# On your VPS
cd /root
git clone https://YOUR_TOKEN@github.com/BlueFlashX1/discord-bots.git discord-bots
```

Replace `YOUR_TOKEN` with your actual token.

**Option B: Configure Git credential helper (better)**

```bash
# On your VPS
cd /root
git clone https://github.com/BlueFlashX1/discord-bots.git discord-bots
# When prompted for username: BlueFlashX1
# When prompted for password: PASTE_YOUR_TOKEN_HERE
```

Then configure credential helper to save it:

```bash
cd /root/discord-bots
git config --global credential.helper store
git pull  # Will save credentials
```

## Solution 2: SSH Key (More Secure, Better for Automation)

### Step 1: Generate SSH Key on VPS

```bash
# On your VPS
ssh-keygen -t ed25519 -C "vps-deployment" -f ~/.ssh/id_ed25519_vps
# Press Enter for no passphrase (or set one if you want)
```

### Step 2: Add Public Key to GitHub

```bash
# On your VPS, display the public key
cat ~/.ssh/id_ed25519_vps.pub
```

Copy the output, then:

1. Go to: <https://github.com/settings/keys>
2. Click "New SSH key"
3. Title: "VPS Deployment Key"
4. Key: Paste the public key
5. Click "Add SSH key"

### Step 3: Clone Using SSH

```bash
# On your VPS
cd /root
git clone git@github.com:BlueFlashX1/discord-bots.git discord-bots
```

### Step 4: Configure SSH for GitHub

```bash
# On your VPS
cat >> ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_vps
    IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

## Quick Fix for Current Error

If you're already on the VPS and got the error:

**Option 1: Use Personal Access Token**

```bash
cd /root
# Delete failed clone attempt
rm -rf discord-bots

# Clone with token
git clone https://YOUR_TOKEN@github.com/BlueFlashX1/discord-bots.git discord-bots
```

**Option 2: Use SSH (if you set up SSH key above)**

```bash
cd /root
rm -rf discord-bots
git clone git@github.com:BlueFlashX1/discord-bots.git discord-bots
```

## Update deploy.sh to Use SSH

If you use SSH key, update `deploy.sh` to clone with SSH:

```bash
# In deploy.sh, change:
git clone <your-repo-url> .

# To:
git clone git@github.com:BlueFlashX1/discord-bots.git .
```

## Recommendation

**For automation (GitHub Actions):** SSH key is better
**For quick setup:** Personal Access Token is easier

Since you already have GitHub Actions working with SSH, I recommend setting up SSH key on VPS too for consistency.
