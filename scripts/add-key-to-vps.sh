#!/bin/bash
# Script to add deployment public key to VPS
# Run this ON YOUR VPS (after SSH'ing to it)

set -e

PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDDBSmuemku+l/nqXsN38rIB1tKzyQiXgkZNPVENLT9EArXpKnEeiUD+JBAazkR+/NB64w0/mKfO2mIbIXCBq6NpIk69/zDeSb9m1IO++89ao8l8UjupByiy2tHgHg+UIqXsT+W9/KtwJwOzZFwQKreHEH1OpCiFDg88GD22nNWWO6gjsqGBdONhvylqL/jDG1Rj691s2RauM733UKoRkn3+I6NvaR2a7l6GZxis3d70aNDA6WALvCSxhwwIwpFeL7bKwLqfSHijQCXWfhoylT+x0eatX9oFBpAtDEfEGres19UjU0PtQIk1xiS2yRoAN2Jnq3zGqLJrz+1lBUj4/ZokrA3vMt0kZiJZ9j51d31Z0t7TrIfxjZtzL5hmpDeDTCtIvPNkwiFRv2CV5onWUr9hHpZVFJTB/DTEKI11BHYeG4nfBGxUWdNCUSviVxzB1vgS2E188yWBgE/atIRIfbMhIMbshzTsfew0u09w/oSApDrjNLbJxXPturPwtljJvzu5vFcW1GX016RUk6EBBgsp+9ukUwrb93w5z7WfoU1HhNG1LqpMJxx6QQ9tzQolsXppA2h0cW6NuUcUMID3GithbYxjxqRP9sWKMTnshk0+NztOMC6/7C4d9YYj1hBdtFUxhreBZk1ONEzx9IjxdcSe1+seiR3wV5OsHLWTIBjZw== github-actions-deploy"

echo "🔑 Adding Deployment Key to VPS"
echo "================================"
echo ""

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Check if key already exists
if grep -q "github-actions-deploy" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "⚠️  Deployment key already exists in authorized_keys"
    echo ""
    echo "Current entry:"
    grep "github-actions-deploy" ~/.ssh/authorized_keys
    echo ""
    read -p "Do you want to add it again anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping. Key already exists."
        exit 0
    fi
fi

# Add the key
echo "Adding deployment key to ~/.ssh/authorized_keys..."
echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys

# Fix permissions
chmod 600 ~/.ssh/authorized_keys

echo "✅ Deployment key added successfully!"
echo ""

# Verify
echo "Verification:"
echo "============"
if grep -q "github-actions-deploy" ~/.ssh/authorized_keys; then
    echo "✅ Key found in authorized_keys"
    echo ""
    echo "Key entry:"
    grep "github-actions-deploy" ~/.ssh/authorized_keys
    echo ""
    echo "Permissions:"
    ls -la ~/.ssh/authorized_keys
    echo ""
    echo "✅ Setup complete! You can now test from your Mac:"
    echo "   ./scripts/test-ssh-connection.sh 64.23.179.177"
else
    echo "❌ Key not found - something went wrong"
    exit 1
fi
