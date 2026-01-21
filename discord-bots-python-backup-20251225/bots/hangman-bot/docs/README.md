# 🎮 Hangman Bot

A Discord bot that brings the classic word-guessing game of Hangman to your server!

## Features

✨ **Multiplayer Gameplay**

- One player sets the word, others guess letters
- Turn-based guessing system
- Support for unlimited players per game

🤖 **AI-Powered Hints**

- Automatic word definitions using OpenAI GPT-4o-mini
- Part of speech identification (Noun, Verb, Adjective, etc.)
- Contextual hints for each word
- Example sentences

📝 **Game Rules**

- Players take turns guessing one letter at a time
- Case-insensitive input (A and a are the same)
- 6 wrong guesses = Game Over
- Correct guesses reveal all instances of that letter
- Game ends when the word is guessed or player loses

🎯 **Commands**

### `/hangman start <word>`

Start a new game with a secret word.

**Example:** `/hangman start butterfly`

### `/hangman join`

Join an existing game in the current channel.

### `/hangman guess <letter>`

Guess a single letter. Only works when it's your turn.

**Example:** `/hangman guess e`

### `/hangman leave`

Leave the current game.

### `/games`

See all active Hangman games across the server.

## Setup

### 1. Create Discord Application

1. Go to <https://discord.com/developers/applications>
2. Click "New Application"
3. Go to "Bot" section and click "Add Bot"
4. Copy the token

### 2. Add Bot to Server

1. Go to OAuth2 → URL Generator
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Read Messages/View Channels`, `Embed Links`
4. Copy the generated URL and visit it

### 3. Setup Bot Environment

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot

# Copy .env template
cp .env.example .env

# Edit .env with your Discord token ONLY
# The bot will automatically use the OpenAI key from Grammar Bot
nano .env
```

**Note:** The Hangman Bot automatically reuses the `OPENAI_API_KEY` from your Grammar Bot installation. You only need to set `BOT_TOKEN_HANGMAN` in the `.env` file. This way, both bots share the same API quota and you won't have duplicate billing!

### 4. Run the Bot

**Manual Start:**

```bash
bash RUN_BOT.sh
```

**Auto-start on Login:**

```bash
# Register with macOS
cp com.hangmanbot.launcher.plist ~/Library/LaunchAgents/

# Load the service
launchctl load ~/Library/LaunchAgents/com.hangmanbot.launcher.plist

# View logs
tail -f ~/Library/Logs/hangmanbot.log
```

## How to Play

1. **Player 1** starts a game: `/hangman start secret_word`
2. **Other players** join: `/hangman join`
3. Players take turns guessing letters: `/hangman guess a`
4. The game displays:
   - The hangman ASCII art (gets worse with each mistake)
   - The word with unguessed letters as `_ _ _ _`
   - All previously guessed letters
   - Whose turn it is
5. **Win:** Guess the complete word
6. **Lose:** 6 wrong guesses

## File Structure

```
hangman-bot/
├── src/
│   ├── core/
│   │   └── __main__.py       (Main bot file)
│   ├── ai/
│   │   └── word_hints.py     (AI hint system)
│   └── gamification/
│       └── game.py           (Game logic)
├── data/                      (Game data storage)
├── .env.example              (Configuration template)
├── requirements.txt          (Python dependencies)
├── RUN_BOT.sh               (Launch script)
└── com.hangmanbot.launcher.plist  (macOS auto-start)
```

## Troubleshooting

**Bot not responding?**

- Check if bot is online: `launchctl list | grep hangmanbot`
- View logs: `tail -f ~/Library/Logs/hangmanbot.log`
- Restart: `bash RUN_BOT.sh`

**AI hints not working?**

- Ensure `OPENAI_API_KEY` is set in `.env`
- Check your OpenAI API quota and billing

**Can't add bot to server?**

- Make sure OAuth2 scopes include `bot`
- Verify bot permissions are set

## Tips

- 🎯 Choose words with common letters (E, A, R, O, I, etc.)
- 💡 The AI provides hints about word parts and definitions
- 👥 Multiple players make the game more fun!
- ⏰ Games don't timeout - play at your own pace

## License

Created for fun! Feel free to modify and improve.
