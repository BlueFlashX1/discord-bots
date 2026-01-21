# 🎮 Hangman Bot - Quick Start Guide

## Installation (5 minutes)

### Step 1: Get Your Bot Token

```
1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "Hangman Bot"
3. Go to "Bot" → Click "Add Bot"
4. Copy the TOKEN (keep it secret!)
```

### Step 2: Setup Bot in Discord Server

```
1. In your app, go to OAuth2 → URL Generator
2. Check "bot" under Scopes
3. Check these Permissions:
   - Send Messages
   - Read Messages/View Channels
   - Embed Links
4. Copy the URL and open it to add bot to your server
```

### Step 3: Configure the Bot

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot

# Copy and edit .env
cp .env.example .env

# Add your Discord token ONLY:
# BOT_TOKEN_HANGMAN=your_discord_token_here

# The bot automatically uses Grammar Bot's OpenAI key!
# This saves API quota and prevents duplicate billing.
```

### Step 4: Run the Bot

```bash
# Manual start
bash RUN_BOT.sh

# Auto-start on login (optional)
cp com.hangmanbot.launcher.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.hangmanbot.launcher.plist
```

## Playing the Game

### Start a Game

```
User 1: /hangman start butterfly

Bot shows:
- Word definition & hints
- Display: _ _ _ _ _ _ _
- ASCII hangman art
```

### Join the Game

```
User 2: /hangman join
User 3: /hangman join
```

### Guess Letters

```
User 1: /hangman guess e
User 2: /hangman guess a
User 3: /hangman guess r
... (turns rotate)
```

### Game Display

```
After each guess, you see:
📝 Word: _ _ _ _ _ _ _
📋 Guessed Letters: E A R O
🎯 Next Turn: <@User2>
Mistakes: 2/6
```

### Win or Lose

- **Win:** Guess all letters → Everyone on the team wins!
- **Lose:** 6 wrong guesses → Word is revealed, game ends

## Commands Reference

| Command      | Usage                     | Example                   |
| ------------ | ------------------------- | ------------------------- |
| Start        | `/hangman start <word>`   | `/hangman start elephant` |
| Join         | `/hangman join`           | `/hangman join`           |
| Guess        | `/hangman guess <letter>` | `/hangman guess e`        |
| Leave        | `/hangman leave`          | `/hangman leave`          |
| Active Games | `/games`                  | `/games`                  |

## Tips & Tricks

🎯 **Best Starting Words:**

- Words with common letters: E, A, R, O, I, U, T, N, S
- Words with good story (AI gives hints!)
- Example: "mysterious", "adventure", "technology"

🤖 **AI Hints Include:**

- Definition of the word
- Part of speech (Noun, Verb, Adjective, etc.)
- Context clues
- Example usage

⏰ **Game Rules:**

- Players take turns
- Only one letter per turn
- Case doesn't matter (a = A)
- Maximum 6 wrong guesses
- Game is permanent until won or lost

## Troubleshooting

**Bot says "No token found"**
→ Check your `.env` file has `BOT_TOKEN_HANGMAN` set

**AI hints not showing**
→ Grammar Bot's `OPENAI_API_KEY` not set
→ Set it in Grammar Bot's `.env` file
→ Or add it here: Grammar Bot's key will be automatically used

**Commands not showing in Discord**
→ Bot needs "applications.commands" permission
→ Invite URL: Use OAuth2 URL Generator with "bot" scope

**Bot offline after restart**
→ Check logs: `tail -f ~/Library/Logs/hangmanbot.log`
→ Restart: `bash RUN_BOT.sh`

## File Locations

- **Bot:** `/Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot/src/core/__main__.py`
- **Game Logic:** `src/gamification/game.py`
- **AI Hints:** `src/ai/word_hints.py`
- **Config:** `.env` (create from `.env.example`)
- **Logs:** `~/Library/Logs/hangmanbot.log`
- **Auto-start:** `~/Library/LaunchAgents/com.hangmanbot.launcher.plist`

## Support

For issues:

1. Check logs: `tail ~/Library/Logs/hangmanbot.error.log`
2. Verify `.env` has both tokens
3. Ensure Discord token is valid (haven't rotated it)
4. Check OpenAI API quota and billing

Enjoy! 🎉
