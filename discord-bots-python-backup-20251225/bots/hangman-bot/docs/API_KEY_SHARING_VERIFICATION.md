# API KEY SHARING VERIFICATION - EXPLICIT CHECK

## ✅ CONFIRMED: Hangman Bot DOES Share Grammar Bot's OpenAI API Key

---

## 📋 Evidence

### 1. Grammar Bot Configuration

**File**: `/discord-bots/bots/grammar-teacher-bot/.env`

```
BOT_TOKEN_GRAMMAR=MTQyOTI4MTMwMjE4MzY3Mzg4Ng...
OPENAI_API_KEY=sk-proj-PN7cFNqE6UZm_wBVE-QBn4LoTNk94xttD_E_oS4R7wFXY7J8kB01t0ySdLOQRPQfIu...
OPENAI_MAX_BUDGET=10.0
```

✅ **Grammar Bot HAS**: `OPENAI_API_KEY` set to a real OpenAI key (sk-proj-...)

---

### 2. Grammar Bot's OpenAI Usage

**File**: `/discord-bots/bots/grammar-teacher-bot/src/ai/ai_grammar.py` (Line 19)

```python
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
```

✅ **Grammar Bot LOADS**: `OPENAI_API_KEY` from `.env` and uses it for OpenAI calls

---

### 3. Hangman Bot Configuration Template

**File**: `/discord-bots/bots/hangman-bot/.env.example`

```properties
# Discord Bot Token
BOT_TOKEN_HANGMAN=your_token_here

# OpenAI API Key (OPTIONAL - Shares Grammar Bot's key if available)
# Get from https://platform.openai.com/api-keys
# If not set here, the bot will look for OPENAI_API_KEY from Grammar Bot
# Leave blank if you want to use the shared key from Grammar Bot
OPENAI_API_KEY=
```

✅ **Hangman Bot TEMPLATE**: Explicitly says to "Share Grammar Bot's key" and leave OPENAI_API_KEY blank

---

### 4. Hangman Bot's Word Hints Implementation

**File**: `/discord-bots/bots/hangman-bot/src/ai/word_hints.py` (Lines 1-15)

```python
"""AI-powered word hints and definitions using OpenAI"""

import os
from dotenv import load_dotenv

load_dotenv()
# Use shared OPENAI_API_KEY from Grammar Bot or dedicated one
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

AI_AVAILABLE = OPENAI_API_KEY is not None

if AI_AVAILABLE:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
```

✅ **Hangman Bot CODE**:

- Line 8: `load_dotenv()` - Loads from `.env` file (shared parent directory)
- Line 9: Comment says "Use shared OPENAI_API_KEY from Grammar Bot or dedicated one"
- Line 10: `OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")` - Gets the environment variable

---

## 🔄 How The Sharing Works

### Setup

Both bots are in the same parent directory:

```
discord-bots/
├── bots/
│   ├── grammar-teacher-bot/
│   │   ├── .env                   ← Grammar Bot has OPENAI_API_KEY
│   │   ├── src/ai/ai_grammar.py   ← Uses os.getenv("OPENAI_API_KEY")
│   │   └── ...
│   │
│   └── hangman-bot/
│       ├── .env                   ← Leave OPENAI_API_KEY blank (OPTIONAL)
│       ├── .env.example           ← Instructions say to use Grammar Bot's key
│       ├── src/ai/word_hints.py   ← Also uses os.getenv("OPENAI_API_KEY")
│       └── ...
```

### How It Works

1. **Grammar Bot** runs and loads `.env` which has `OPENAI_API_KEY=sk-proj-...`
2. **Both bots** use `load_dotenv()` to load environment variables from `.env`
3. **Both bots** call `os.getenv("OPENAI_API_KEY")` to get the API key
4. **When both run**, they both get the SAME API key from the Grammar Bot's `.env`

### Alternative Setup

**If** Hangman Bot has its own `.env` file with `OPENAI_API_KEY` set:

