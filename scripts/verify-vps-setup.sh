#!/bin/bash
# Verify VPS setup - run this on your VPS via SSH

echo "🔍 VPS SSH Setup Verification"
echo "============================"
echo ""

# Check authorized_keys
echo "1. Checking authorized_keys file..."
if [ -f ~/.ssh/authorized_keys ]; then
    echo "   ✅ ~/.ssh/authorized_keys exists"

    # Check for deployment key
    if grep -q "github-actions-deploy" ~/.ssh/authorized_keys; then
        echo "   ✅ Deployment key found in authorized_keys"
        echo ""
        echo "   Deployment key entry:"
        grep "github-actions-deploy" ~/.ssh/authorized_keys | head -1
    else
        echo "   ❌ Deployment key NOT found!"
        echo "   Run: echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDDBSmuemku+l/nqXsN38rIB1tKzyQiXgkZNPVENLT9EArXpKnEeiUD+JBAazkR+/NB64w0/mKfO2mIbIXCBq6NpIk69/zDeSb9m1IO++89ao8l8UjupByiy2tHgHg+UIqXsT+W9/KtwJwOzZFwQKreHEH1OpCiFDg88GD22nNWWO6gjsqGBdONhvylqL/jDG1Rj691s2RauM733UKoRkn3+I6NvaR2a7l6GZxis3d70aNDA6WALvCSxhwwIwpFeL7bKwLqfSHijQCXWfhoylT+x0eatX9oFBpAtDEfEGres19UjU0PtQIk1xiS2yRoAN2Jnq3zGqLJrz+1lBUj4/ZokrA3vMt0kZiJZ9j51d31Z0t7TrIfxjZtzL5hmpDeDTCtIvPNkwiFRv2CV5onWUr9hHpZVFJTB/DTEKI11BHYeG4nfBGxUWdNCUSviVxzB1vgS2E188yWBgE/atIRIfbMhIMbshzTsfew0u09w/oSApDrjNLbJxXPturPwtljJvzu5vFcW1GX016RUk6EBBgsp+9ukUwrb93w5z7WfoU1HhNG1LqpMJxx6QQ9tzQolsXppA2h0cW6NuUcUMID3GithbYxjxqRP9sWKMTnshk0+NztOMC6/7C4d9YYj1hBdtFUxhreBZk1ONEzx9IjxdcSe1+seiR3wV5OsHLWTIBjZw== github-actions-deploy' >> ~/.ssh/authorized_keys"
    fi
else
    echo "   ❌ ~/.ssh/authorized_keys does not exist!"
    echo "   Creating it..."
    mkdir -p ~/.ssh
    touch ~/.ssh/authorized_keys
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/authorized_keys
fi
echo ""

# Check permissions
echo "2. Checking permissions..."
SSH_DIR_PERM=$(stat -c "%a" ~/.ssh 2>/dev/null || stat -f "%OLp" ~/.ssh 2>/dev/null)
AUTH_KEY_PERM=$(stat -c "%a" ~/.ssh/authorized_keys 2>/dev/null || stat -f "%OLp" ~/.ssh/authorized_keys 2>/dev/null)

if [ "$SSH_DIR_PERM" = "700" ] || [ "$SSH_DIR_PERM" = "0700" ]; then
    echo "   ✅ ~/.ssh permissions: $SSH_DIR_PERM (correct)"
else
    echo "   ⚠️  ~/.ssh permissions: $SSH_DIR_PERM (should be 700)"
    echo "   Fix: chmod 700 ~/.ssh"
fi

if [ "$AUTH_KEY_PERM" = "600" ] || [ "$AUTH_KEY_PERM" = "0600" ]; then
    echo "   ✅ ~/.ssh/authorized_keys permissions: $AUTH_KEY_PERM (correct)"
else
    echo "   ⚠️  ~/.ssh/authorized_keys permissions: $AUTH_KEY_PERM (should be 600)"
    echo "   Fix: chmod 600 ~/.ssh/authorized_keys"
fi
echo ""

# Check SSH service
echo "3. Checking SSH service..."
if systemctl is-active --quiet ssh || systemctl is-active --quiet sshd; then
    echo "   ✅ SSH service is running"
else
    echo "   ⚠️  SSH service status unclear"
fi
echo ""

# Check if repo exists
echo "4. Checking repository..."
if [ -d "/root/discord-bots" ]; then
    echo "   ✅ Repository directory exists: /root/discord-bots"
    if [ -d "/root/discord-bots/.git" ]; then
        echo "   ✅ Git repository initialized"
    else
        echo "   ⚠️  Git not initialized in /root/discord-bots"
    fi
else
    echo "   ⚠️  Repository directory not found: /root/discord-bots"
fi
echo ""

# Summary
echo "📊 Summary:"
echo "==========="
echo ""
echo "If all checks passed ✅, your VPS is ready!"
echo ""
echo "Next steps:"
echo "1. Verify GitHub Secret VPS_SSH_KEY is updated"
echo "2. Test deployment with: git push"
echo "3. Check GitHub Actions: https://github.com/BlueFlashX1/discord-bots/actions"
echo ""
