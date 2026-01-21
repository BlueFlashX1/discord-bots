# How the Grammar Teacher Bot Works 🔍

A detailed technical explanation of the bot's architecture, components, and flow.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Server                            │
│  (User sends: "!check I has went to store")                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Discord.py Framework                        │
│  • Receives message via websocket                           │
│  • Parses command (!check)                                  │
│  • Extracts arguments (text after !check)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                 Bot Event Handler                            │
│  • @bot.command() decorator catches command                 │
│  • Routes to appropriate function (check, quiz, etc.)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Command Processing Logic                        │
│  • Grammar check → LanguageTool                             │
│  • Quiz → Question database + Reaction handling             │
│  • Stats → JSON file reading                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                Response Generation                           │
│  • Create Discord Embed (rich formatting)                   │
│  • Add reactions for interactive elements                   │
│  • Update user statistics                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Send to Discord                             │
│  Bot posts formatted response back to channel               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Components

### 1. **Discord.py Framework**

```python
bot = commands.Bot(
    command_prefix='!',        # Commands start with !
    intents=intents,           # What the bot can see/do
    description='Grammar bot'  # Shows in !help
)
```

**What it does:**

- Connects to Discord's API via WebSocket
- Listens for messages in all channels bot has access to
- Automatically parses commands (messages starting with `!`)
- Handles authentication with your bot token
- Manages connection lifecycle (connect, reconnect, handle errors)

**Intents explained:**

```python
intents = discord.Intents.default()
intents.message_content = True  # REQUIRED to read message text
```

- Without `message_content`, bot can't see what users type
- Required for any text-based functionality
- Set in Discord Developer Portal + code

---

### 2. **LanguageTool Integration** (Grammar Checking)

```python
import language_tool_python
tool = language_tool_python.LanguageTool('en-US')
```

**How it works:**

1. **Initialization**: Downloads grammar rules database (first run)
2. **Text Analysis**: Parses text into sentences, words, syntax tree
3. **Pattern Matching**: Compares against 2,500+ error patterns
4. **Error Detection**: Finds grammar, spelling, style issues
5. **Suggestions**: Provides corrections based on context

**Example Flow:**

```
Input: "I has went to store"
       ↓
Tokenization: ["I", "has", "went", "to", "store"]
       ↓
Pattern Match: "has" + past participle verb = ERROR
       ↓
Rule: Subject "I" requires "have" not "has"
       ↓
Output: Error found → Suggestion: "I have gone to store"
```

**What `tool.check()` returns:**

```python
[
  Match(
    message="Did you mean 'have'?",
    context="I has went",
    replacements=["have"],
    offset=2,
    errorLength=3
  )
]
```

---

### 3. **Readability Analysis** (textstat)

```python
import textstat
score = textstat.flesch_reading_ease(text)
```

**Flesch Reading Ease Formula:**

```
Score = 206.835 - 1.015(total words/total sentences)
                - 84.6(total syllables/total words)
```

**Interpretation:**

- **90-100**: Very Easy (5th grade)
- **60-70**: Standard (8th-9th grade)
- **30-50**: Difficult (College)
- **0-30**: Very Difficult (Professional)

**What it measures:**

- Average sentence length
- Average word complexity (syllables)
- Text difficulty for readers

---

## 🔄 Command Flow Examples

### **!check** Command Deep Dive

```python
@bot.command()
async def check(ctx, *, text: str):
    # Step 1: User types: !check I has went to store

    # Step 2: Discord.py extracts:
    #   ctx = context (author, channel, guild, etc.)
    #   text = "I has went to store"

    # Step 3: Show "Bot is typing..." indicator
    async with ctx.typing():

        # Step 4: Send to LanguageTool
        matches = tool.check(text)
        # Returns list of errors found

        # Step 5: Update user stats in JSON file
        update_user_stats(ctx.author.id, 'checks_performed')
        if matches:
            update_user_stats(ctx.author.id, 'errors_found', len(matches))

        # Step 6: Build response embed
        if not matches:
            embed = discord.Embed(title="✅ Perfect!")
        else:
            embed = discord.Embed(title=f"📝 Found {len(matches)} Errors")

            # Show each error
            for match in matches[:5]:  # Limit to 5 to avoid spam
                embed.add_field(
                    name=f"Error: {match.message}",
                    value=f"Suggestion: {match.replacements}"
                )

            # Add corrected version
            corrected = tool.correct(text)
            embed.add_field(name="Corrected", value=corrected)

        # Step 7: Calculate readability
        score = textstat.flesch_reading_ease(text)
        embed.set_footer(text=f"Readability: {score}")

        # Step 8: Send back to Discord
        await ctx.send(embed=embed)
```

