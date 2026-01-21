# 🎨 Customization Guide

> **How to Add, Edit, or Delete Grammar Rules**  
> Based on User Feedback

---

## 📖 Overview

This bot is designed to be **easily customizable**. Most changes can be made by editing `config.py` without touching the core bot code.

**Philosophy:** User feedback drives improvements. This guide shows you how to quickly implement user suggestions.

---

## 🚀 Quick Customization

### Add a Word to Ignore

**User says:** "The bot keeps flagging 'omg' as a spelling error."

**Fix:** Edit `config.py`:

```python
INFORMAL_EXPRESSIONS = {
    'hmm', 'lol', 'brb',
    # Add the word:
    'omg',  # ← Add this line
}
```

**Restart bot:**

```bash
./manage_startup.sh restart
```

### Change Cooldown Time

**User says:** "5 minutes is too long between corrections."

**Fix:** Edit `config.py`:

```python
# Change from 300 seconds (5 min) to 120 seconds (2 min)
COOLDOWN_SECONDS = 120
```

### Adjust "Long Sentence" Threshold

**User says:** "The bot warns about long sentences too early."

**Fix:** Edit `config.py`:

```python
# Change from 20 words to 30 words
LONG_SENTENCE_THRESHOLD = 30
```

---

## 📝 Common Customizations

### 1. Adding Informal Expressions

**Location:** `config.py` → `INFORMAL_EXPRESSIONS`

**Examples:**

```python
INFORMAL_EXPRESSIONS = {
    # Thinking/pausing
    'hmm', 'hmmm', 'hmmmm', 'umm', 'uhh', 'erm',

    # Laughter
    'haha', 'lol', 'lmao', 'rofl', 'lmfao',

    # Emotions
    'aww', 'yay', 'woohoo', 'meh', 'ugh',

    # Agreement/disagreement
    'yeah', 'nah', 'yep', 'nope', 'yup',

    # Casual contractions
    'gonna', 'wanna', 'gotta', 'kinda', 'sorta',

    # Internet slang
    'brb', 'btw', 'imo', 'tbh', 'idk', 'ikr',

    # Add your custom ones here:
    'bro', 'dude', 'sup', 'hey', 'yo',
}
```

**Testing:**

```
/check omg that's awesome
# Should NOT flag "omg" if added to set
```

### 2. Modifying Error Thresholds

**Location:** `config.py` → `INSIGHT_THRESHOLDS`

**Purpose:** Control when tips appear

```python
INSIGHT_THRESHOLDS = {
    'capitalization': 2,    # Show tip after 2+ capitalization errors
    'punctuation': 3,       # Changed from 2 to 3
    'grammar': 2,
    'spelling': 2,
    'style': 1,             # Show tip after just 1 style error
}
```

**Example:**  
User feedback: "I don't need punctuation tips so often."  
Fix: Increase `'punctuation': 3`

### 3. Customizing Messages

**Location:** `config.py` → `MESSAGES`

**Examples:**

```python
MESSAGES = {
    'auto_correction_title': '✨ Grammar Tip',  # Changed from default
    'perfect_title': '🎉 Perfect Writing!',      # Changed from default
    'footer_auto': 'Type /autocheck off to disable',

    # Add new messages:
    'custom_greeting': 'Hello! I found some suggestions:',
}
```

### 4. Changing Colors

**Location:** `config.py` → `COLORS`

**Purpose:** Discord embed colors

```python
COLORS = {
    'error': 0xFF6B6B,      # Red for errors
    'perfect': 0x51CF66,    # Green for perfect
    'info': 0x4DABF7,       # Blue for info

    # Add custom colors:
    'warning': 0xFFD93D,    # Yellow
    'premium': 0x845EC2,    # Purple
}
```

### 5. Adding Professional Word Replacements

**Location:** `config.py` → `PROFESSIONAL_REPLACEMENTS`

**Purpose:** Suggest better vocabulary in variations

```python
PROFESSIONAL_REPLACEMENTS = {
    'big': 'significant',
    'good': 'excellent',
    'bad': 'unfavorable',

    # Add your own:
    'nice': 'commendable',
    'cool': 'impressive',
    'awesome': 'outstanding',
}
```

---

## 🔧 Advanced Customizations

### 1. Custom Filtering Rules

**Location:** `config.py` → `custom_should_ignore()`

**Use case:** Ignore errors based on complex patterns

**Example 1: Ignore code blocks**

````python
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    """Add custom filtering rules here."""

    # Ignore errors in code blocks
    if '```' in original_text:
        return True

    return False
````

**Example 2: Ignore URLs**

```python
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    # Ignore errors in URLs
    if 'http://' in error_text or 'https://' in error_text:
        return True

    # Ignore errors in email addresses
    if '@' in error_text and '.' in error_text:
        return True

    return False
```

**Example 3: Ignore specific error messages**

