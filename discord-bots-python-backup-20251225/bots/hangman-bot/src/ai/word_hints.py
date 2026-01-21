"""AI-powered word hints and definitions using OpenAI"""

import os
import time
from collections import defaultdict

from dotenv import load_dotenv

load_dotenv()
# Use shared OPENAI_API_KEY from Grammar Bot or dedicated one
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

AI_AVAILABLE = OPENAI_API_KEY is not None

# Rate limiting for OpenAI API
_openai_request_times = []
_openai_cache = {}  # Cache word hints to reduce API calls
MAX_REQUESTS_PER_MINUTE = 20  # OpenAI rate limit
CACHE_TTL = 3600  # Cache hints for 1 hour

if AI_AVAILABLE:
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)


def _check_openai_rate_limit() -> bool:
    """Check if we can make an OpenAI API request"""
    now = time.time()
    minute_ago = now - 60

    # Remove old requests outside the window
    global _openai_request_times
    _openai_request_times = [t for t in _openai_request_times if t > minute_ago]

    return len(_openai_request_times) < MAX_REQUESTS_PER_MINUTE


def _record_openai_request():
    """Record an OpenAI API request for rate limiting"""
    _openai_request_times.append(time.time())


def get_word_hint(word: str) -> dict:
    """
    Get AI-powered hints for a word including definition, part of speech, and examples

    Args:
        word: The word to get hints for

    Returns:
        dict with keys: 'definition', 'part_of_speech', 'hint', 'example'
    """
    if not AI_AVAILABLE:
        return {
            "definition": "AI hints unavailable",
            "part_of_speech": "Unknown",
            "hint": "Try guessing common letters!",
            "example": "",
        }

    # Check cache first
    word_key = word.lower()
    if word_key in _openai_cache:
        cached_data, cached_time = _openai_cache[word_key]
        if time.time() - cached_time < CACHE_TTL:
            return cached_data

    # Check rate limit
    if not _check_openai_rate_limit():
        return {
            "definition": "Rate limit reached",
            "part_of_speech": "Unknown",
            "hint": "Try guessing common letters!",
            "example": "",
        }

    try:
        _record_openai_request()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful word game hint provider. Provide concise, game-appropriate hints.",
                },
                {
                    "role": "user",
                    "content": f"""For the word "{word}", provide a JSON response with exactly these fields:
{{
  "definition": "A brief definition (one sentence, max 15 words)",
  "part_of_speech": "One of: Noun, Verb, Adjective, Adverb, or Other",
  "hint": "A helpful clue (max 20 words, don't reveal the word)",
  "example": "A short example sentence using the word"
}}

Return ONLY the JSON, no other text.""",
                },
            ],
            temperature=0.3,
            max_tokens=150,
        )

        import json

        content = response.choices[0].message.content.strip()

        # Parse JSON response
        result = json.loads(content)
        hint_data = {
            "definition": result.get("definition", ""),
            "part_of_speech": result.get("part_of_speech", "Unknown"),
            "hint": result.get("hint", ""),
            "example": result.get("example", ""),
        }

        # Cache the result
        _openai_cache[word_key] = (hint_data, time.time())

        # Clean up old cache entries (keep only last 100)
        if len(_openai_cache) > 100:
            # Remove oldest entries
            sorted_cache = sorted(
                _openai_cache.items(), key=lambda x: x[1][1]
            )
            _openai_cache.clear()
            _openai_cache.update(dict(sorted_cache[-100:]))

        return hint_data

    except Exception as e:
        print(f"[Error] Failed to get hints for '{word}': {e}")
        return {
            "definition": "Definition unavailable",
            "part_of_speech": "Unknown",
            "hint": "Try guessing common letters!",
            "example": "",
        }


def get_game_hint(word: str) -> str:
    """Get a concise hint for the game display"""
    hints = get_word_hint(word)
    return (
        f"📚 **{hints['part_of_speech']}**: {hints['definition']}\n"
        f"💡 **Hint**: {hints['hint']}"
    )
