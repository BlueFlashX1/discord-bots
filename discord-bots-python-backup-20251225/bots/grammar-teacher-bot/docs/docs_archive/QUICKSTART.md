# 📚 Grammar Teacher Bot - Quick Start

Your comprehensive grammar and writing assistant bot is ready!

## ✨ What This Bot Does

### Grammar & Writing Help

- ✅ **Grammar checking** - Detects and corrects grammar errors
- ✅ **Spelling correction** - Catches typos and spelling mistakes
- ✅ **Readability analysis** - Measures how easy text is to read
- ✅ **Writing improvement** - Suggests ways to enhance your writing
- ✅ **Synonym finder** - Expand your vocabulary

### Learning Features

- 📚 **Word of the Day** - Learn new vocabulary daily
- 💡 **Grammar tips** - Quick lessons on common grammar rules
- ⚠️ **Common mistakes** - Learn what to avoid
- 🧠 **Interactive quizzes** - Test your knowledge
- 📊 **Progress tracking** - See your improvement over time

## 🚀 Setup & Installation

### 1. Install Dependencies

```bash
cd /Users/matthewthompson/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot

# Use the setup script (recommended)
./setup.sh

# OR install manually
pip install -r requirements.txt
```

### 2. Get a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use existing one
3. Go to "Bot" section and copy the token
4. Add to `discord-bots/.env`:
   ```
   BOT_TOKEN_GRAMMAR=your_token_here
   ```

### 3. Invite Bot to Server