**Timeline:**

1. User presses Enter → Discord sends message
2. Bot receives via WebSocket → ~50-100ms
3. Command parsed → instant
4. Grammar check → 100-500ms (depending on text length)
5. Stats updated → 5-10ms (JSON write)
6. Embed created → instant
7. Response sent → 50-100ms
8. User sees result → **Total: ~200-700ms**

---

### **!quiz** Command Flow

```python
@bot.command()
async def quiz(ctx):
    # Step 1: Pick random question from database
    question_data = random.choice(QUIZ_QUESTIONS)
    # {
    #   "question": "Which is correct?",
    #   "options": ["Their going", "They're going", "There going"],
    #   "correct": 1,  # Index of correct answer
    #   "explanation": "They're = They are"
    # }

    # Step 2: Create embed with options
    embed = discord.Embed(title="🧠 Grammar Quiz!")
    embed.description = question_data['question']

    emojis = ['🇦', '🇧', '🇨']
    for i, option in enumerate(question_data['options']):
        embed.add_field(name=f"{emojis[i]} Option {chr(65+i)}", value=option)

    # Step 3: Post question
    quiz_msg = await ctx.send(embed=embed)

    # Step 4: Add reaction buttons
    for emoji in emojis:
        await quiz_msg.add_reaction(emoji)

    # Step 5: Wait for user to click reaction
    def check(reaction, user):
        return (
            user == ctx.author and           # Must be original user
            str(reaction.emoji) in emojis and # Must be valid emoji
            reaction.message.id == quiz_msg.id # Must be on quiz message
        )

    try:
        # Wait up to 30 seconds
        reaction, user = await bot.wait_for(
            'reaction_add',
            timeout=30.0,
            check=check
        )

        # Step 6: Check answer
        user_answer = emojis.index(str(reaction.emoji))

        if user_answer == question_data['correct']:
            # CORRECT!
            result = discord.Embed(title="✅ Correct!", color=0x2ecc71)
            update_user_stats(ctx.author.id, 'correct_answers')
        else:
            # WRONG
            result = discord.Embed(title="❌ Incorrect", color=0xe74c3c)
            result.description = f"Correct answer: {question_data['options'][correct]}"

        # Always update quizzes completed
        update_user_stats(ctx.author.id, 'quizzes_completed')

        # Step 7: Show explanation
        result.add_field(name="💡 Explanation", value=question_data['explanation'])

        # Step 8: Send result
        await ctx.send(embed=result)

    except asyncio.TimeoutError:
        # User didn't respond in 30 seconds
        await ctx.send("⏰ Time's up!")
```

**Key Concepts:**

- **Event-driven**: Bot waits for reaction instead of polling
- **Filter function**: `check()` ensures only valid reactions count
- **Timeout handling**: Gracefully handles no response
- **Async/await**: Non-blocking so bot can handle other commands

---

## 💾 Data Management

### User Statistics (JSON File)

**File structure:** `data/user_stats.json`

```json
{
  "123456789": {
    "checks_performed": 15,
    "errors_found": 8,
    "quizzes_completed": 5,
    "correct_answers": 4,
    "words_learned": 10,
    "last_active": "2025-10-18T14:30:00"
  },
  "987654321": {
    "checks_performed": 3,
    ...
  }
}
```

**How it works:**

```python
def update_user_stats(user_id, stat_type, value=1):
    # Step 1: Load entire JSON file
    with open('data/user_stats.json', 'r') as f:
        stats = json.load(f)

    # Step 2: Get or create user's data
    user_id = str(user_id)  # Convert to string for JSON key
    if user_id not in stats:
        stats[user_id] = {
            'checks_performed': 0,
            'errors_found': 0,
            'quizzes_completed': 0,
            'correct_answers': 0,
            'words_learned': 0,
            'last_active': None
        }

    # Step 3: Update the stat
    stats[user_id][stat_type] += value
    stats[user_id]['last_active'] = datetime.now().isoformat()

    # Step 4: Save back to file
    with open('data/user_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)

    return stats[user_id]
```

**Why JSON?**

- ✅ Simple to read/write
- ✅ Human-readable
- ✅ No database setup needed
- ✅ Good for small-medium data
- ❌ Not ideal for huge datasets (thousands of users)
- ❌ No concurrent write protection (fine for single bot)

**For scaling:** Would migrate to SQLite or PostgreSQL

---

## 🎨 Embed Creation

### Discord Embeds Explained

**Regular message:**

```
Bot: Found 2 errors: has → have, went → gone
```

