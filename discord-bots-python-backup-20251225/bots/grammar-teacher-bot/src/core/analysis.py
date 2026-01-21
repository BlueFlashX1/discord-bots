"""
Grammar Analysis Module
=======================

Contains all analysis functions for grammar, readability, tone, etc.
"""

from src.core.config import (
    INSIGHT_THRESHOLDS,
    LONG_SENTENCE_THRESHOLD,
    MAX_SENTENCE_VARIATIONS,
    MIN_READABILITY_WORDS,
    PROFESSIONAL_REPLACEMENTS,
    READABILITY_LEVELS,
    TONE_INDICATORS,
)

try:
    import textstat

    READABILITY_AVAILABLE = True
except ImportError:
    READABILITY_AVAILABLE = False


def generate_sentence_variations(original_text, corrected_text, matches):
    """
    Generate multiple sentence variations with different tones and styles.

    Args:
        original_text: Original message
        corrected_text: Corrected version
        matches: Grammar error matches

    Returns:
        list: List of variation dictionaries
    """
    variations = []

    # Variation 1: Standard correction
    variations.append(
        {
            "title": "📘 Standard (Formal)",
            "text": corrected_text,
            "description": "Professional and grammatically correct",
        }
    )

    # Variation 2: Concise version
    if len(corrected_text.split()) > 10:
        words = corrected_text.split()
        concise = " ".join(words[: max(5, len(words) // 2)])
        if not concise.endswith("."):
            concise += "..."
        variations.append(
            {
                "title": "✂️ Concise",
                "text": concise,
                "description": "Shorter and more direct",
            }
        )

    # Variation 3: Professional enhancement
    enhanced = _enhance_vocabulary(corrected_text)
    if enhanced != corrected_text:
        variations.append(
            {
                "title": "💼 Professional",
                "text": enhanced,
                "description": "More sophisticated vocabulary",
            }
        )

    # Variation 4: Active voice
    if any(word in corrected_text for word in ["was", "were", "been"]):
        active = corrected_text.replace(" was ", " is ")
        active = active.replace(" were ", " are ")
        variations.append(
            {
                "title": "⚡ Active Voice",
                "text": active,
                "description": "More dynamic and engaging",
            }
        )

    # Variation 5: Question format
    if not corrected_text.endswith("?") and len(corrected_text.split()) > 5:
        question = corrected_text.rstrip(".") + "?"
        variations.append(
            {
                "title": "❓ Question Form",
                "text": question,
                "description": "Engage reader with inquiry",
            }
        )

    return variations[:MAX_SENTENCE_VARIATIONS]


def _enhance_vocabulary(text):
    """Replace basic words with professional alternatives."""
    enhanced = text
    formal_words = ["please", "kindly", "respectfully"]

    if any(word in text.lower() for word in formal_words):
        return text  # Already formal

    for old, new in PROFESSIONAL_REPLACEMENTS.items():
        if f" {old} " in enhanced.lower():
            enhanced = enhanced.lower().replace(f" {old} ", f" {new} ")
            enhanced = enhanced[0].upper() + enhanced[1:]
            break

    return enhanced


def analyze_readability(text):
    """
    Analyze text readability and complexity.

    Args:
        text: Text to analyze

    Returns:
        dict: Readability info or None
    """
    if not READABILITY_AVAILABLE:
        return None

    try:
        word_count = len(text.split())
        if word_count < MIN_READABILITY_WORDS:
            return None

        score = textstat.flesch_reading_ease(text)
        grade = textstat.flesch_kincaid_grade(text)

        # Cap grade for very simple sentences
        if word_count <= 5 and grade < 3:
            grade = max(1.0, grade)

        # Find appropriate level
        level = "Standard"
        emoji = "🟡"
        for min_score, level_text, level_emoji in READABILITY_LEVELS:
            if score >= min_score:
                level = level_text
                emoji = level_emoji
                break

        return {
            "score": round(score, 1),
            "level": level,
            "emoji": emoji,
            "grade": round(grade, 1),
        }
    except Exception:
        return None


def get_tone_analysis(text):
    """
    Analyze the tone and style of text.

    Args:
        text: Text to analyze

    Returns:
        list: Detected tones
    """
    text_lower = text.lower()
    detected_tones = []

    for tone, indicators in TONE_INDICATORS.items():
        if any(indicator in text_lower for indicator in indicators):
            detected_tones.append(tone.title())

    return detected_tones if detected_tones else ["Neutral"]


def get_grammar_insights(matches, original_text):
    """
    Provide smart grammar insights based on errors found.

    Args:
        matches: Grammar error matches
        original_text: Original text

    Returns:
        list: List of insight strings
    """
    insights = []
    error_types = {}
    error_messages = []
    word_count = len(original_text.split())

    # Count error types
    for match in matches:
        error_type = match.ruleIssueType
        error_types[error_type] = error_types.get(error_type, 0) + 1
        error_messages.append(match.message.lower())

    # Generate context-aware insights
    cap_count = error_types.get("capitalization", 0)
    if cap_count >= INSIGHT_THRESHOLDS["capitalization"]:
        insights.append(
            "💡 **Capitalization**: Remember to capitalize 'I' and proper nouns"
        )
    elif cap_count == 1:
        if any("'i'" in msg or "pronoun" in msg for msg in error_messages):
            insights.append(
                "💡 **Capitalization**: The pronoun 'I' is always capitalized"
            )

    if error_types.get("punctuation", 0) >= INSIGHT_THRESHOLDS["punctuation"]:
        insights.append("💡 **Punctuation**: Review sentence endings and comma usage")

    if error_types.get("grammar", 0) >= INSIGHT_THRESHOLDS["grammar"]:
        insights.append("💡 **Grammar**: Check subject-verb agreement and tense")

    if error_types.get("misspelling", 0) >= INSIGHT_THRESHOLDS["spelling"]:
        insights.append("💡 **Spelling**: Consider enabling spell-check while typing")

    # Long sentence warning (only if actually long)
    if word_count >= LONG_SENTENCE_THRESHOLD:
        if any("sentence" in msg and "long" in msg for msg in error_messages):
            insights.append(
                "💡 **Clarity**: Try breaking long sentences into shorter ones"
            )

    if error_types.get("style", 0) >= INSIGHT_THRESHOLDS["style"]:
        insights.append("💡 **Style**: Consider more precise or varied word choices")

    return insights
