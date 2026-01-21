"""
Grammar Teacher Bot - Help users improve their writing!

Features:
- Grammar and spelling checks (English only)
- Vocabulary building
- Writing tips and quizzes
- Progress tracking
- PRIVATE responses (only you see the corrections!)
"""

import json
import os
import random
from datetime import datetime
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv

# Try to import optional libraries
try:
    import language_tool_python

    GRAMMAR_CHECK_AVAILABLE = True
except ImportError:
    GRAMMAR_CHECK_AVAILABLE = False
    print("⚠️  language-tool-python not installed. Grammar checking disabled.")
    print("   Install with: pip install language-tool-python")

try:
    import textstat

    READABILITY_AVAILABLE = True
except ImportError:
    READABILITY_AVAILABLE = False
    print("⚠️  textstat not installed. Readability analysis disabled.")
    print("   Install with: pip install textstat")

# Load environment
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN_GRAMMAR") or os.getenv("BOT_TOKEN_1")

# Bot setup with both prefix and slash commands
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(
    command_prefix="!",
    intents=intents,
    description="📚 Grammar Teacher Bot - Your friendly writing assistant!",
)

# Initialize grammar checker if available
if GRAMMAR_CHECK_AVAILABLE:
    tool = language_tool_python.LanguageTool("en-US")

# Data storage
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
STATS_FILE = DATA_DIR / "user_stats.json"

# ============================================================================
# DATA MANAGEMENT
# ============================================================================