**Embed message:**

```
┌─────────────────────────────────────┐
│  📝 Found 2 Errors                  │  ← Title
├─────────────────────────────────────┤
│                                     │
│  Error 1: Grammar mistake           │  ← Field 1
│  Suggestion: have                   │
│                                     │
│  Error 2: Wrong tense              │  ← Field 2
│  Suggestion: gone                   │
│                                     │
│  ✨ Corrected Version               │  ← Field 3
│  "I have gone to the store"        │
│                                     │
├─────────────────────────────────────┤
│  Readability: Easy (Score: 85.2)    │  ← Footer
└─────────────────────────────────────┘
```

**Code:**

```python
embed = discord.Embed(
    title="📝 Found 2 Errors",    # Top heading
    description="Analysis:",       # Subtitle (optional)
    color=0xe74c3c                # Red color (hex)
)

embed.add_field(
    name="Error 1",               # Field heading
    value="Grammar mistake",      # Field content
    inline=False                  # Full width (True = side-by-side)
)

embed.set_footer(text="Readability: Easy")  # Bottom text
embed.set_thumbnail(url="...")              # Small image top-right
embed.set_image(url="...")                  # Large image bottom
embed.timestamp = datetime.utcnow()         # Timestamp bottom-right

await ctx.send(embed=embed)
```

**Why use embeds?**

- ✅ Rich formatting (colors, fields, images)
- ✅ Better organization
- ✅ More professional appearance
- ✅ Support for URLs, markdown, emojis

---

## ⚙️ Bot Lifecycle

### Startup Sequence

```python
if __name__ == '__main__':
    # 1. Load .env file
    load_dotenv()
    TOKEN = os.getenv('BOT_TOKEN_GRAMMAR')

    # 2. Initialize bot
    bot = commands.Bot(...)

    # 3. Start bot (blocking call)
    bot.run(TOKEN)
```

**What happens inside `bot.run()`:**

```
1. Connect to Discord Gateway (websocket)
   ↓
2. Authenticate with bot token
   ↓
3. Receive READY event from Discord
   ↓
4. Trigger @bot.event on_ready()
   ├─ Print "Bot is online!"
   ├─ Set status/activity
   └─ Start background tasks
   ↓
5. Enter event loop (runs forever)
   ├─ Listen for messages
   ├─ Listen for reactions
   ├─ Listen for member joins/leaves
   └─ Respond to events
```

### Event Loop

```python
@bot.event
async def on_ready():
    """Called once when bot connects"""
    print(f'{bot.user} is online!')
    await bot.change_presence(activity=discord.Game(name="!help"))

@bot.event
async def on_message(message):
    """Called for EVERY message bot can see"""
    if message.author.bot:
        return  # Ignore bot messages

    # Process commands
    await bot.process_commands(message)

@bot.command()
async def check(ctx, *, text: str):
    """Called when user types !check"""
    # Your code here
```

**Event flow:**

1. Discord sends event → Bot receives via websocket
2. Discord.py calls appropriate event handler
3. Handler executes (async, non-blocking)
4. Bot sends response back to Discord
5. Loop continues (handles next event)

**Why async/await?**

- Handles multiple users simultaneously
- Doesn't block on I/O (network, file reads)
- Efficient resource usage
- Example: While waiting for LanguageTool, bot can handle other commands

---

## 🔍 Error Detection Examples

### Example 1: Subject-Verb Agreement

**Input:** `"The dogs runs fast"`

**LanguageTool Processing:**

1. Parse sentence structure
2. Identify subject: "The dogs" (plural)
3. Identify verb: "runs" (singular)
4. Apply rule: Plural subject requires plural verb
5. Flag error: "runs" → should be "run"

**Output:**

```python
Match(
    message="The plural noun 'dogs' requires a plural verb.",
    context="The dogs runs fast",
    replacements=["run"],
    offset=9,
    errorLength=4
)
```

### Example 2: Wrong Word

**Input:** `"I could of done better"`

**LanguageTool Processing:**

1. Detect phrase "could of"
2. Match against common mistake pattern
3. Recognize confusion with "could've" (could have)
4. Flag error: "of" → should be "have"

**Output:**

```python
Match(
    message="Did you mean 'could have'?",
    context="I could of done",
    replacements=["have", "have"],
    offset=8,
    errorLength=2
)
```

---

## 🎯 Key Algorithms

### Readability Calculation

