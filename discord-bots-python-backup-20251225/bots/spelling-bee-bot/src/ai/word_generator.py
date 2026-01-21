"""AI-powered spelling bee word generator using OpenAI"""

import json
import random
from typing import Dict, List, Optional, Tuple

import openai

# Difficulty levels and their properties
DIFFICULTY_LEVELS = {
    "easy": {"min_length": 3, "max_length": 5, "multiplier": 1},
    "medium": {"min_length": 5, "max_length": 8, "multiplier": 2},
    "hard": {"min_length": 8, "max_length": 12, "multiplier": 3},
    "expert": {"min_length": 10, "max_length": 15, "multiplier": 4},
}

LETTER_FREQUENCIES = {
    "E": 11.0,
    "A": 8.2,
    "R": 7.8,
    "I": 7.0,
    "O": 7.5,
    "T": 9.1,
    "N": 6.7,
    "S": 6.3,
    "H": 6.1,
    "D": 4.3,
    "L": 4.0,
    "U": 2.8,
    "C": 2.8,
    "M": 2.4,
    "W": 2.4,
    "F": 2.2,
    "G": 2.0,
    "Y": 2.0,
    "P": 1.9,
    "B": 1.5,
    "V": 0.98,
    "K": 0.77,
    "X": 0.15,
    "Z": 0.07,
    "Q": 0.10,
    "J": 0.15,
}