```python
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    # Get error message
    error_msg = match.message.lower() if hasattr(match, 'message') else ''

    # Ignore specific error messages
    ignore_messages = [
        'use a comma before',
        'possible typo',
        'this word is not typically used',
    ]

    for msg in ignore_messages:
        if msg in error_msg:
            return True

    return False
```

**Example 4: Combine multiple rules**

````python
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    # Ignore code blocks
    if '```' in original_text:
        return True

    # Ignore URLs
    if 'http://' in error_text or 'https://' in error_text:
        return True

    # Ignore short messages (under 3 words)
    if len(original_text.split()) < 3:
        return True

    # Ignore if message is all caps (intentional shouting)
    if original_text.isupper() and len(original_text) > 5:
        return True

    return False
````

### 2. Modifying Error Types

**Location:** `config.py` → `IMPORTANT_ERROR_TYPES`

**Use case:** Control which error categories to check

```python
IMPORTANT_ERROR_TYPES = [
    "grammar",           # Subject-verb agreement, tenses
    "misspelling",       # Spelling errors
    "typographical",     # Typos
    "punctuation",       # Periods, commas
    "capitalization",    # "I", proper nouns
    "style",             # Clarity, word choice

    # Add more types if needed:
    # "redundancy",
    # "colloquialisms",
]
```

**To find available types:**

1. Temporarily disable filtering
2. Check a message
3. Look at error types returned
4. Add desired types to list

### 3. Customizing Readability Levels

**Location:** `config.py` → `READABILITY_LEVELS`

**Use case:** Customize grade level interpretations

```python
READABILITY_LEVELS = [
    (90, 100, "5th Grade", "✅ Very Easy", "Great for all audiences"),
    (80, 89, "6th Grade", "✅ Easy", "Conversational"),
    (70, 79, "7th Grade", "📖 Fairly Easy", "Plain English"),
    (60, 69, "8th-9th Grade", "📖 Standard", "Average difficulty"),
    (50, 59, "10th-12th Grade", "📚 Fairly Difficult", "High school level"),
    (30, 49, "College", "📚 Difficult", "Academic writing"),
    (0, 29, "College Graduate", "⚠️ Very Difficult", "Professional/Technical"),

    # Add custom ranges:
    # (95, 100, "Elementary", "🌟 Super Easy", "For kids"),
]
```

### 4. Adding Custom Tone Indicators

**Location:** `config.py` → `TONE_INDICATORS`

**Use case:** Detect more tone types

```python
TONE_INDICATORS = {
    'formal': {
        'keywords': ['therefore', 'furthermore', 'consequently', 'moreover'],
        'emoji': '🎩',
        'description': 'Professional and structured'
    },

    # Add custom tone:
    'sarcastic': {
        'keywords': ['obviously', 'clearly', 'of course', 'sure'],
        'emoji': '😏',
        'description': 'Sarcastic or ironic'
    },

    'excited': {
        'keywords': ['amazing', 'awesome', 'incredible', 'fantastic'],
        'emoji': '🎉',
        'description': 'Enthusiastic and energetic'
    },
}
```

---

## 🎯 User Feedback Examples

### Example 1: "Don't flag 'gonna'"

**User feedback:** "The bot keeps flagging 'gonna' but that's how I talk."

**Solution:**

```python
# config.py
INFORMAL_EXPRESSIONS = {
    # ... existing expressions ...
    'gonna',  # Add this
}
```

### Example 2: "Cooldown too long"

**User feedback:** "I want corrections more often than every 5 minutes."

**Solution:**

```python
# config.py
COOLDOWN_SECONDS = 180  # Changed to 3 minutes
```

### Example 3: "Ignore errors in quotes"

**User feedback:** "When I quote someone, don't correct their grammar."

**Solution:**

```python
# config.py
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    # Ignore text in quotes
    if '"' in original_text or "'" in original_text:
        # Check if error is within quotes
        if '"' in error_text or "'" in error_text:
            return True

    return False
```

### Example 4: "Show more errors"

**User feedback:** "Only showing 3 errors is too few."

**Solution:**

```python
# config.py
MAX_ERRORS_DETAILED = 5  # Changed from 3
```

### Example 5: "Different emoji for spelling"

**User feedback:** "Use a different emoji for spelling errors."

**Solution:**

```python
# config.py
ERROR_TYPE_EMOJIS = {
    'grammar': '📖',
    'misspelling': '🔤',  # Changed from ✏️
    'typographical': '⌨️',
    # ... rest ...
}
```

---

## 🧪 Testing Your Changes

### 1. Quick Test

```bash
# Restart bot
./manage_startup.sh restart

# Check status
./manage_startup.sh status

# View logs for errors
./manage_startup.sh logs
```

### 2. Test Specific Changes

**Testing informal expressions:**

```
/check omg that's so cool
# Should not flag "omg" or "cool" if added to INFORMAL_EXPRESSIONS
```

**Testing cooldown:**

```
# Send a message
# Wait for cooldown time
# Send another message
# Should get correction if cooldown passed
```

**Testing custom filters:**

````
/check check this code: ```print('hello')```
# Should ignore if custom filter added for code blocks
````

