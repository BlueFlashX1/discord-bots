# MoltBot Automations

Mac control and automation scripts run via MoltBot from Discord.

## File Structure

```
automations/
├── config/
│   └── channels.json
├── data/                     # Input data for scripts
├── output/                   # Script output
└── scripts/
    └── mac_control.js        # Mac control (lock, sleep, apps, night mode, clean mac)
```

## Discord Bot Integration

DM the bot commands like:
- "Lock my mac", "Good night", "Clean mac"
- "Open Vivaldi", "List laggy processes"

## Privacy & Security

- All data stays in your local filesystem
- **Script allowlist:** only scripts listed in \`config/security.js\` → \`automations.allowedScripts\` can be run (e.g. \`mac_control.js\`).
- **Command blocklist:** \`config/security.js\` → \`commands.blocked\` blocks raw commands containing \`sudo\`, \`open\`, \`osascript\`, etc. Allowlisted automation scripts are exempt so \`mac_control.js\` can run its fixed actions.
- Sensitive patterns are blocked
- Use `.gitignore` to prevent committing private data
- MoltBot cannot access any directories outside this folder
- All executions are logged to ../logs/audit.log

### Mac control (approval required)

\`mac_control.js\` runs **only on macOS** and **always requires you to reply "yes"** in Discord before it runs. It executes a fixed allowlist of actions (no arbitrary commands). If the requested app or action is unclear, MoltBot will ask a short clarifying question instead of guessing.

| Action | Trigger examples |
|--------|------------------|
| Lock screen | "Lock my mac", "Lock screen" |
| Sleep display | "Sleep display", "Turn off screen" |
| Mute / unmute | "Mute", "Unmute" |
| Open app | "Open Spotify", "Open Cursor", "Open Vivaldi", "Open Obsidian", "open my browser", "open my notes" |
| Quit app | "Quit Vivaldi", "Close Obsidian", "quit Spotify", "quit Cursor" |
| List laggy | "List laggy processes", "What's using CPU", "Top processes" |
| Kill process | "Kill process 12345", "Kill PID 12345" (use PID from list_laggy output) |
| **Night mode** | "Good night", "Night mode", "Sleep mode" — notification, Sleep focus, screen saver, display sleep |
| **Clean Mac** | "Clean mac", "Run clean mac" — Shift+Cmd+O triggers Key Maestro → CleanMyMac automation |

Open/quit apps use \`open_app\` / \`quit_app --app <key>\`: **Vivaldi**, **Obsidian**, **Spotify**, **Cursor**. To add more: edit \`scripts/mac_control.js\` → \`ALLOWED_APPS\`. \`list_laggy\` shows top 20 by CPU; \`kill_pid --pid N\` sends TERM (PIDs 10–999999 only). **Night mode** requires a Shortcut named "Sleep" for Focus (or edit the action). **Clean Mac** requires Key Maestro with Shift+Cmd+O bound to your CleanMyMac automation.

### Mac control from VPS (run on your Mac via SSH)

When MoltBot runs on the **VPS** (Linux), \`mac_control.js\` cannot run locally (it is macOS-only). To have the VPS trigger Mac control on your **Mac**:

1. **On the Mac**
   - Enable **Remote Login**: System Settings → General → Sharing → Remote Login (on).
   - Ensure the MoltBot repo is present (e.g. \`~/Documents/DEVELOPMENT/discord/bots/moltbot\`).
   - Make the wrapper executable: \`chmod +x automations/scripts/mac_control_remote_wrapper.sh\`.
   - Restrict the VPS SSH key to only run this wrapper. In \`~/.ssh/authorized_keys\`, add a line like:
     \`command="/Users/YOUR_USER/Documents/DEVELOPMENT/discord/bots/moltbot/automations/scripts/mac_control_remote_wrapper.sh" ssh-ed25519 AAAA...\`
     (Use the full path to \`mac_control_remote_wrapper.sh\` and paste the VPS public key.)

2. **Reachability**
   - The VPS must be able to SSH to the Mac. Options: same network, VPN, or Tailscale (e.g. \`mac-tailscale-name\`) so the VPS can \`ssh user@mac-host\`.

3. **On the VPS** (in MoltBot \`.env\`)
   - \`MAC_CONTROL_SSH=user@mac-host\` — e.g. \`matthew@mac.local\` or \`matthew@100.x.x.x\` (Tailscale).
   - \`MAC_CONTROL_WRAPPER=/Users/matthewthompson/Documents/DEVELOPMENT/discord/bots/moltbot/automations/scripts/mac_control_remote_wrapper.sh\` — the **path on the Mac** (used as the remote command).
   - \`MAC_CONTROL_SSH_KEY=/root/.ssh/mac_control_key\` — (optional) path to the private key on the VPS used to log in to the Mac. If unset, default SSH keys are used.

After that, when you ask the bot on Discord (VPS) to e.g. "open Vivaldi", "good night", or "clean mac", it will run the command on your Mac via SSH. The wrapper only allows allowlisted actions (no arbitrary shell commands).

To add one: create the script under \`scripts/\`, add its filename to \`allowedScripts\` in \`config/security.js\`, and add an intent line in \`src/ai/prompts.js\` (Intent → Command table) so the bot maps natural language to the script.