Use this URL (replace CLIENT_ID with your application ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=274878221376&scope=bot
```

Required permissions:

- Read Messages
- Send Messages
- Embed Links
- Add Reactions
- Read Message History

### 4. Run the Bot

```bash
python bot.py
```

## 📖 Commands

### Grammar & Writing

| Command           | Description                  | Example                      |
| ----------------- | ---------------------------- | ---------------------------- |
| `!check <text>`   | Check grammar and spelling   | `!check I has went to store` |
| `!improve <text>` | Get writing improvement tips | `!improve [your text]`       |
| `!synonym <word>` | Find synonyms                | `!synonym happy`             |

### Learning

| Command      | Description                      |
| ------------ | -------------------------------- |
| `!wordofday` | Get today's word with definition |
| `!tip`       | Random grammar tip               |
| `!mistakes`  | Common grammar mistakes to avoid |
| `!quiz`      | Take an interactive grammar quiz |

### Stats

| Command        | Description                 |
| -------------- | --------------------------- |
| `!stats`       | View your learning progress |
| `!stats @user` | View another user's stats   |

## 🎯 Example Usage

### Check Grammar

```
User: !check I has went to the store yesterday
Bot:  📝 Found 1 Error
      Error 1: Grammar error
      Context: I has went to
      Suggestion: went

      ✨ Suggested Correction
      "I went to the store yesterday"
```

### Get Writing Tips

```
User: !improve The meeting was attended by many people and it was very productive
Bot:  ✨ Writing Improvement Suggestions

      Tip 1: 🔄 Passive Voice
      Try using more active voice for stronger writing.

      Suggested: "Many people attended the productive meeting"
```

### Daily Vocabulary

```
User: !wordofday
Bot:  📚 Word of the Day: Serendipity

      📖 Definition
      Finding something good without looking for it

      💬 Example
      "Meeting my best friend was pure serendipity."

      🔄 Synonyms
      chance, luck, fortune
```

### Grammar Quiz

```
User: !quiz
Bot:  🧠 Grammar Quiz!
      Which is correct?

      🇦 Option A: Their going to the park
      🇧 Option B: They're going to the park
      🇨 Option C: There going to the park

      React with the correct answer!

[User reacts with 🇧]

Bot:  ✅ Correct!
      Great job, @User!

      💡 Explanation
      They're = They are. "They are going to the park."
```

### View Progress

```
User: !stats
Bot:  📊 Learning Stats for User

      ✅ Grammar Checks: 15 checks, 8 errors found
      🧠 Quizzes: 5 completed, 80.0% accuracy
      📚 Words Learned: 10 words

      Last active: 2025-10-18 14:30
```

## 🎓 Educational Topics Covered

### Grammar Rules

- Their/They're/There
- Your/You're
- Its/It's
- Affect/Effect
- Who/Whom
- Subject-verb agreement
- Comma splices
- Double negatives

### Writing Skills

- Active vs passive voice
- Sentence variety
- Word choice
- Readability
- Clarity and conciseness

### Common Mistakes

- Could of → Could have
- Alot → A lot
- Loose vs Lose
- Accept vs Except
- Literally (misuse)
- Less vs Fewer
- Me/Myself/I

## 🔧 Dependencies Explained

### Required

- **language-tool-python** - Powers grammar checking

  - Uses LanguageTool (open-source grammar checker)
  - Detects 2,500+ error patterns
  - Supports multiple languages

- **textstat** - Readability analysis

  - Flesch Reading Ease score
  - Grade level estimation
  - Multiple readability metrics

- **nltk** - Natural Language Processing
  - Text analysis
  - Future enhancements (sentiment, etc.)

### Already Installed

- discord.py - Discord bot framework
- python-dotenv - Environment variables
- aiohttp - Async HTTP requests

## 📊 Features Breakdown

### Current Features ✅

- Grammar error detection
- Spelling correction
- Readability scoring
- Writing style analysis
- Vocabulary building
- Interactive quizzes
- Progress tracking
- Daily word of the day

### Future Enhancements 🚀

- AI-powered explanations (OpenAI GPT)
- Essay grading
- Citation help (APA, MLA)
- Multi-language support
- Custom word lists
- Writing challenges
- Leaderboards

## 💡 Use Cases

**For Students:**

- Check homework before submission
- Learn grammar rules
- Expand vocabulary
- Practice with quizzes

**For ESL Learners:**

- Real-time grammar feedback
- Learn common mistakes
- Build vocabulary daily
- Interactive practice

**For Writers:**

- Improve writing style
- Enhance readability
- Find better word choices
- Quick grammar checks

**For Teachers:**

- Supplement lessons
- Provide practice quizzes
- Track student progress
- Share daily vocabulary

## 🎯 Bot Performance

- **Response Time:** < 2 seconds for grammar checks
- **Accuracy:** Uses LanguageTool (2,500+ patterns)
- **Scalability:** Can handle multiple servers
- **Uptime:** Designed to run 24/7

## 🐛 Troubleshooting

### Bot doesn't respond

- Check bot token in `.env`
- Verify bot has message permissions
- Check `!help` works

### Grammar checking disabled

- Install: `pip install language-tool-python`
- May download language data on first run (be patient)

### "Missing argument" errors

- Check command syntax: `!check <text>`
- Text must come after command

### Import errors

- Run: `pip install -r requirements.txt`
- Check Python version (3.8+ required)

## 📈 Planned Updates

- [ ] Custom server dictionaries
- [ ] Essay/long-form feedback
- [ ] Writing streaks/badges
- [ ] Collaborative editing
- [ ] Voice message transcription
- [ ] AI-powered tutoring
- [ ] Multi-language support

## 🤝 Contributing Ideas

Want to enhance the bot? Ideas:

- More quiz questions
- Additional grammar tips
- Word of the day entries
- Writing exercises
- Style guides (technical, creative, etc.)

## 📞 Support

- Check `!help` for command list
- Review this guide for detailed info
- Test in a private server first

## 🎉 You're Ready!

Start helping people write better! The bot is:

- ✅ Educational and helpful
- ✅ Interactive and engaging
- ✅ Tracks progress
- ✅ Fun to use

Perfect for study servers, writing communities, or any Discord where clear communication matters! 📚✨

---

**Happy teaching! 📖**
