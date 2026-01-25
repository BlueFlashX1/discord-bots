# SSH Authentication Troubleshooting Guide

## Current Issue

GitHub Actions is failing with: `ssh: unable to authenticate, attempted methods [none publickey]`

This means the SSH key authentication is failing. Let's fix it step by step.

## Step-by-Step Fix

### Step 1: Verify Local Key Works

Test the connection from your Mac first:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/discord/bots
./scripts/test-ssh-connection.sh YOUR_VPS_IP
```

**If this fails:** The public key isn't on your VPS. Go to Step 2.

**If this passes:** The key works locally, so GitHub Secret is wrong. Go to Step 3.

### Step 2: Add Public Key to VPS

**Your deployment public key is:**

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDDBSmuemku+l/nqXsN38rIB1tKzyQiXgkZNPVENLT9EArXpKnEeiUD+JBAazkR+/NB64w0/mKfO2mIbIXCBq6NpIk69/zDeSb9m1IO++89ao8l8UjupByiy2tHgHg+UIqXsT+W9/KtwJwOzZFwQKreHEH1OpCiFDg88GD22nNWWO6gjsqGBdONhvylqL/jDG1Rj691s2RauM733UKoRkn3+I6NvaR2a7l6GZxis3d70aNDA6WALvCSxhwwIwpFeL7bKwLqfSHijQCXWfhoylT+x0eatX9oFBpAtDEfEGres19UjU0PtQIk1xiS2yRoAN2Jnq3zGqLJrz+1lBUj4/ZokrA3vMt0kZiJZ9j51d31Z0t7TrIfxjZtzL5hmpDeDTCtIvPNkwiFRv2CV5onWUr9hHpZVFJTB/DTEKI11BHYeG4nfBGxUWdNCUSviVxzB1vgS2E188yWBgE/atIRIfbMhIMbshzTsfew0u09w/oSApDrjNLbJxXPturPwtljJvzu5vFcW1GX016RUk6EBBgsp+9ukUwrb93w5z7WfoU1HhNG1LqpMJxx6QQ9tzQolsXppA2h0cW6NuUcUMID3GithbYxjxqRP9sWKMTnshk0+NztOMC6/7C4d9YYj1hBdtFUxhreBZk1ONEzx9IjxdcSe1+seiR3wV5OsHLWTIBjZw== github-actions-deploy
```

**On your VPS, run:**

```bash
# Check if key already exists
grep "github-actions-deploy" ~/.ssh/authorized_keys

# If not found, add it:
echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDDBSmuemku+l/nqXsN38rIB1tKzyQiXgkZNPVENLT9EArXpKnEeiUD+JBAazkR+/NB64w0/mKfO2mIbIXCBq6NpIk69/zDeSb9m1IO++89ao8l8UjupByiy2tHgHg+UIqXsT+W9/KtwJwOzZFwQKreHEH1OpCiFDg88GD22nNWWO6gjsqGBdONhvylqL/jDG1Rj691s2RauM733UKoRkn3+I6NvaR2a7l6GZxis3d70aNDA6WALvCSxhwwIwpFeL7bKwLqfSHijQCXWfhoylT+x0eatX9oFBpAtDEfEGres19UjU0PtQIk1xiS2yRoAN2Jnq3zGqLJrz+1lBUj4/ZokrA3vMt0kZiJZ9j51d31Z0t7TrIfxjZtzL5hmpDeDTCtIvPNkwiFRv2CV5onWUr9hHpZVFJTB/DTEKI11BHYeG4nfBGxUWdNCUSviVxzB1vgS2E188yWBgE/atIRIfbMhIMbshzTsfew0u09w/oSApDrjNLbJxXPturPwtljJvzu5vFcW1GX016RUk6EBBgsp+9ukUwrb93w5z7WfoU1HhNG1LqpMJxx6QQ9tzQolsXppA2h0cW6NuUcUMID3GithbYxjxqRP9sWKMTnshk0+NztOMC6/7C4d9YYj1hBdtFUxhreBZk1ONEzx9IjxdcSe1+seiR3wV5OsHLWTIBjZw== github-actions-deploy' >> ~/.ssh/authorized_keys

# Fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Verify it was added
grep "github-actions-deploy" ~/.ssh/authorized_keys
```

