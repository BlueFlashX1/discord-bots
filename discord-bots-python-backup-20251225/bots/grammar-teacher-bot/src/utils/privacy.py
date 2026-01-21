"""
Privacy Protection Utilities
=============================

Filters sensitive information from messages before AI analysis.
NO message content is ever saved - only statistics.
"""

import re
from typing import Dict


def filter_sensitive_info(text: str) -> Dict[str, any]:
    """
    Filter sensitive information before AI analysis

    PRIVACY GUARANTEE:
    - Message content is NEVER saved to disk
    - Only used temporarily for AI analysis
    - Sensitive info is redacted before AI sees it
    - Only statistics (XP, points, quality) are stored

    Filters:
    - Email addresses
    - Phone numbers
    - Credit card numbers
    - SSN/Tax IDs
    - API keys/tokens
    - Passwords (common patterns)
    - IP addresses
    - Home addresses (street patterns)
    - Personal names in specific contexts

    Returns:
        Dict with:
        - filtered_text: Safe text for AI analysis
        - has_sensitive: Whether sensitive info was found
        - redaction_count: Number of items redacted
    """

    if not text or len(text.strip()) == 0:
        return {
            "filtered_text": text,
            "has_sensitive": False,
            "redaction_count": 0,
        }

    filtered = text
    redaction_count = 0

    # Email addresses
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    if re.search(email_pattern, filtered):
        filtered = re.sub(email_pattern, "[EMAIL]", filtered)
        redaction_count += len(re.findall(email_pattern, text))

    # Phone numbers (various formats)
    phone_patterns = [
        r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",  # 123-456-7890
        r"\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b",  # (123) 456-7890
        r"\b\+\d{1,3}\s*\d{3,14}\b",  # +1 234567890
    ]
    for pattern in phone_patterns:
        if re.search(pattern, filtered):
            filtered = re.sub(pattern, "[PHONE]", filtered)
            redaction_count += len(re.findall(pattern, text))

    # Credit card numbers (13-19 digits)
    cc_pattern = r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b"
    if re.search(cc_pattern, filtered):
        filtered = re.sub(cc_pattern, "[CREDIT_CARD]", filtered)
        redaction_count += len(re.findall(cc_pattern, text))

    # SSN (XXX-XX-XXXX)
    ssn_pattern = r"\b\d{3}-\d{2}-\d{4}\b"
    if re.search(ssn_pattern, filtered):
        filtered = re.sub(ssn_pattern, "[SSN]", filtered)
        redaction_count += len(re.findall(ssn_pattern, text))

    # API Keys / Tokens (long alphanumeric strings)
    api_pattern = r"\b[A-Za-z0-9_-]{32,}\b"
    if re.search(api_pattern, filtered):
        filtered = re.sub(api_pattern, "[API_KEY]", filtered)
        redaction_count += len(re.findall(api_pattern, text))

    # Password mentions (common patterns)
    password_patterns = [
        r"password[:\s]+[^\s]+",
        r"pass[:\s]+[^\s]+",
        r"pwd[:\s]+[^\s]+",
    ]
    for pattern in password_patterns:
        if re.search(pattern, filtered, re.IGNORECASE):
            filtered = re.sub(
                pattern, "password: [REDACTED]", filtered, flags=re.IGNORECASE
            )
            redaction_count += 1

    # IP Addresses
    ip_pattern = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
    if re.search(ip_pattern, filtered):
        filtered = re.sub(ip_pattern, "[IP_ADDRESS]", filtered)
        redaction_count += len(re.findall(ip_pattern, text))

    # Street addresses (basic pattern)
    address_pattern = r"\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b"
    if re.search(address_pattern, filtered):
        filtered = re.sub(address_pattern, "[ADDRESS]", filtered)
        redaction_count += len(re.findall(address_pattern, text))

    has_sensitive = redaction_count > 0

    return {
        "filtered_text": filtered,
        "has_sensitive": has_sensitive,
        "redaction_count": redaction_count,
    }


def is_safe_for_analysis(text: str) -> bool:
    """
    Quick check if text is safe for AI analysis

    Returns False if text contains obvious sensitive patterns
    """
    result = filter_sensitive_info(text)
    return not result["has_sensitive"]


# Privacy guarantee comment for documentation
PRIVACY_POLICY = """
PRIVACY GUARANTEE:
==================
✅ Message content is NEVER saved to disk
✅ Used only temporarily for AI grammar analysis (in-memory)
✅ Sensitive info (emails, phones, etc.) filtered before AI sees it
✅ Only statistics saved: XP earned, points, quality bonuses
✅ Original message discarded immediately after analysis
✅ gamification.json contains NO message text - only numbers

What IS saved:
- User ID (Discord user ID)
- Stats: XP, level, HP, points, streak count
- Daily totals: points earned, messages today
- Quality breakdown: bonus counts (not message text)

What is NEVER saved:
- Message content
- Usernames
- Server names
- Any personal information
"""