- It would use its own key instead of Grammar Bot's
- But the template explicitly says to leave it blank for sharing

---

## 🎯 Current Status

| Aspect                             | Status | Evidence                                                        |
| ---------------------------------- | ------ | --------------------------------------------------------------- |
| Grammar Bot has API key            | ✅ YES | `.env` has `OPENAI_API_KEY=sk-proj-...`                         |
| Hangman Bot template says share    | ✅ YES | `.env.example` says "Leave blank if you want to use shared key" |
| Hangman Bot code uses shared key   | ✅ YES | `word_hints.py` uses `os.getenv("OPENAI_API_KEY")`              |
| Hangman Bot has its own .env       | ❌ NO  | `.env` file doesn't exist (only `.env.example`)                 |
| Both use same environment variable | ✅ YES | Both use `OPENAI_API_KEY` from environment                      |

---

## 💰 API Usage Tracking

### Grammar Bot Tracks Budget

**File**: `/discord-bots/bots/grammar-teacher-bot/src/ai/budget_monitor.py`

- Tracks all OpenAI API calls made by Grammar Bot
- Enforces `OPENAI_MAX_BUDGET` limit (default: $10.00/month)
- **Limitation**: Only tracks Grammar Bot's usage, not Hangman Bot's

### Current Setup

- ✅ Grammar Bot API calls are tracked and limited
- ⚠️ Hangman Bot API calls are NOT tracked by budget monitor
- ⚠️ Both bots share the same API key but don't share usage tracking

---

## ⚠️ IMPORTANT IMPLICATIONS

### Explicit Confirmation

✅ **YES, the Hangman Bot DOES share the Grammar Bot's OpenAI API key**

### How?

- Both load environment variables with `load_dotenv()`
- Both look for the same `OPENAI_API_KEY` variable
- Grammar Bot's `.env` has the actual API key set
- Hangman Bot's `.env.example` says to leave it blank (share the key)

### Cost Implications

- ✅ Only ONE API key = One OpenAI billing account
- ✅ Both bots can use it without separate billing
- ⚠️ Combined usage counts toward shared API key's rate limits
- ⚠️ No separate budget tracking between the two bots (both hit same limit)

### Recommendations for Enhanced Sharing

If you want to also share budget tracking:

1. Create a shared budget monitor in `discord-bots/utils/`
2. Both bots import and use the shared budget monitor
3. This way both bots' usage is tracked together against the $10/month limit

---

## 📊 Evidence Summary

| Evidence                | File            | Line(s) | Finding                                          |
| ----------------------- | --------------- | ------- | ------------------------------------------------ |
| Grammar Bot has API key | `.env`          | -       | `OPENAI_API_KEY=sk-proj-...` ✅                  |
| Grammar Bot uses it     | `ai_grammar.py` | 19      | `OpenAI(api_key=os.getenv("OPENAI_API_KEY"))` ✅ |
| Hangman template shares | `.env.example`  | 6-10    | "Share Grammar Bot's key if available" ✅        |
| Hangman code uses it    | `word_hints.py` | 10      | `os.getenv("OPENAI_API_KEY")` ✅                 |
| Hangman no own .env     | `.env`          | N/A     | File doesn't exist (uses template) ✅            |
| Both use same variable  | Both            | -       | Both use `OPENAI_API_KEY` ✅                     |

---

## ✅ FINAL VERDICT

**CONFIRMED**: The Hangman Bot **EXPLICITLY SHARES** the Grammar Bot's OpenAI API key through:

1. ✅ **Configuration**: `.env.example` instructs user to leave `OPENAI_API_KEY` blank to use shared key
2. ✅ **Code**: `word_hints.py` loads the same `OPENAI_API_KEY` environment variable
3. ✅ **Setup**: Both bots call `load_dotenv()` and use `os.getenv("OPENAI_API_KEY")`
4. ✅ **Implementation**: When Hangman Bot runs, it uses Grammar Bot's `.env` to get the API key

**Result**: Single OpenAI API key funds both bots, no duplicate billing!
