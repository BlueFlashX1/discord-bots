# Coding Practice Bot

Discord bot for Python coding practice with problems from LeetCode, Codewars, and more.

## Features

- 🎯 Get random coding problems by difficulty (Easy/Medium/Hard)
- 🤖 **Automatic problem posting** - Problems posted daily without manual requests
- 📝 Submit solutions via code blocks or file attachments
- ✅ Syntax validation and basic test execution
- 📊 Track your progress and statistics
- 🔥 Daily streak tracking
- ⚙️ **Customizable preferences** - Set difficulty, source, and auto-post settings
- 📈 **Mastery tracking** - Link Codewars account for progress-based difficulty recommendations
- 🎓 **Smart recommendations** - Bot suggests when to try harder difficulties based on your progress

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your Discord bot token:

```bash
cp .env.example .env
```

3. Deploy commands:

```bash
npm run deploy
```

4. Start the bot:

```bash
npm start
```

## Commands

### Problem Commands
- `/problem [difficulty] [source]` - Get a random coding problem
- `/submit [code] [file]` - Submit your solution (code block or .py file)
- `/stats` - View your coding statistics
- `/solutions [my|problem|recent]` - View archived successful solutions

### Settings & Preferences
- `/settings autopost` - Enable/disable automatic problem posting
- `/settings difficulty` - Set your preferred difficulty level
- `/settings source` - Set your preferred problem source (LeetCode/Codewars/Random)
- `/settings codewars` - Link your Codewars username for mastery tracking
- `/settings mastery` - Enable/disable mastery tracking and recommendations
- `/settings view` - View your current settings

### Mastery & Progress
- `/mastery` - Check your Codewars mastery progress and get difficulty recommendations

## Code Submission Formats

The bot accepts code in multiple formats:

1. **Code Blocks** (recommended for short solutions):

   ````
   /submit code:```python
   def solution():
       return "Hello World"
   ````

   ```

   ```

2. **File Attachments** (recommended for longer solutions):

   - Attach a `.py` file using the `file` option
   - The bot will read and validate the file

3. **Inline Code** (for very short snippets):

   ```
   /submit code:`print("Hello")`
   ```

## How It Works

1. Use `/problem` to get a coding challenge
2. Write your solution in Python
3. Submit using `/submit` with either:
   - Code in a code block
   - A `.py` file attachment
4. The bot validates syntax and runs tests (if available)
5. Track your progress with `/stats`

## Data Storage

- Problems are cached in `data/problems.json`
- User progress is stored in `data/progress.json`

## Notes

- Code validation runs locally using Python 3
- Test execution is basic - for production, consider a sandboxed environment
- Some problems may not have automated tests (syntax-only validation)
