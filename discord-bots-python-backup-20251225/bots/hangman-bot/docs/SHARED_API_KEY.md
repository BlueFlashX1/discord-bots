# 🎮 Hangman Bot - Shared OpenAI API Configuration

## ✅ Updated to Use Grammar Bot's OpenAI Key

The Hangman Bot has been configured to **automatically reuse** the OpenAI API key from your **Grammar Teacher Bot**. This means:

### 💰 Benefits

✅ **No Duplicate Billing** - Both bots share the same API quota  
✅ **Lower Costs** - Single OpenAI subscription serves both bots  
✅ **Simpler Setup** - Only need one Discord token for Hangman Bot  
✅ **Shared Budget** - Monitor total API usage across both bots

### 🔧 How It Works

The Hangman Bot looks for the `OPENAI_API_KEY` in this order:

1. **Grammar Bot's shared key** (from parent directory `.env`)
2. **Hangman Bot's own `.env`** (if you provide one)
3. **Graceful fallback** - If no key found, hints still work with basic fallback

### 📝 Setup Instructions

**Step 1:** Copy your Discord token to Hangman Bot's `.env`:

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
cp .env.example .env

# Edit .env - only add this line:
BOT_TOKEN_HANGMAN=your_discord_bot_token

# Leave OPENAI_API_KEY empty (it will use Grammar Bot's)
```

**Step 2:** That's it! The bot will automatically find the Grammar Bot's key.

### 🎯 What This Means

- ✅ Hangman bot launches with `/hangman` commands
- ✅ AI hints work automatically using Grammar Bot's OpenAI key
- ✅ No additional configuration needed
- ✅ Saves you money on API costs

### 📊 API Usage

Both bots use the same key, so:

- **Grammar Bot**: Checks grammar (higher usage)
- **Hangman Bot**: Generates hints (occasional usage)
- **Total**: Monitored via one OpenAI account

### ⚙️ Configuration Files Updated

| File                   | Change                               |
| ---------------------- | ------------------------------------ |
| `src/ai/word_hints.py` | Added comment explaining key sharing |
| `.env.example`         | Made OPENAI_API_KEY optional         |
| `README.md`            | Updated setup instructions           |
| `docs/QUICKSTART.md`   | Simplified to Discord token only     |

### 🚀 Quick Start

```bash
# Create .env with only Discord token
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot
cp .env.example .env
# Edit .env and add: BOT_TOKEN_HANGMAN=your_token

# Run!
bash RUN_BOT.sh
```

### 💡 Pro Tips

**Monitor API usage:**

```bash
# Check Grammar Bot's usage
tail ~/Library/Logs/grammarbot.log | grep -i "budget\|api"

# Check Hangman Bot's usage
tail ~/Library/Logs/hangmanbot.log | grep -i "hint"
```

**Disable AI hints if needed:**

- Set `OPENAI_API_KEY=""` in Grammar Bot's `.env`
- Both bots will show graceful fallback hints

**Use dedicated API key:**

- If you want Hangman Bot to use its own key, add to Hangman's `.env`:
  ```
  OPENAI_API_KEY=sk-your-separate-key
  ```

### 📞 Status

✅ **Hangman Bot**: Ready with shared OpenAI key  
✅ **Grammar Bot**: Provides shared OpenAI key  
✅ **Setup**: Simplified to single Discord token  
✅ **Costs**: Optimized and consolidated

Enjoy your new Hangman Bot! 🎮✨
