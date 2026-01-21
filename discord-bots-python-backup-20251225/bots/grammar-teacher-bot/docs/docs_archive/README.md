# Grammar Teacher Bot 📚✍️

An interactive Discord bot that helps users improve their grammar, writing, and language skills.

## Features

### Core Features

- **Grammar Check** - Analyze text for grammar errors
- **Spelling Check** - Catch and correct spelling mistakes
- **Word of the Day** - Learn new vocabulary daily
- **Grammar Tips** - Quick grammar rules and explanations
- **Writing Style Analysis** - Check readability and tone
- **Vocabulary Quiz** - Interactive quizzes to test knowledge
- **Punctuation Helper** - Learn proper punctuation usage
- **Common Mistakes** - Highlight frequently confused words

### Advanced Features

- **Sentence Improvement** - Get suggestions for better sentences
- **Vocabulary Expansion** - Find synonyms and better word choices
- **Writing Exercises** - Daily writing prompts and exercises
- **Progress Tracking** - Track improvement over time
- **Custom Dictionary** - Add technical terms or names
- **Tone Analysis** - Detect if text is formal, casual, professional

## Commands

```
!check <text>           - Check grammar and spelling
!define <word>          - Get definition and examples
!synonym <word>         - Find synonyms
!wordofday             - Get today's word of the day
!quiz                  - Start a grammar quiz
!tip                   - Random grammar tip
!improve <text>        - Get suggestions to improve text
!mistakes              - Common grammar mistakes to avoid
!punctuation <rule>    - Learn punctuation rules
!stats                 - View your learning progress
```

## Setup

1. **Install additional dependencies:**

   ```bash
   pip install language-tool-python
   pip install nltk
   pip install textstat
   ```

2. **Add bot token to `.env`:**

   ```
   BOT_TOKEN_GRAMMAR=your_token_here
   ```

3. **Run the bot:**
   ```bash
   cd bots/grammar-teacher-bot
   python bot.py
   ```

## Educational Value

Perfect for:

- Students learning English
- Non-native English speakers
- Writers improving their craft
- Discord servers focused on education
- Study groups and homework help servers
- Professional writing communities

## Future Enhancements

- AI-powered explanations (OpenAI integration)
- Essay grading and feedback
- Writing style guides (APA, MLA, Chicago)
- Multi-language support
- Voice message transcription and grammar check
- Writing challenges and competitions
- Peer review system

## Libraries Used

- **language-tool-python** - Grammar checking (LanguageTool)
- **nltk** - Natural Language Processing
- **textstat** - Readability analysis
- **PyDictionary** - Word definitions
- **discord.py** - Discord integration

## Examples

**Grammar Check:**

```
User: !check I has went to the store yesterday
Bot: ❌ Found 1 error:
     "has went" → should be "went"
     Corrected: "I went to the store yesterday"
```

**Word of the Day:**

```
Bot: 📚 Word of the Day: Serendipity
     Meaning: Finding something good without looking for it
     Example: "Meeting my best friend was pure serendipity."
     Synonyms: chance, luck, fortune
```

**Quiz:**

```
Bot: 🧠 Grammar Quiz!
     Which is correct?
     A) "Their going to the park"
     B) "They're going to the park"
     C) "There going to the park"

     React with 🅰️, 🅱️, or 🅲!
```

## License

MIT - Free to use and modify!