### Step 3: Fix GitHub Secret (CRITICAL)

The GitHub Secret must be **EXACTLY** the private key with **NO** modifications:

1. **Copy the key to clipboard:**

   ```bash
   ./scripts/copy-deploy-key.sh
   ```

2. **Go to GitHub Secrets:**
   - <https://github.com/BlueFlashX1/discord-bots/settings/secrets/actions>
   - Find `VPS_SSH_KEY`
   - Click "Update"

3. **CRITICAL - Delete everything first:**
   - Select all (Cmd+A)
   - Delete
   - Make sure the field is completely empty

4. **Paste the key:**
   - Paste from clipboard (Cmd+V)
   - **DO NOT** add any spaces
   - **DO NOT** modify anything
   - **DO NOT** add newlines at the start/end

5. **Verify format:**
   - Should start with: `-----BEGIN OPENSSH PRIVATE KEY-----`
   - Should end with: `-----END OPENSSH PRIVATE KEY-----`
   - Should be many lines (not just one line)
   - Should have NO passphrase

6. **Save:**
   - Click "Update secret"

### Step 4: Verify Key Pair Match

The private key in GitHub Secrets must match the public key on your VPS.

**Check fingerprint:**

```bash
# Local private key fingerprint
ssh-keygen -lf ~/.ssh/id_rsa_deploy.pub

# On VPS, check the public key fingerprint
ssh root@YOUR_IP "grep 'github-actions-deploy' ~/.ssh/authorized_keys | ssh-keygen -lf -"
```

These should match!

### Step 5: Test Again

After fixing both:

1. **Test locally:**

   ```bash
   ./scripts/test-ssh-connection.sh YOUR_VPS_IP
   ```

2. **Test deployment:**

   ```bash
   echo "# Test $(date)" >> README.md
   git add README.md
   git commit -m "Test deployment after SSH fix"
   git push
   ```

3. **Check GitHub Actions:**
   - <https://github.com/BlueFlashX1/discord-bots/actions>

## Common Issues

### Issue: "unable to authenticate"

- **Cause:** Public key not on VPS OR wrong private key in GitHub Secrets
- **Fix:** Follow Steps 2 and 3 above

### Issue: "Permission denied (publickey)"

- **Cause:** Public key on VPS but wrong permissions
- **Fix:** Run `chmod 600 ~/.ssh/authorized_keys` on VPS

### Issue: Local test works but GitHub Actions fails

- **Cause:** GitHub Secret has wrong key or formatting issues
- **Fix:** Delete and re-paste the private key in GitHub Secrets (Step 3)

### Issue: Key has passphrase

- **Cause:** Using wrong key (the deployment key should have NO passphrase)
- **Fix:** Use the key from `~/.ssh/id_rsa_deploy` (created by `create-deploy-key.sh`)

## Quick Diagnostic Script

Run this to diagnose everything:

```bash
./scripts/diagnose-ssh-issue.sh
```

This will:

- Check if key exists
- Show key fingerprint
- Test SSH connection
- Show what to check on VPS
- Verify GitHub Secret format

## Still Not Working?

If all steps above are correct but it still fails:

1. **Check GitHub Actions logs** for the exact error
2. **Verify all secrets exist:**
   - `VPS_HOST` (your Droplet IP)
   - `VPS_USERNAME` (should be `root`)
   - `VPS_SSH_KEY` (the private key)
   - `VPS_PORT` (optional, defaults to 22)

3. **Try creating a fresh key pair:**

   ```bash
   # Backup old key
   mv ~/.ssh/id_rsa_deploy ~/.ssh/id_rsa_deploy.backup
   mv ~/.ssh/id_rsa_deploy.pub ~/.ssh/id_rsa_deploy.pub.backup
   
   # Create new key
   ./scripts/create-deploy-key.sh
   
   # Add new public key to VPS
   # Update GitHub Secret with new private key
   ```
