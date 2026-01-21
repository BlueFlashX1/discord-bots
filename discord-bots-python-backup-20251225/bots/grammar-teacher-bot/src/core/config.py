"""
Grammar Bot - Configuration and Customization
==============================================

This file contains all configurable settings for the grammar bot.
Edit this file to customize behavior, add rules, or modify filtering.
"""

# ============================================================================
# INFORMAL EXPRESSIONS WHITELIST
# ============================================================================
# Add or remove expressions that should NOT be flagged as errors
# Perfect for casual Discord chat!

INFORMAL_EXPRESSIONS = {
    # Thinking sounds
    "hmm",
    "hmmm",
    "hmmmm",
    "hmmmmm",
    "hmmmmmm",
    "umm",
    "ummm",
    "ummmm",
    "uhh",
    "uhhh",
    "uhhhh",
    "uh",
    "um",
    # Laughter
    "haha",
    "hahaha",
    "hahahaha",
    "lol",
    "lmao",
    "rofl",
    "lmfao",
    "hehe",
    "hehehe",
    # Emotional expressions
    "aww",
    "awww",
    "awwww",
    "yay",
    "yayyy",
    "yayyyy",
    "woah",
    "whoa",
    "oof",
    "ooof",
    # Informal yes/no
    "nah",
    "nope",
    "yep",
    "yeah",
    "yup",
    "ok",
    "okay",
    "okay",
    "okayy",
    # Common abbreviations
    "brb",
    "btw",
    "imo",
    "tbh",
    "afk",
    "omg",
    "omw",
    "idk",
    "nvm",
    "rn",
    "irl",
    "fr",
    "ngl",
    # Informal contractions (casual speech)
    "gonna",
    "wanna",
    "gotta",
    "kinda",
    "sorta",
    "dunno",
    "lemme",
    "gimme",
    # Internet slang
    "pls",
    "plz",
    "thx",
    "ty",
    "np",
}

# ============================================================================
# ERROR FILTERING RULES
# ============================================================================

# Error types to check (add/remove as needed)
IMPORTANT_ERROR_TYPES = [
    "grammar",
    "misspelling",
    "typographical",
    "punctuation",
    "capitalization",
    "style",
]

# Minimum thresholds for showing insights
INSIGHT_THRESHOLDS = {
    "capitalization": 2,  # Show tip after 2+ capitalization errors
    "punctuation": 2,  # Show tip after 2+ punctuation errors
    "grammar": 2,  # Show tip after 2+ grammar errors
    "spelling": 2,  # Show tip after 2+ spelling errors
    "style": 2,  # Show tip after 2+ style issues
}

# Minimum word count for "long sentence" warning
LONG_SENTENCE_THRESHOLD = 20

# Minimum word count for readability analysis
MIN_READABILITY_WORDS = 3

# ============================================================================
# AUTO-DETECTION SETTINGS
# ============================================================================

# Cooldown between auto-corrections per user (seconds)
# This is PER-USER cooldown (fair for everyone)
# Use /check for instant private corrections anytime!
COOLDOWN_SECONDS = 300  # 5 minutes = 300 seconds

# Maximum errors to show in detail (rest shown as count)
MAX_ERRORS_DETAILED = 3

# Maximum suggestions per error
MAX_SUGGESTIONS_PER_ERROR = 4

# ============================================================================
# EMBED COLORS (Discord color codes)
# ============================================================================

COLORS = {
    "auto_correction": 0x5865F2,  # Discord Blurple
    "manual_check": 0xFEE75C,  # Discord Yellow
    "perfect": 0x57F287,  # Discord Green
    "error": 0xED4245,  # Discord Red
    "info": 0x5865F2,  # Discord Blurple
}

# ============================================================================
# READABILITY SCORING
# ============================================================================

READABILITY_LEVELS = [
    (90, "Very Easy (5th grade)", "🟢"),
    (80, "Easy (6th grade)", "🟢"),
    (70, "Fairly Easy (7th grade)", "🟡"),
    (60, "Standard (8-9th grade)", "🟡"),
    (50, "Fairly Difficult (10-12th grade)", "🟠"),
    (30, "Difficult (College)", "🟠"),
    (0, "Very Difficult (Professional)", "🔴"),
]

# ============================================================================
# TONE INDICATORS
# ============================================================================

TONE_INDICATORS = {
    "formal": ["please", "kindly", "respectfully", "sincerely", "regards"],
    "casual": ["yeah", "yep", "nah", "gonna", "wanna", "lol", "haha"],
    "urgent": ["asap", "urgent", "immediately", "quick", "hurry", "now"],
    "polite": ["thank", "appreciate", "grateful", "please", "kindly"],
    "direct": ["must", "need", "should", "have to", "required"],
}

# ============================================================================
# SENTENCE VARIATION SETTINGS
# ============================================================================

# Maximum number of sentence variations to show
MAX_SENTENCE_VARIATIONS = 4

# Word replacements for professional variation
PROFESSIONAL_REPLACEMENTS = {
    "good": "excellent",
    "bad": "poor",
    "big": "significant",
    "small": "minor",
    "nice": "pleasant",
    "help": "assist",
    "show": "demonstrate",
    "use": "utilize",
    "get": "obtain",
    "make": "create",
}

# ============================================================================
# CUSTOM RULES (Advanced)
# ============================================================================
# Add custom filtering logic here


def custom_should_ignore(error_text: str, match, original_text: str) -> bool:
    """
    Add your custom filtering rules here.
    Return True to ignore an error, False to show it.

    Args:
        error_text: The text that was flagged as error
        match: The LanguageTool match object
        original_text: The full original message

    Returns:
        bool: True to ignore, False to show
    """
    # Example: Ignore all errors in code blocks
    if "```" in original_text:
        return True

    # Example: Ignore errors in URLs
    if "http://" in error_text or "https://" in error_text:
        return True

    # Add your custom rules here

    return False


# ============================================================================
# MESSAGES & RESPONSES
# ============================================================================

MESSAGES = {
    "auto_correction_title": "✨ Grammar Analysis & Suggestions",
    "manual_check_title": "✨ Grammar Analysis Results",
    "perfect_title": "✨ Excellent Writing!",
    "perfect_description": "No grammar issues detected. Your text is clear and well-written!",
    "footer_auto": "✨ Premium Grammar Analysis • Only you see this • Dismiss anytime",
    "footer_manual": "✨ Advanced Grammar Analysis",
    "footer_perfect": "✅ Manual Check Complete",
}

# ============================================================================
# EMOJI MAPPINGS
# ============================================================================

ERROR_TYPE_EMOJIS = {
    "grammar": "📖",
    "misspelling": "✏️",
    "typographical": "⌨️",
    "punctuation": "🔤",
    "capitalization": "🔠",
    "style": "🎨",
}

VARIATION_EMOJIS = {
    "formal": "📘",
    "concise": "✂️",
    "professional": "💼",
    "active": "⚡",
    "question": "❓",
}

# ============================================================================
# FILE PATHS
# ============================================================================

DATA_DIR = "data"
STATS_FILE = "user_stats.json"
SETTINGS_FILE = "user_settings.json"
LOGS_DIR = "logs"
