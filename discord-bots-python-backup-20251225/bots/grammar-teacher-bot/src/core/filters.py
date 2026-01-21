"""
Grammar Filtering Module
========================

Contains all logic for filtering and validating grammar errors.
Easily extend by modifying the functions below.
"""

from src.core.config import (IMPORTANT_ERROR_TYPES, INFORMAL_EXPRESSIONS,
                             custom_should_ignore)


def should_ignore_error(match, original_text):
    """
    Determine if a grammar error should be ignored.

    Args:
        match: LanguageTool match object
        original_text: The full original text

    Returns:
        bool: True if error should be ignored, False otherwise
    """
    error_text = match.context[match.offset : match.offset + match.errorLength].lower()

    # Check informal expressions whitelist
    if error_text in INFORMAL_EXPRESSIONS:
        return True

    # Check for repeated letters (emphasis)
    if _is_repeated_letter_emphasis(error_text):
        return True

    # Ignore single letter misspellings (like "k" for okay)
    if len(error_text) == 1 and match.ruleIssueType == "misspelling":
        return True

    # Apply custom rules from config
    if custom_should_ignore(error_text, match, original_text):
        return True

    return False


def _is_repeated_letter_emphasis(text):
    """
    Check if text is likely repeated letters for emphasis.
    E.g., "sooooo", "yesss", "noooo"

    Args:
        text: Text to check

    Returns:
        bool: True if repeated letter emphasis
    """
    if len(text) < 3 or len(set(text)) > 3:
        return False

    # Count character frequencies
    char_counts = {}
    for char in text:
        char_counts[char] = char_counts.get(char, 0) + 1

    max_count = max(char_counts.values())

    # If mostly one letter repeated, it's emphasis
    return max_count >= len(text) - 2


def filter_important_matches(matches, original_text):
    """
    Filter matches to only important errors.

    Args:
        matches: List of LanguageTool matches
        original_text: The original text being checked

    Returns:
        list: Filtered list of important matches
    """
    return [
        m
        for m in matches
        if m.ruleIssueType in IMPORTANT_ERROR_TYPES
        and not should_ignore_error(m, original_text)
    ]
        for m in matches
        if m.ruleIssueType in IMPORTANT_ERROR_TYPES
        and not should_ignore_error(m, original_text)
    ]