def load_stats():
    """Load user statistics"""
    if STATS_FILE.exists():
        with open(STATS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_stats(stats):
    """Save user statistics"""
    with open(STATS_FILE, "w") as f:
        json.dump(stats, f, indent=2)


def update_user_stats(user_id, stat_type, value=1):
    """Update user statistics"""
    stats = load_stats()
    user_id = str(user_id)

    if user_id not in stats:
        stats[user_id] = {
            "checks_performed": 0,
            "errors_found": 0,
            "quizzes_completed": 0,
            "correct_answers": 0,
            "words_learned": 0,
            "last_active": None,
        }

    stats[user_id][stat_type] = stats[user_id].get(stat_type, 0) + value
    stats[user_id]["last_active"] = datetime.now().isoformat()
    save_stats(stats)
    return stats[user_id]


# ============================================================================
# WORD OF THE DAY DATA
# ============================================================================

WORDS_OF_DAY = [
    {
        "word": "Serendipity",
        "definition": "Finding something good without looking for it",
        "example": "Meeting my best friend was pure serendipity.",
        "synonyms": ["chance", "luck", "fortune"],
    },
    {
        "word": "Eloquent",
        "definition": "Fluent or persuasive in speaking or writing",
        "example": "Her eloquent speech moved the audience to tears.",
        "synonyms": ["articulate", "expressive", "well-spoken"],
    },
    {
        "word": "Ubiquitous",
        "definition": "Present, appearing, or found everywhere",
        "example": "Smartphones have become ubiquitous in modern society.",
        "synonyms": ["omnipresent", "pervasive", "universal"],
    },
    {
        "word": "Ephemeral",
        "definition": "Lasting for a very short time",
        "example": "The beauty of cherry blossoms is ephemeral.",
        "synonyms": ["fleeting", "transient", "temporary"],
    },
    {
        "word": "Pragmatic",
        "definition": "Dealing with things sensibly and realistically",
        "example": "We need to take a pragmatic approach to this problem.",
        "synonyms": ["practical", "realistic", "sensible"],
    },
    {
        "word": "Verbose",
        "definition": "Using more words than needed",
        "example": "His verbose writing style made the essay hard to read.",
        "synonyms": ["wordy", "long-winded", "rambling"],
    },
    {
        "word": "Ambiguous",
        "definition": "Open to more than one interpretation; unclear",
        "example": "The contract's ambiguous wording led to confusion.",
        "synonyms": ["unclear", "vague", "uncertain"],
    },
    {
        "word": "Resilient",
        "definition": "Able to recover quickly from difficulties",
        "example": "She showed resilient spirit after the setback.",
        "synonyms": ["tough", "strong", "adaptable"],
    },
]

GRAMMAR_TIPS = [
    "**Their vs. They're vs. There:**\n- Their = possessive (their house)\n- They're = they are (they're happy)\n- There = location (over there)",
    "**Your vs. You're:**\n- Your = possessive (your book)\n- You're = you are (you're awesome)",
    "**Its vs. It's:**\n- Its = possessive (its color)\n- It's = it is (it's raining)",
    "**Affect vs. Effect:**\n- Affect = verb (to influence)\n- Effect = noun (the result)\nTip: RAVEN = Remember Affect Verb, Effect Noun",
    "**Then vs. Than:**\n- Then = time (first this, then that)\n- Than = comparison (better than)",
    "**Comma Splice:**\nDon't join two independent clauses with just a comma.\n❌ I like pizza, I eat it daily.\n✅ I like pizza, and I eat it daily.\n✅ I like pizza. I eat it daily.",
    "**Subject-Verb Agreement:**\nSingular subjects take singular verbs.\n❌ The dogs runs fast.\n✅ The dogs run fast.\n✅ The dog runs fast.",
    "**Double Negatives:**\nAvoid using two negatives in the same clause.\n❌ I don't need no help.\n✅ I don't need any help.",
    "**Who vs. Whom:**\n- Who = subject (Who is there?)\n- Whom = object (To whom are you speaking?)\nTrick: If you can answer with he/she, use who. If him/her, use whom.",
]

COMMON_MISTAKES = [
    "**Could of / Should of / Would of** ❌\n✅ Could have / Should have / Would have\n(or: could've / should've / would've)",
    "**Alot** ❌\n✅ A lot (two words)\nTip: Think of 'a bunch' or 'a ton'",
    "**Loose vs. Lose:**\n- Loose = not tight (loose clothing)\n- Lose = to be defeated or misplace",
    "**Accept vs. Except:**\n- Accept = to receive (I accept your gift)\n- Except = excluding (everyone except me)",
    "**Literally:**\nDon't use it for emphasis when you mean figuratively.\n❌ I literally died laughing.\n✅ I laughed so hard!",
    "**Less vs. Fewer:**\n- Less = uncountable (less water)\n- Fewer = countable (fewer apples)",
    "**Me, Myself, and I:**\n- I = subject (I went to the store)\n- Me = object (She gave it to me)\n- Myself = reflexive (I hurt myself)\n❌ John and myself went\n✅ John and I went",
]

QUIZ_QUESTIONS = [
    {
        "question": "Which is correct?",
        "options": [
            "Their going to the park",
            "They're going to the park",
            "There going to the park",
        ],
        "correct": 1,
        "explanation": "They're = They are. 'They are going to the park.'",
    },
    {
        "question": "Choose the correct sentence:",
        "options": [
            "Me and John went to school",
            "John and me went to school",
            "John and I went to school",
        ],
        "correct": 2,
        "explanation": "Use 'I' as the subject. Remove 'John and' - you wouldn't say 'Me went to school.'",
    },
    {
        "question": "Which is grammatically correct?",
        "options": [
            "Your really smart!",
            "You're really smart!",
            "Youre really smart!",
        ],
        "correct": 1,
        "explanation": "You're = You are. 'You are really smart!'",
    },
    {
        "question": "Pick the right word:",
        "options": [
            "The dog wagged its tail",
            "The dog wagged it's tail",
            "The dog wagged its' tail",
        ],
        "correct": 0,
        "explanation": "Its (no apostrophe) = possessive. It's = it is.",
    },
    {
        "question": "Which sentence is correct?",
        "options": [
            "I could of done better",
            "I could have done better",
            "I could've of done better",
        ],
        "correct": 1,
        "explanation": "'Could have' or 'could've' is correct. 'Could of' is incorrect.",
    },
]

# ============================================================================
# BOT EVENTS
# ============================================================================


@bot.event
async def on_ready():
    """Bot startup"""
    print(f"✅ {bot.user} is online!")
    print(
        f'📚 Grammar checking: {"Enabled" if GRAMMAR_CHECK_AVAILABLE else "Disabled"}'
    )
    print(
        f'📊 Readability analysis: {"Enabled" if READABILITY_AVAILABLE else "Disabled"}'
    )

    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        print(f"✅ Synced {len(synced)} slash commands")
    except Exception as e:
        print(f"❌ Failed to sync commands: {e}")

    await bot.change_presence(activity=discord.Game(name="/check | Grammar Teacher 📚"))


# ============================================================================
# SLASH COMMANDS (PRIVATE RESPONSES)
# ============================================================================


@bot.tree.command(
    name="check", description="Check grammar and spelling (only you see the result!)"
)
@app_commands.describe(text="The text you want to check")
async def slash_check(interaction: discord.Interaction, text: str):
    """Check grammar - PRIVATE response (ephemeral)"""

    if not GRAMMAR_CHECK_AVAILABLE:
        await interaction.response.send_message(
            "❌ Grammar checking is not available!\n"
            "Install with: `pip install language-tool-python`",
            ephemeral=True,
        )
        return

    # Defer response (processing might take a moment)
    await interaction.response.defer(ephemeral=True)

    try:
        # Check the text
        matches = tool.check(text)

        # Update stats
        update_user_stats(interaction.user.id, "checks_performed")
        if matches:
            update_user_stats(interaction.user.id, "errors_found", len(matches))

        # Create response embed
        if not matches:
            embed = discord.Embed(
                title="✅ Perfect Grammar!",
                description="No errors found in your text!",
                color=0x2ECC71,
            )
            embed.add_field(name="Original Text", value=text[:1000], inline=False)
        else:
            embed = discord.Embed(
                title=f"📝 Found {len(matches)} Error{'s' if len(matches) > 1 else ''}",
                description="Here's what I found:",
                color=0xE74C3C,
            )

            # Show errors (limit to first 5)
            for i, match in enumerate(matches[:5], 1):
                error_context = match.context
                suggestions = (
                    ", ".join(match.replacements[:3])
                    if match.replacements
                    else "No suggestion"
                )

                embed.add_field(
                    name=f"Error {i}: {match.message[:100]}",
                    value=f"**Context:** {error_context}\n**Suggestion:** {suggestions}",
                    inline=False,
                )

            if len(matches) > 5:
                embed.add_field(
                    name="📋 More Errors",
                    value=f"+ {len(matches) - 5} more error(s) found",
                    inline=False,
                )

            # Add corrected version
            corrected = tool.correct(text)
            if corrected != text and len(corrected) <= 1000:
                embed.add_field(
                    name="✨ Suggested Correction", value=corrected, inline=False
                )

        # Add readability if available
        if READABILITY_AVAILABLE and len(text.split()) > 3:
            grade = textstat.flesch_reading_ease(text)
            if grade >= 90:
                level = "Very Easy"
            elif grade >= 80:
                level = "Easy"
            elif grade >= 70:
                level = "Fairly Easy"
            elif grade >= 60:
                level = "Standard"
            elif grade >= 50:
                level = "Fairly Difficult"
            elif grade >= 30:
                level = "Difficult"
            else:
                level = "Very Difficult"

            embed.set_footer(
                text=f"Readability: {level} (Score: {grade:.1f}) • English (US)"
            )
        else:
            embed.set_footer(text="Grammar checked for English (US)")

        # Send PRIVATE response (only user sees it)
        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ An error occurred while checking: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="improve", description="Get suggestions to improve your writing (private)"
)
@app_commands.describe(text="The text you want to improve")
async def slash_improve(interaction: discord.Interaction, text: str):
    """Get writing improvement suggestions - PRIVATE"""

    await interaction.response.defer(ephemeral=True)

    suggestions = []

    # Check length
    words = text.split()
    if len(words) > 50:
        suggestions.append(
            "📏 **Length:** Consider breaking this into shorter sentences for clarity."
        )

    # Check for passive voice (simple detection)
    passive_indicators = ["was", "were", "been", "being", "is", "are", "am"]
    passive_count = sum(1 for word in words if word.lower() in passive_indicators)
    if passive_count > len(words) * 0.1:
        suggestions.append(
            "🔄 **Passive Voice:** Try using more active voice for stronger writing."
        )

    # Check for overused words
    word_freq = {}
    for word in words:
        word_lower = word.lower().strip(".,!?")
        if len(word_lower) > 4:
            word_freq[word_lower] = word_freq.get(word_lower, 0) + 1

    overused = [word for word, count in word_freq.items() if count > 3]
    if overused:
        suggestions.append(
            f"🔁 **Repetition:** The word(s) '{', '.join(overused[:3])}' appear frequently. Consider synonyms."
        )

    # Check sentence variety
    sentences = text.split(".")
    avg_length = sum(len(s.split()) for s in sentences if s.strip()) / max(
        len([s for s in sentences if s.strip()]), 1
    )
    if avg_length > 20:
        suggestions.append(
            "📝 **Sentence Length:** Your sentences are quite long. Try varying sentence length."
        )

    embed = discord.Embed(title="✨ Writing Improvement Suggestions", color=0x3498DB)

    if suggestions:
        for i, suggestion in enumerate(suggestions, 1):
            embed.add_field(name=f"Tip {i}", value=suggestion, inline=False)
    else:
        embed.description = "✅ Your writing looks good! No major suggestions."

    if READABILITY_AVAILABLE and len(words) > 3:
        grade_level = textstat.flesch_kincaid_grade(text)
        embed.add_field(
            name="📊 Reading Grade Level",
            value=f"Grade {grade_level:.1f}",
            inline=False,
        )

    embed.set_footer(text="Only you can see this • English (US)")

    await interaction.followup.send(embed=embed, ephemeral=True)