### 3. Check Logs for Errors

```bash
./manage_startup.sh errors
```

Look for:

- Syntax errors in config.py
- Import errors
- Runtime errors

---

## 📋 Customization Checklist

When implementing user feedback:

- [ ] **Identify** what needs to change
- [ ] **Locate** the setting in `config.py`
- [ ] **Make** the change
- [ ] **Save** the file
- [ ] **Restart** the bot
- [ ] **Test** the change in Discord
- [ ] **Check logs** for errors
- [ ] **Document** the change (optional)

---

## 🎨 Full Customization Example

**User feedback:** "I want the bot to be more lenient and friendly."

**Changes:**

```python
# config.py

# 1. Increase cooldown (less frequent corrections)
COOLDOWN_SECONDS = 600  # 10 minutes

# 2. Show fewer errors
MAX_ERRORS_DETAILED = 2

# 3. Add more informal expressions
INFORMAL_EXPRESSIONS = {
    # ... existing ...
    'hey', 'sup', 'yo', 'bro', 'dude', 'guys',
    'cool', 'nice', 'awesome', 'sweet',
}

# 4. Increase error thresholds (show tips less often)
INSIGHT_THRESHOLDS = {
    'capitalization': 3,  # Changed from 2
    'punctuation': 3,     # Changed from 2
    'grammar': 3,         # Changed from 2
    'spelling': 3,        # Changed from 2
    'style': 3,           # Changed from 2
}

# 5. Friendlier messages
MESSAGES = {
    'auto_correction_title': '💬 Friendly Suggestion',
    'perfect_title': '🌟 Your writing looks great!',
    'footer_auto': 'Just a suggestion - keep being you! 😊',
}

# 6. Custom filter for very short messages
def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    # Ignore errors in very short messages (under 5 words)
    if len(original_text.split()) < 5:
        return True

    return False
```

**Result:** More lenient, friendly bot with less frequent corrections.

---

## 🔍 Finding What to Customize

### Method 1: Check Logs

```bash
./manage_startup.sh logs
```

Look for patterns in corrections that shouldn't be made.

### Method 2: Test Messages

```
/check test message here
```

See what errors are flagged, adjust filters as needed.

### Method 3: User Statistics

```
/stats
```

Look for error patterns that might be false positives.

---

## 💡 Best Practices

1. **Make one change at a time** - Easier to debug
2. **Test after each change** - Verify it works
3. **Document your changes** - Add comments in config.py
4. **Keep backups** - Copy config.py before major changes
5. **Use version control** - Git commit after successful changes

**Example documentation:**

```python
# config.py

# Added 2024-10-18: User feedback - don't flag "bro"
INFORMAL_EXPRESSIONS = {
    # ... existing ...
    'bro',  # User feedback: common casual term
}

# Added 2024-10-18: User feedback - 5 min too long
COOLDOWN_SECONDS = 180  # Changed from 300 (user feedback)
```

---

## 🆘 Troubleshooting

### Syntax Error After Edit

**Error:** Bot won't start after editing config.py

**Fix:**

```bash
# Check Python syntax
python3 -m py_compile config.py

# If errors, review your changes
# Common issues:
# - Missing comma in sets/lists
# - Unclosed quotes
# - Mismatched brackets
```

### Changes Not Taking Effect

**Issue:** Made changes but bot still behaves the same

**Fix:**

```bash
# Restart bot
./manage_startup.sh restart

# Verify it restarted
./manage_startup.sh status

# Check if correct file
pwd  # Should be in bot directory
```

### Informal Expressions Not Working

**Issue:** Added word to `INFORMAL_EXPRESSIONS` but still flagged

**Fix:**

```python
# Check spelling exactly matches
INFORMAL_EXPRESSIONS = {
    'omg',  # Must be lowercase
    'lol',  # Must be exact
}

# Try adding variations:
INFORMAL_EXPRESSIONS = {
    'omg', 'OMG',  # Both cases
}
```

---

## 📚 Reference

### Config File Structure

```python
# config.py

# 1. ERROR FILTERING
INFORMAL_EXPRESSIONS = {...}
IMPORTANT_ERROR_TYPES = [...]

# 2. THRESHOLDS
INSIGHT_THRESHOLDS = {...}
LONG_SENTENCE_THRESHOLD = 20

# 3. LIMITS
MAX_ERRORS_DETAILED = 3
MAX_SUGGESTIONS_PER_ERROR = 4

# 4. TIMING
COOLDOWN_SECONDS = 300

# 5. APPEARANCE
COLORS = {...}
ERROR_TYPE_EMOJIS = {...}
MESSAGES = {...}

# 6. ANALYSIS
READABILITY_LEVELS = [...]
TONE_INDICATORS = {...}
PROFESSIONAL_REPLACEMENTS = {...}

# 7. CUSTOM LOGIC
def custom_should_ignore(...):
    # Your custom filtering
    pass
```

---

**Happy customizing!** 🎨

If you have questions or need help with specific customizations, check the logs or test incrementally.
