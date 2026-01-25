#!/bin/bash
# Comprehensive SSH diagnosis script

set -e

KEY_PATH="$HOME/.ssh/id_rsa_deploy"

echo "🔍 SSH Authentication Diagnosis"
echo "=============================="
echo ""

# Step 1: Verify key exists
echo "1. Checking deployment key..."
if [ ! -f "$KEY_PATH" ]; then
    echo "   ❌ Deployment key NOT found: $KEY_PATH"
    echo "   Run: ./scripts/create-deploy-key.sh"
    exit 1
fi
echo "   ✅ Deployment key found: $KEY_PATH"
echo ""

# Step 2: Show key fingerprint
echo "2. Key fingerprint (for verification):"
ssh-keygen -lf "${KEY_PATH}.pub" 2>/dev/null || echo "   ⚠️  Could not read fingerprint"
echo ""

# Step 3: Show public key
echo "3. Public key (should match what's on VPS):"
echo "==========================================="
cat "${KEY_PATH}.pub"
echo ""

# Step 4: Test connection
echo "4. Testing SSH connection..."
echo "   Enter your VPS IP address:"
read -r VPS_IP

if [ -z "$VPS_IP" ]; then
    echo "   ❌ No IP provided"
    exit 1
fi

echo ""
echo "   Testing connection to $VPS_IP..."
echo ""

if ssh -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    -v \
    "root@$VPS_IP" \
    "echo 'Connection successful!' && whoami" 2>&1 | tee /tmp/ssh-test.log; then
    echo ""
    echo "   ✅ SSH connection test PASSED!"
    echo ""
    echo "   If local test passes but GitHub Actions fails:"
    echo "   → GitHub Secret VPS_SSH_KEY might be wrong"
    echo "   → Check for extra spaces/newlines in the secret"
    echo ""
else
    echo ""
    echo "   ❌ SSH connection test FAILED!"
    echo ""
    echo "   Checking error details..."
    if grep -q "Permission denied" /tmp/ssh-test.log; then
        echo "   → Permission denied: Public key not on VPS or wrong key"
        echo ""
        echo "   Fix: Add public key to VPS:"
        echo "   ssh root@$VPS_IP"
        echo "   echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
        echo "   chmod 600 ~/.ssh/authorized_keys"
    elif grep -q "Connection refused" /tmp/ssh-test.log; then
        echo "   → Connection refused: SSH service not running or firewall blocking"
    elif grep -q "Host key verification failed" /tmp/ssh-test.log; then
        echo "   → Host key issue (should be handled by StrictHostKeyChecking=no)"
    else
        echo "   → Unknown error - check /tmp/ssh-test.log for details"
    fi
    echo ""
fi

# Step 5: Verify GitHub Secret format
echo "5. GitHub Secret Verification:"
echo "=============================="
echo ""
echo "   The private key should:"
echo "   - Start with: -----BEGIN OPENSSH PRIVATE KEY-----"
echo "   - End with: -----END OPENSSH PRIVATE KEY-----"
echo "   - Have NO passphrase (this key was created without one)"
echo "   - Match EXACTLY what's in ~/.ssh/id_rsa_deploy"
echo ""
echo "   To copy key again: ./scripts/copy-deploy-key.sh"
echo ""

# Step 6: Show what to check on VPS
echo "6. VPS Verification Commands:"
echo "============================"
echo ""
echo "   SSH to VPS and run:"
echo "   grep 'github-actions-deploy' ~/.ssh/authorized_keys"
echo ""
echo "   Should show the public key above."
echo "   If not, add it:"
echo "   echo '$(cat ${KEY_PATH}.pub)' >> ~/.ssh/authorized_keys"
echo ""