@bot.tree.command(name="wordofday", description="Learn a new word today!")
async def slash_wordofday(interaction: discord.Interaction):
    """Get word of the day"""

    day_of_year = datetime.now().timetuple().tm_yday
    word_data = WORDS_OF_DAY[day_of_year % len(WORDS_OF_DAY)]

    embed = discord.Embed(
        title=f"📚 Word of the Day: {word_data['word']}",
        color=0x9B59B6,
        timestamp=datetime.utcnow(),
    )

    embed.add_field(name="📖 Definition", value=word_data["definition"], inline=False)
    embed.add_field(
        name="💬 Example", value=f"*\"{word_data['example']}\"*", inline=False
    )
    embed.add_field(
        name="🔄 Synonyms", value=", ".join(word_data["synonyms"]), inline=False
    )
    embed.set_footer(text="Learn a new word every day!")

    update_user_stats(interaction.user.id, "words_learned")

    # This one can be public (it's educational for everyone)
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="tip", description="Get a random grammar tip")
async def slash_tip(interaction: discord.Interaction):
    """Get a grammar tip"""

    tip = random.choice(GRAMMAR_TIPS)

    embed = discord.Embed(title="💡 Grammar Tip", description=tip, color=0xF39C12)
    embed.set_footer(text="Practice makes perfect!")

    # Public (educational for everyone)
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="mistakes", description="Learn about common grammar mistakes")
async def slash_mistakes(interaction: discord.Interaction):
    """Common mistakes"""

    mistake = random.choice(COMMON_MISTAKES)

    embed = discord.Embed(
        title="⚠️ Common Mistake to Avoid", description=mistake, color=0xE74C3C
    )
    embed.set_footer(text="Learn from these common errors!")

    # Public (educational)
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="quiz", description="Take a grammar quiz!")
async def slash_quiz(interaction: discord.Interaction):
    """Interactive quiz"""

    question_data = random.choice(QUIZ_QUESTIONS)

    embed = discord.Embed(
        title="🧠 Grammar Quiz!", description=question_data["question"], color=0x3498DB
    )

    # Create buttons for answers
    class QuizView(discord.ui.View):
        def __init__(self, correct_answer, explanation, user_id):
            super().__init__(timeout=30)
            self.correct_answer = correct_answer
            self.explanation = explanation
            self.user_id = user_id
            self.answered = False

        async def create_buttons(self, options):
            emojis = ["🇦", "🇧", "🇨"]
            for i, option in enumerate(options):
                button = discord.ui.Button(
                    label=f"{chr(65+i)}: {option[:80]}",
                    emoji=emojis[i],
                    style=discord.ButtonStyle.primary,
                    custom_id=f"quiz_{i}",
                )
                button.callback = self.create_callback(i)
                self.add_item(button)

        def create_callback(self, answer_index):
            async def callback(button_interaction: discord.Interaction):
                # Only allow the original user to answer
                if button_interaction.user.id != self.user_id:
                    await button_interaction.response.send_message(
                        "❌ This quiz is for someone else! Use /quiz to start your own.",
                        ephemeral=True,
                    )
                    return

                if self.answered:
                    await button_interaction.response.send_message(
                        "❌ You already answered this quiz!", ephemeral=True
                    )
                    return

                self.answered = True

                # Check answer
                if answer_index == self.correct_answer:
                    result_embed = discord.Embed(
                        title="✅ Correct!", description="Great job!", color=0x2ECC71
                    )
                    update_user_stats(button_interaction.user.id, "quizzes_completed")
                    update_user_stats(button_interaction.user.id, "correct_answers")
                else:
                    result_embed = discord.Embed(
                        title="❌ Incorrect",
                        description=f"The correct answer was: **{chr(65+self.correct_answer)}**",
                        color=0xE74C3C,
                    )
                    update_user_stats(button_interaction.user.id, "quizzes_completed")

                result_embed.add_field(
                    name="💡 Explanation", value=self.explanation, inline=False
                )

                # Disable all buttons
                for item in self.children:
                    item.disabled = True

                await button_interaction.response.edit_message(view=self)
                await button_interaction.followup.send(
                    embed=result_embed, ephemeral=True
                )

            return callback

    view = QuizView(
        question_data["correct"], question_data["explanation"], interaction.user.id
    )
    await view.create_buttons(question_data["options"])

    for i, option in enumerate(question_data["options"]):
        embed.add_field(name=f"Option {chr(65+i)}", value=option, inline=False)

    embed.set_footer(text="Click a button to answer!")

    await interaction.response.send_message(embed=embed, view=view)


