# Hangman Bot - Comprehensive Logging Integration

## Overview

The Hangman Bot now includes a **comprehensive debugging and logging system** that catches ALL errors and logs them persistently for debugging purposes.

## Logging Infrastructure

### Logger Configuration (src/core/logger.py)

- **Console Handler**: Logs INFO+ level to stdout (clean output)
- **File Handler**: Logs DEBUG+ level to `logs/hangman.log` (detailed)
- **Error Handler**: Logs ERROR+ level to `logs/hangman.error.log` (errors only)
- **Auto-creates** logs directory if missing
- **ISO format timestamps** for all log entries
- **UTF-8 encoding** for proper character support

### Log Files Location

- `logs/hangman.log` - All events (DEBUG and above)
- `logs/hangman.error.log` - Errors only (ERROR and above)

## What Gets Logged

### Command Execution

```
log_command("hangman start", user_id, user_name)
log_command("hangman join", user_id, user_name)
log_command("hangman guess", user_id, user_name)
log_command("leave", user_id, user_name)
log_command("games", user_id, user_name)
```

- Every slash command is logged with user details
- Helps track which users are running commands

### Game Lifecycle Events

```
log_game_start(channel_id, word, starter_id)
log_game_action(channel_id, "player_joined", player_id)
log_game_action(channel_id, "guess", player_id, f"letter={letter},correct={is_correct}")
log_game_action(channel_id, "player_left", player_id)
log_game_end(channel_id, "won", word)
log_game_end(channel_id, "lost", word)
log_game_end(channel_id, "abandoned", word)
```

- Tracks all game events from start to finish
- Records player actions and outcomes
- Helpful for debugging game state issues

### API Calls

```
log_api_call("OpenAI hint generation", "success", f"word={word}")
```

- Logs all external API calls
- Tracks API call status
- Useful for debugging API integration issues

### Debug Information

```
log_debug(f"Game start failed: no word provided by {user_id}")
log_debug(f"Join failed: no game in progress in {channel_id}")
log_debug(f"Guess failed: no game in progress in {channel_id}")
log_debug(f"Join failed: {user_id} already in game {channel_id}")
log_debug(f"Invalid action '{action}' from {user_id}")
log_debug(f"No active games when queried by {interaction.user.id}")
```

- All validation failures are logged
- User action state is tracked
- Helps debug user behavior

### Error Tracking

```
log_error_traceback(e, "context_name")
```

- **EVERY error is caught with try-except blocks**
- Full Python traceback is logged
- Context string identifies where error occurred
- Errors logged to both hangman.log and hangman.error.log

### Startup/Shutdown

```
log_startup()  # Bot startup complete
logger.info("🛑 Hangman Bot shutting down...")  # Bot shutdown
```

- Tracks bot lifecycle events
- Logs when bot starts and stops

## Error Handling Coverage

### Command Handlers

- `hangman_command()`: 5 nested try-except blocks
  - Start action
  - Join action
  - Guess action
  - Main command level
- `leave_command()`: Wrapped try-except
- `games_command()`: Wrapped try-except

### What Errors Are Caught

1. **Discord API Errors** - Connection/permission issues
2. **Game Logic Errors** - Invalid game state transitions
3. **OpenAI API Errors** - Hint generation failures
4. **Database Errors** - Game storage issues
5. **Input Validation Errors** - Invalid user input
6. **Unexpected Errors** - Any unforeseen exceptions

## Debugging Guide

### Check Recent Activity

```bash
# View last 50 lines of all logs
tail -50 logs/hangman.log

# View only errors
tail -50 logs/hangman.error.log

# Watch logs in real-time
tail -f logs/hangman.log
```

### Search for Specific Events

```bash
# Find all game starts
grep "Game started" logs/hangman.log

# Find all errors for a specific user
grep "user_id_here" logs/hangman.error.log

# Find all OpenAI API calls
grep "OpenAI hint" logs/hangman.log

# Find all join failures
grep "Join failed" logs/hangman.log
```

### Troubleshooting Workflow

1. **Bot not starting?** → Check `logs/hangman.error.log` for startup errors
2. **Command not working?** → Search logs for the command name
3. **API integration issues?** → Look for `OpenAI hint` entries
4. **User can't join game?** → Search for "Join failed"
5. **Game not ending?** → Search for game lifecycle events

## Log Format Examples

### Info Level (Console)

```
INFO - 2024-01-15 14:23:45.123456 - Bot is ready for gameplay!
```

### Debug Level (File)

```
DEBUG - 2024-01-15 14:23:47.654321 - Command: hangman start | User: 123456789 | @username
DEBUG - 2024-01-15 14:23:48.234567 - Game started: game_id=456 word=******* starter_id=123456789
```

### Error Level (File + Error Log)

```
ERROR - 2024-01-15 14:24:10.345678 - Context: hangman_command start action
ERROR - 2024-01-15 14:24:10.345678 - Traceback: [Full Python traceback here]
ERROR - 2024-01-15 14:24:10.345678 - Error details...
```

## Implementation Details

### Helper Functions in logger.py

1. **`log_startup()`**

   - Logs bot startup with environment info

2. **`log_command(command_name, user_id, user_name)`**

   - Logs every slash command execution
   - Includes user identification

3. **`log_game_start(game_id, word, starter_id)`**

   - Logs when a new game begins
   - Records game creator

4. **`log_game_action(game_id, action, player_id, details="")`**

   - Logs player actions during game
   - Can include additional details

5. **`log_game_end(game_id, outcome, word)`**

   - Logs game conclusion
   - Records outcome (won/lost/abandoned)

6. **`log_api_call(api_name, status, details="")`**

   - Logs external API calls
   - Tracks success/failure status

7. **`log_error_traceback(error, context="")`**

   - Logs full Python traceback
   - Includes context for debugging

8. **`log_debug(message)`**
   - Logs debug-level messages
   - Used for validation failures

## Testing the Logging System

### 1. Start the bot

```bash
python -m src.core
```

### 2. Check logs directory was created

```bash
ls -la logs/
```

### 3. Execute commands in Discord

- `/hangman start python`
- `/hangman join`
- `/hangman guess e`
- `/leave`
- `/games`

### 4. Verify logs were created

```bash
# Check file sizes (should not be empty)
ls -lh logs/

# View content
tail logs/hangman.log
tail logs/hangman.error.log
```

### 5. Trigger an error intentionally

- Try to guess without joining
- Try to join non-existent game
- Send invalid parameters

### 6. Confirm error was logged

```bash
grep -i "failed\|error" logs/hangman.error.log
```

## Key Features

✅ **All Errors Caught** - No silent failures, everything is logged
✅ **Persistent Storage** - Logs survive bot restarts
✅ **Separate Error Log** - Easy error debugging
✅ **Structured Logging** - Consistent format across all messages
✅ **Auto-Directory Creation** - No setup needed
✅ **Context Information** - Every log includes relevant context
✅ **Performance** - Minimal overhead
✅ **User-Friendly** - Clear, readable log messages

## Future Enhancements

- Log rotation (auto-archive old logs)
- Remote logging to monitoring service
- Discord notifications for critical errors
- Performance metrics logging
- User behavior analytics