```python
def analyze_readability(text):
    # Count components
    sentences = text.split('.')
    words = text.split()
    syllables = sum(count_syllables(word) for word in words)

    # Calculate metrics
    avg_words_per_sentence = len(words) / len(sentences)
    avg_syllables_per_word = syllables / len(words)

    # Flesch Reading Ease
    score = 206.835 - (1.015 * avg_words_per_sentence) - (84.6 * avg_syllables_per_word)

    # Interpret
    if score >= 90:
        return "Very Easy"
    elif score >= 60:
        return "Standard"
    else:
        return "Difficult"
```

### Passive Voice Detection (Simplified)

```python
def detect_passive_voice(text):
    # Simple heuristic (real implementation more complex)
    passive_indicators = ['was', 'were', 'been', 'being', 'is', 'are']

    words = text.lower().split()
    passive_count = sum(1 for word in words if word in passive_indicators)

    # If >10% of words are passive indicators
    if passive_count > len(words) * 0.1:
        return True
    return False
```

---

## 🚀 Performance Considerations

### Bottlenecks

1. **LanguageTool checking** - Slowest operation (100-500ms)

   - **Solution**: Show typing indicator
   - **Future**: Cache common phrases

2. **JSON file I/O** - Gets slower with more users

   - **Current**: Fine for <1000 users
   - **Future**: Migrate to SQLite database

3. **Discord API rate limits**
   - Max 5 messages per 5 seconds per channel
   - Max 50 messages per second globally
   - **Solution**: Built-in rate limiting in discord.py

### Optimizations

```python
# ✅ GOOD: Bulk reactions (1 API call)
for emoji in emojis:
    await message.add_reaction(emoji)

# ❌ BAD: Multiple embeds (multiple API calls)
for error in errors:
    embed = discord.Embed(...)
    await ctx.send(embed=embed)  # Don't do this!

# ✅ GOOD: Single embed with all errors
embed = discord.Embed(...)
for error in errors:
    embed.add_field(...)
await ctx.send(embed=embed)  # One call!
```

---

## 🔐 Security & Best Practices

### Token Security

```python
# ✅ GOOD: Environment variables
load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_GRAMMAR')

# ❌ BAD: Hardcoded token
TOKEN = "MTIzNDU2Nzg5..."  # NEVER DO THIS!
```

### Input Validation

```python
@bot.command()
async def check(ctx, *, text: str):
    # Implicit validation by discord.py
    # - text must exist (or error)
    # - text is string type

    # Explicit validation
    if len(text) > 2000:  # Discord message limit
        await ctx.send("Text too long! Max 2000 characters.")
        return
```

### Error Handling

```python
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f"Missing: {error.param.name}")
    elif isinstance(error, commands.CommandNotFound):
        pass  # Ignore unknown commands
    else:
        print(f"Error: {error}")  # Log for debugging
        await ctx.send("Something went wrong!")
```

---

## 📊 Data Structures

### Quiz Question Format

```python
{
    "question": "Which is correct?",           # String: The question
    "options": ["Option A", "Option B", ...],  # List: Answer choices
    "correct": 1,                              # Int: Index of correct answer (0-based)
    "explanation": "Because..."                # String: Why answer is correct
}
```

### Stats Dictionary

```python
{
    "user_id": {
        "checks_performed": int,    # Total grammar checks
        "errors_found": int,        # Total errors detected
        "quizzes_completed": int,   # Total quizzes taken
        "correct_answers": int,     # Correct quiz responses
        "words_learned": int,       # Word of day views
        "last_active": str         # ISO format timestamp
    }
}
```

---

## 🎓 Learning Progression

**For beginners learning from this code:**

1. **Level 1**: Understand basic command structure

   - @bot.command() decorator
   - async/await basics
   - Sending simple messages

2. **Level 2**: Learn embed creation

   - discord.Embed()
   - Adding fields
   - Colors and formatting

3. **Level 3**: Event handling

   - Reactions
   - wait_for()
   - Timeouts

4. **Level 4**: Data persistence

   - JSON file operations
   - User statistics
   - Data structures

5. **Level 5**: External library integration
   - LanguageTool API
   - textstat analysis
   - Error handling

---

## 🎯 Summary

**The bot is essentially:**

1. **Event listener** - Waits for Discord messages
2. **Command router** - Directs to appropriate function
3. **Text processor** - Analyzes with LanguageTool/textstat
4. **Data manager** - Tracks user progress
5. **Response formatter** - Creates pretty embeds
6. **Interactive handler** - Manages quizzes via reactions

**Core loop:**

```
Listen → Parse → Process → Respond → Repeat
```

**Everything is asynchronous** so the bot can handle multiple users simultaneously without blocking!

---

Want me to explain any specific part in more detail? 🤓