@bot.tree.command(name="stats", description="View your learning progress")
@app_commands.describe(user="User to check stats for (leave empty for yourself)")
async def slash_stats(interaction: discord.Interaction, user: discord.User = None):
    """View stats"""

    target = user or interaction.user
    stats = load_stats()
    user_stats = stats.get(str(target.id), {})

    if not user_stats:
        await interaction.response.send_message(
            f"📊 {target.mention} hasn't used the bot yet!", ephemeral=True
        )
        return

    embed = discord.Embed(
        title=f"📊 Learning Stats for {target.display_name}", color=0x3498DB
    )
    embed.set_thumbnail(
        url=target.avatar.url if target.avatar else target.default_avatar.url
    )

    embed.add_field(
        name="✅ Grammar Checks",
        value=f"{user_stats.get('checks_performed', 0)} checks\n{user_stats.get('errors_found', 0)} errors found",
        inline=True,
    )

    quizzes = user_stats.get("quizzes_completed", 0)
    correct = user_stats.get("correct_answers", 0)
    accuracy = (correct / quizzes * 100) if quizzes > 0 else 0

    embed.add_field(
        name="🧠 Quizzes",
        value=f"{quizzes} completed\n{accuracy:.1f}% accuracy",
        inline=True,
    )

    embed.add_field(
        name="📚 Words Learned",
        value=f"{user_stats.get('words_learned', 0)} words",
        inline=True,
    )

    if user_stats.get("last_active"):
        last_active = datetime.fromisoformat(user_stats["last_active"])
        embed.set_footer(text=f"Last active: {last_active.strftime('%Y-%m-%d %H:%M')}")

    # Show privately if checking your own stats, publicly if checking others
    ephemeral = target.id == interaction.user.id
    await interaction.response.send_message(embed=embed, ephemeral=ephemeral)


# ============================================================================
# ERROR HANDLING
# ============================================================================


@bot.tree.error
async def on_app_command_error(
    interaction: discord.Interaction, error: app_commands.AppCommandError
):
    """Handle slash command errors"""
    if isinstance(error, app_commands.CommandOnCooldown):
        await interaction.response.send_message(
            f"⏰ Slow down! Try again in {error.retry_after:.1f} seconds.",
            ephemeral=True,
        )
    else:
        print(f"Error: {error}")
        if not interaction.response.is_done():
            await interaction.response.send_message(
                "❌ An error occurred. Please try again.", ephemeral=True
            )
        else:
            await interaction.followup.send(
                "❌ An error occurred. Please try again.", ephemeral=True
            )


# ============================================================================
# RUN BOT
# ============================================================================

if __name__ == "__main__":
    if not TOKEN:
        print("❌ Error: No bot token found!")
        print("Add BOT_TOKEN_GRAMMAR to your .env file")
    else:
        print("🚀 Starting Grammar Teacher Bot...")
        print("📝 Commands are SLASH COMMANDS (type / to see them)")
        print("🔒 Corrections are PRIVATE (only the user sees them)")
        bot.run(TOKEN)
