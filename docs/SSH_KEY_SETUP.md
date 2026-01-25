# SSH Key Setup for DigitalOcean (macOS)

Complete guide to set up SSH keys for secure access to your DigitalOcean Droplet.

## 🔑 Step 1: Check if you already have an SSH key

Open Terminal and run:

```bash
ls -la ~/.ssh/id_rsa.pub
```

**If you see a file**, you already have a key! Skip to Step 3.

**If you see "No such file"**, continue to Step 2.

## 🆕 Step 2: Generate a new SSH key

Run this command in Terminal:

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

**Replace `your_email@example.com` with your actual email** (or any identifier you want).

**When prompted:**

1. **"Enter file in which to save the key"**: 
   - Press **Enter** to accept default (`/Users/matthewthompson/.ssh/id_rsa`)

2. **"Enter passphrase"** (optional but recommended):
   - Press **Enter** for no passphrase (easiest)
   - OR type a passphrase for extra security (you'll need to enter it each time you SSH)

3. **"Enter same passphrase again"**:
   - Press **Enter** again (or retype your passphrase)

**You should see:**
```
Your identification has been saved in /Users/matthewthompson/.ssh/id_rsa
Your public key has been saved in /Users/matthewthompson/.ssh/id_rsa.pub
```

✅ **Key generated!**

## 📋 Step 3: Copy your public key

Run this command to copy your public key to clipboard:

```bash
cat ~/.ssh/id_rsa.pub | pbcopy
```

**Your public key is now in your clipboard!** (You won't see any output, but it's copied)

**To verify it was copied**, you can paste it somewhere (like a text editor) to see it. It should look like:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC... (long string) ... your_email@example.com
```

## 🌐 Step 4: Add SSH key to DigitalOcean

### Option A: During Droplet Creation (Recommended)

1. **In DigitalOcean Droplet creation screen**, look for "Authentication" section
2. Click **"New SSH Key"** button
3. **Paste your public key** (Cmd+V) into the text field
4. **Give it a name** (e.g., "MacBook Pro" or "Matthew's Mac")
5. Click **"Add SSH Key"**
6. **Select the key** you just added (checkbox should be checked)
7. Continue with Droplet creation

### Option B: Add to DigitalOcean Account (Before Creating Droplet)

1. Go to **DigitalOcean Dashboard**
2. Click **"Settings"** in left sidebar
3. Click **"Security"** tab
4. Click **"Add SSH Key"**
5. **Paste your public key** (Cmd+V)
6. **Give it a name** (e.g., "MacBook Pro")
7. Click **"Add SSH Key"**
8. Now when creating Droplet, you can select this key

## ✅ Step 5: Test SSH connection

After your Droplet is created:

1. **Get your Droplet IP** from DigitalOcean dashboard
2. **Connect via SSH**:

```bash
ssh root@YOUR_DROPLET_IP
```

**Example:**
```bash
ssh root@123.45.67.89
```

**First time connecting**, you'll see:
```
The authenticity of host '123.45.67.89' can't be established.
RSA key fingerprint is ...
Are you sure you want to continue connecting (yes/no)?
```

Type **`yes`** and press Enter.

**If using SSH key:**
- You should connect **without entering a password** ✅
- You're in!

**If it asks for password:**
- Your SSH key might not be set up correctly
- Check Step 4 again

## 🔧 Troubleshooting

### "Permission denied (publickey)"

**Problem:** SSH key not recognized

**Solutions:**

1. **Verify key was added to DigitalOcean:**
   - Go to Settings → Security
   - Check your key is listed

2. **Try connecting with explicit key:**
   ```bash
   ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP
   ```

3. **Check key permissions:**
   ```bash
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   ```

### "Host key verification failed"

**Problem:** IP address changed or server was recreated

**Solution:**
```bash
# Remove old key from known_hosts
ssh-keygen -R YOUR_DROPLET_IP
# Then try connecting again
ssh root@YOUR_DROPLET_IP
```

### Still asking for password

**Check:**
1. Did you add the **public key** (id_rsa.pub), not private key (id_rsa)?
2. Did you select the key when creating Droplet?
3. Try the explicit key path: `ssh -i ~/.ssh/id_rsa root@YOUR_IP`

## 📝 Quick Reference

**View your public key:**
```bash
cat ~/.ssh/id_rsa.pub
```

**Copy public key to clipboard:**
```bash
cat ~/.ssh/id_rsa.pub | pbcopy
```

**Connect to Droplet:**
```bash
ssh root@YOUR_DROPLET_IP
```

**Connect with specific key:**
```bash
ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP
```

## 🎯 Summary

1. ✅ Generate key: `ssh-keygen -t rsa -b 4096 -C "email@example.com"`
2. ✅ Copy key: `cat ~/.ssh/id_rsa.pub | pbcopy`
3. ✅ Add to DigitalOcean (during Droplet creation or in Settings)
4. ✅ Connect: `ssh root@YOUR_IP`

**That's it!** You'll never need to enter a password again (unless you set a passphrase on the key itself).
