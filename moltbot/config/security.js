import { homedir } from 'os';
import { resolve } from 'path';

const home = homedir();

// Base paths - Environment aware
const MOLTBOT_DIR = process.env.MOLTBOT_DIR || (() => {
  if (process.platform === 'darwin') {
    return '/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/moltbot';
  } else {
    return '/root/discord-bots/moltbot';
  }
})();
const AUTOMATIONS_DIR = process.env.AUTOMATIONS_DIR || `${MOLTBOT_DIR}/automations`;

export default {
  sandbox: {
    enabled: true,
    mode: 'strict',
    // AI can ONLY work within the automations folder
    root: AUTOMATIONS_DIR,
    automationsDir: AUTOMATIONS_DIR,
    allowedPaths: [
      `${AUTOMATIONS_DIR}`,           // Main automations folder
      `${AUTOMATIONS_DIR}/scripts`,   // Automation scripts
      `${AUTOMATIONS_DIR}/data`,      // Input data
      `${AUTOMATIONS_DIR}/output`     // Output files
    ],
    // Deny EVERYTHING outside automations - including the bot code itself
    deniedPaths: [
      `${MOLTBOT_DIR}/src`,           // Bot source code (read-only)
      `${MOLTBOT_DIR}/config`,        // Config files
      `${MOLTBOT_DIR}/node_modules`,  // Dependencies
      `${MOLTBOT_DIR}/.env`,          // Secrets!
      resolve(home, '.ssh'),
      resolve(home, '.gnupg'),
      resolve(home, '.aws'),
      resolve(home, '.config'),
      resolve(home, '.zshrc'),
      resolve(home, '.bashrc'),
      resolve(home, '.env'),
      // On VPS, deny access to other bots (macOS path doesn't exist anyway)
      ...(process.platform === 'linux' ? [] : ['/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots']),
      '/etc',
      '/System',
      '/Library',
      '/private'
    ]
  },
  commands: {
    // Read-only/search commands - can run within sandbox (but filtered by sensitivePatterns)
    safeBins: [
      'ls', 'cat', 'head', 'tail', 'grep', 'rg', 'find', 'fd', 'pwd', 'echo',
      'wc', 'date', 'tree', 'file', 'stat', 'diff', 'sort', 'uniq', 'less',
      'which', 'type'
      // NOTE: 'env' and 'printenv' removed - could expose secrets
    ],
    // Commands that modify files - require confirmation
    requireConfirmation: [
      'rm', 'mv', 'cp', 'chmod', 'chown', 'mkdir', 'touch', 'sed', 'awk',
      'git push', 'git commit', 'npm publish', 'npm install'
    ],
    // Never allow these (raw/ad-hoc commands). Allowlisted automations (e.g. mac_control.js) are exempt and run their own fixed actions.
    blocked: [
      'sudo', 'su', 'doas', 'pkexec',
      'curl | bash', 'curl | sh', 'wget | bash', 'wget | sh',
      'eval', 'exec', 'source',
      'ssh', 'scp', 'rsync',
      'kill', 'killall', 'pkill',
      'open', 'osascript', 'defaults',
      'env', 'printenv', 'export'  // Could expose secrets
    ]
  },
  // SENSITIVE FILE PATTERNS - Block reading these even with grep/cat
  // Protects secrets from accidental exposure in AI responses
  sensitivePatterns: {
    // File patterns that should NEVER be read
    blockedFiles: [
      '.env',
      '.env.*',
      '*.env',
      '.envrc',
      'credentials',
      'credentials.*',
      '*.pem',
      '*.key',
      '*.p12',
      '*.pfx',
      'id_rsa',
      'id_ed25519',
      'id_dsa',
      'known_hosts',
      'authorized_keys',
      '.netrc',
      '.npmrc',
      '.pypirc'
    ],
    // Directory patterns that should NEVER be searched
    blockedDirs: [
      '.ssh',
      '.gnupg',
      '.aws',
      '.config',
      '.password-store',
      'node_modules',
      '.git/objects'
    ],
    // Content patterns - block if filename contains these
    blockedNamePatterns: [
      'password',
      'secret',
      'token',
      'credential',
      'apikey',
      'api_key',
      'private'
    ]
  },
  // AUTOMATION ALLOWLIST - Only these scripts can be executed!
  // Add your approved automation scripts here
  automations: {
    enabled: true,
    // Only scripts in this list can be run
    allowedScripts: [
      // Example entries - add your own:
      'test.sh',
      // Personal Intelligence & Memory System scripts:
      'ingest_discord.js',
      'generate_digest.js',
      'generate_journal.js',
      'query_memory.js',
      // Mac-only: open/quit apps, lock/sleep/mute, list_laggy, kill_pid (allowlisted actions only; always requires confirmation)
      'mac_control.js',
      // VPS PM2 Management: list, restart, deploy bots via SSH (always requires confirmation)
      'pm2_control.js',
      // 'backup.sh',
      // 'deploy.sh',
      // 'daily-report.js',
      // 'cleanup.py'
    ],
    // Directory where automations live
    scriptsDir: `${AUTOMATIONS_DIR}/scripts`,
    // Require explicit confirmation before running ANY automation
    requireConfirmation: false,
    // These scripts ALWAYS require user "yes" before running (e.g. Mac control)
    alwaysConfirmScripts: ['mac_control.js', 'pm2_control.js']
  },
  auth: {
    allowedUserIds: (process.env.ALLOWED_USER_IDS || '').split(',').filter(Boolean),
    dmPolicy: 'whitelist'
  }
};