class WordGenerator:
    """Generate random letters and validate words using AI"""

    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        """
        Initialize word generator with OpenAI API

        Args:
            api_key: OpenAI API key
            model: Model to use for word generation
        """
        self.api_key = api_key
        self.model = model
        openai.api_key = api_key
        self.word_cache: Dict[str, List[str]] = {}

    def generate_game_letters(
        self, num_letters: Optional[int] = None, seed: Optional[int] = None
    ) -> Tuple[str, int]:
        """
        Generate random letters weighted by English frequency

        Args:
            num_letters: Number of letters to generate. If None, randomly picks 5-12.
                        If specified, uses that count (capped at 3-12 range)
            seed: Optional seed for reproducibility

        Returns:
            Tuple of (letters_string, actual_count)
        """
        if seed is not None:
            random.seed(seed)

        # If num_letters not specified, randomly choose between 5 and 12
        if num_letters is None:
            num_letters = random.randint(5, 12)
        else:
            # Ensure num_letters is within reasonable bounds
            num_letters = max(3, min(num_letters, 12))

        # Weight letters by frequency
        letters = list(LETTER_FREQUENCIES.keys())
        weights = list(LETTER_FREQUENCIES.values())

        selected_letters = random.choices(letters, weights=weights, k=num_letters)
        return "".join(sorted(selected_letters)), num_letters

    async def generate_possible_words(
        self, letters: str, max_words: int = 20
    ) -> List[Dict[str, any]]:
        """
        Use AI to generate all possible words from given letters

        Args:
            letters: Available letters (e.g., "AEINRST")
            max_words: Maximum words to generate

        Returns:
            List of dicts with word, difficulty, and points
        """
        # Check cache first
        cache_key = "".join(sorted(letters.upper()))
        if cache_key in self.word_cache:
            return self.word_cache[cache_key]

        prompt = f"""Generate a list of valid English words that can be made
using ONLY the letters: {letters.upper()}

Rules:
- Each letter can only be used as many times as it appears in the set
- Must be real English words (no proper nouns, abbreviations, etc)
- Include words of various lengths (at least 3 letters minimum)
- Return ONLY valid dictionary words

Format your response as a JSON array of objects with this structure:
[
  {{
    "word": "WORD",
    "length": 4,
    "difficulty": "easy|medium|hard|expert"
  }},
  ...
]

Assign difficulty based on:
- easy: 3-5 letters, common words
- medium: 5-8 letters, moderately common
- hard: 8-10 letters, less common
- expert: 10+ letters, rare/technical words

Maximum {max_words} words."""

        try:
            response = await self._call_openai(prompt)
            words_data = self._parse_response(response)

            # Add point values based on difficulty
            for word_obj in words_data:
                difficulty = word_obj.get("difficulty", "easy")
                word_obj["points"] = DIFFICULTY_LEVELS[difficulty][
                    "multiplier"
                ] * word_obj.get("length", 1)

            # Cache the result
            self.word_cache[cache_key] = words_data
            return words_data[:max_words]

        except Exception as e:
            print(f"Error generating words: {e}")
            return []

    async def validate_word(
        self, word: str, letters: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate if a word can be made from given letters

        Args:
            word: Word to validate
            letters: Available letters

        Returns:
            Tuple of (is_valid, error_message)
        """
        word = word.upper()

        # Check if all letters are available
        available = list(letters.upper())
        for letter in word:
            if letter not in available:
                return False, f"Letter '{letter}' not in available letters"
            available.remove(letter)

        # Use AI to verify it's a real English word
        prompt = f"Is '{word}' a valid English dictionary word? Answer with only 'yes' or 'no'."

        try:
            response = await self._call_openai(prompt)
            is_valid = "yes" in response.lower()
            return is_valid, None if is_valid else f"'{word}' is not a valid word"
        except Exception as e:
            return False, f"Error validating word: {e}"

    async def calculate_difficulty(self, word: str) -> str:
        """
        Use AI to assess word difficulty for English learners

        Args:
            word: Word to assess

        Returns:
            Difficulty level (easy, medium, hard, expert)
        """
        prompt = f"""Assess the spelling difficulty of the English word '{word}'
for non-native speakers.

Consider:
- Common spelling rules it follows or breaks
- Pronunciation vs spelling disconnect
- Frequency in English

Return ONLY one of: easy, medium, hard, expert"""

        try:
            response = await self._call_openai(prompt)
            difficulty = response.strip().lower()
            if difficulty in DIFFICULTY_LEVELS:
                return difficulty
            return "medium"  # Default
        except Exception:
            return "medium"

    async def get_spelling_tips(self, word: str) -> str:
        """
        Get spelling tips and rules for a word

        Args:
            word: Word to get tips for

        Returns:
            Spelling tips and related rules
        """
        prompt = f"""Provide concise spelling tips for the English word '{word}'.

Include:
1. Main spelling rule or pattern it follows
2. Common misspellings to avoid
3. Memory tricks or mnemonics
4. Related words with similar patterns

Keep it brief (under 200 characters)."""

        try:
            response = await self._call_openai(prompt)
            return response.strip()
        except Exception:
            return "No tips available"

    async def analyze_misspellings(
        self, correct_word: str, misspelling: str
    ) -> Dict[str, str]:
        """
        Analyze why a word was misspelled

        Args:
            correct_word: The correct spelling
            misspelling: The incorrect attempt

        Returns:
            Analysis of the error
        """
        prompt = f"""Analyze this spelling error:
Correct: {correct_word}
Attempted: {misspelling}

Explain:
1. What rule or pattern was missed
2. Which letters were incorrect
3. Why this is a common mistake
4. How to remember the correct spelling

Be concise."""

        try:
            response = await self._call_openai(prompt)
            return {"error_type": "mismatch", "analysis": response.strip()}
        except Exception:
            return {"error_type": "unknown", "analysis": "Unable to analyze error"}

    async def get_word_definition(self, word: str) -> str:
        """
        Get a concise definition of a word from AI

        Args:
            word: Word to get definition for

        Returns:
            Brief definition suitable for Discord embed
        """
        prompt = (
            f"Provide a brief, one-sentence definition of the "
            f"English word '{word}'. "
            f"Keep it under 100 characters. "
            f"Respond only with the definition, no additional text."
        )

        try:
            response = await self._call_openai(prompt)
            definition = response.strip()
            # Ensure it's not too long
            if len(definition) > 150:
                definition = definition[:147] + "..."
            return definition
        except Exception as e:
            return f"Definition unavailable ({str(e)})"

    async def _call_openai(self, prompt: str) -> str:
        """
        Make API call to OpenAI

        Args:
            prompt: Prompt to send to API

        Returns:
            API response text
        """
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content

    def _parse_response(self, response: str) -> List[Dict]:
        """
        Parse JSON response from OpenAI

        Args:
            response: API response

        Returns:
            Parsed word data
        """
        try:
            # Extract JSON from response
            json_start = response.find("[")
            json_end = response.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass

        return []
