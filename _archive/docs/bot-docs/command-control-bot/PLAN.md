# Discord Command Control Bot - Planning Document

## Requirements Summary

### Core Features
1. **Control Panel**: Slash command `/control-panel` to display embed with buttons (better than auto-join)
2. **Button Actions**: Each button runs a shell command (e.g., `cd ~/path && rojo serve`)
3. **Real-time Status**: Update same message every 1s while process is running
4. **Multiple Processes**: Allow multiple processes to run simultaneously
5. **Process Management**: Admin-only stop button to kill running processes
6. **Completion Handling**: Final status embed with delete button when process finishes
7. **Error Logging**: Comprehensive logging system for diagnostics
8. **Configuration**: JSON/config file for easy command management
9. **Admin Only**: Only bot owner/admin can use buttons

### Verified Paths
- **Ulquiorra Recreation**: `~/Documents/DEVELOPMENT/gaming/roblox-dev/ulquiorra-lanza-recreation`
- **Rojo Command**: `rojo serve` (not `rojo sync` - verified project.json exists)

## Architecture Decisions

### 1. Slash Command vs Auto-Join
**Decision: Slash Command `/control-panel`**
- ✅ More control (user-initiated)
- ✅ Can be called anytime
- ✅ Better UX (explicit action)
- ✅ Easier to debug
- ❌ Auto-join: Could spam on every server join

### 2. Process Management
- Use Node.js `child_process.spawn()` for long-running processes
- Track processes in Map: `processId -> { process, message, command, startTime }`
- Store process output in buffers for real-time updates

### 3. Status Updates
- Edit same message every 1s while running
- Use `setInterval` to update embed
- Show: status, elapsed time, last output lines

### 4. Configuration
- `config/commands.json` - Button definitions
- `.env` - Bot token, admin IDs
- Each command: `{ id, label, command, directory, description }`

### 5. Error Handling
- Log all errors to `logs/errors.log`
- Capture stderr and stdout
- Show error details in final embed

## Project Structure

```
command-control-bot/
├── index.js                 # Main bot file
├── package.json
├── deploy-commands.js       # Deploy slash commands
├── .env.example
├── config/
│   └── commands.json        # Button/command definitions
├── commands/
│   └── control-panel.js     # /control-panel slash command
├── events/
│   ├── ready.js
│   └── interactionCreate.js # Handle button clicks
├── services/
│   ├── processManager.js    # Process execution & tracking
│   ├── statusUpdater.js     # Real-time status updates
│   └── logger.js           # Error logging
└── logs/
    └── errors.log           # Error logs
```

## Implementation Plan

### Phase 1: Core Setup
1. Initialize Node.js project with discord.js
2. Create basic bot structure (index.js, events, commands)
3. Set up environment variables (.env)
4. Create command configuration (commands.json)

### Phase 2: Control Panel
1. Create `/control-panel` slash command
2. Build embed with buttons from config
3. Deploy commands

### Phase 3: Process Management
1. Implement processManager.js
   - Execute shell commands
   - Track running processes
   - Capture stdout/stderr
2. Handle button interactions
   - Start process on button click
   - Store process reference

### Phase 4: Real-time Updates
1. Implement statusUpdater.js
   - Update message every 1s
   - Show process status, elapsed time, output
2. Handle process completion
   - Detect when process ends
   - Show final status embed with delete button

### Phase 5: Process Control
1. Add stop button to running processes
2. Implement process termination
3. Admin-only access checks

### Phase 6: Logging & Error Handling
1. Implement logger.js
2. Log all errors to file
3. Show errors in final embed

### Phase 7: Testing & Refinement
1. Test with Ulquiorra rojo serve
2. Test multiple processes
3. Test error scenarios
4. Refine UI/UX

## Configuration Example

### commands.json
```json
{
  "commands": [
    {
      "id": "ulquiorra-rojo",
      "label": "Ulquiorra Recreation",
      "command": "rojo serve",
      "directory": "~/Documents/DEVELOPMENT/gaming/roblox-dev/ulquiorra-lanza-recreation",
      "description": "Start Rojo sync for Ulquiorra project"
    }
  ]
}
```

### .env
```
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
ADMIN_USER_IDS=your_discord_id
```

## Technical Details

### Process Execution
- Use `child_process.spawn()` for streaming output
- Set `cwd` to command directory
- Capture both stdout and stderr
- Handle process exit codes

### Status Updates
- Use `setInterval` with 1000ms delay
- Update embed with:
  - Status: Running/Completed/Error
  - Elapsed time
  - Last 5-10 lines of output
  - Process ID

### Button Interactions
- Use Discord.js ButtonBuilder
- Custom IDs: `start-{commandId}`, `stop-{processId}`, `delete-{messageId}`
- Check admin permissions before executing

### Error Handling
- Try-catch around all async operations
- Log errors with timestamp, command, error message
- Show user-friendly error messages in Discord

## Next Steps

1. ✅ Create project directory
2. ⏳ Initialize package.json
3. ⏳ Set up basic bot structure
4. ⏳ Create configuration files
5. ⏳ Implement core features
6. ⏳ Test and refine
