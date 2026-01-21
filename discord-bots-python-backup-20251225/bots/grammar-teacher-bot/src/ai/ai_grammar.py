"""
AI-Powered Grammar Checker
===========================

Uses OpenAI GPT for advanced grammar correction and analysis.
Much more accurate than traditional rule-based checkers.
"""

import os
from typing import Dict, List

from dotenv import load_dotenv
from openai import OpenAI
from src.ai.budget_monitor import check_budget_before_request, track_request

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def check_grammar_ai(text: str) -> Dict:
    """
    Check grammar using AI and return detailed corrections.

    Includes budget monitoring to prevent overspending.

    Args:
        text: The text to check

    Returns:
        dict: {
            'has_errors': bool,
            'corrected': str,
            'errors': List[dict],
            'error_count': int
        }
    """
    try:
        # Check budget BEFORE making API call
        check_budget_before_request()

        prompt = f"""You are a professional grammar teacher. Analyze this text for grammar errors and provide corrections.

IMPORTANT CONTEXT RULES:
- Understand context: "M3GAN" (movie) vs "Megan" (name) are BOTH correct in their contexts
- Proper nouns, brand names, movie titles, game names are always correct as-is
- Internet slang ("idk", "gonna", "yea") are acceptable casual speech, NOT errors
- Only flag ACTUAL mistakes: real typos, grammar errors, wrong word usage
- Do NOT flag stylistic choices or casual language as errors

Text to analyze:
"{text}"

Provide your response in this EXACT format:

CORRECTED:
[The fully corrected version of the text with ALL grammar errors fixed]

ERRORS:
1. Error: [describe the error]
   Location: [the incorrect phrase]
   Correction: [the correct phrase]
   Type: [grammar/spelling/punctuation/style]

2. [next error...]

If there are NO errors, respond with:
CORRECTED:
[original text]

ERRORS:
None

Be thorough but context-aware. Only catch REAL errors, not style or valid names."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Actual available model (GPT-5 doesn't exist yet)
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert grammar teacher who provides detailed, accurate corrections.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,  # Low temperature for consistency
            max_tokens=1000,
        )

        result_text = response.choices[0].message.content

        # Track this request for budget monitoring
        usage = response.usage
        if usage:
            budget_info = track_request(
                input_tokens=usage.prompt_tokens,
                output_tokens=usage.completion_tokens,
                model="gpt-4o-mini",
            )

            # Log budget status if getting close to limit
            if budget_info["percentage"] >= 75:
                print(
                    f"⚠️  Budget Alert: "
                    f"{budget_info['percentage']:.1f}% used "
                    f"(${budget_info['total_cost']:.2f} / "
                    f"${budget_info['remaining']:.2f} remaining)"
                )

        # Parse the response
        parsed = _parse_ai_response(result_text, text)
        return parsed

    except Exception as e:
        # Check if it's a budget error
        if "SUSPENDED" in str(e) or "BUDGET" in str(e):
            print(f"\n🚫 Budget Error: {e}")
            # Return error state that bot can handle
            return {
                "has_errors": False,
                "corrected": text,
                "errors": [],
                "error_count": 0,
                "ai_available": False,
            }
        else:
            print(f"AI Grammar Check Error: {e}")
            import traceback

            traceback.print_exc()
            # Fallback: return original text with no errors detected
            return {
                "has_errors": False,
                "corrected": text,
                "errors": [],
                "error_count": 0,
            }


def _parse_ai_response(response_text: str, original_text: str) -> Dict:
    """Parse the AI response into structured data."""

    lines = response_text.strip().split("\n")
    corrected = original_text
    errors = []

    # Find CORRECTED section
    in_corrected = False
    in_errors = False
    current_error = {}

    for line in lines:
        line = line.strip()

        if line.startswith("CORRECTED:"):
            in_corrected = True
            in_errors = False
            continue
        elif line.startswith("ERRORS:"):
            in_corrected = False
            in_errors = True
            continue

        if in_corrected and line and not line.startswith("ERRORS:"):
            corrected = line
            in_corrected = False

        if in_errors:
            if line.lower() == "none":
                break

            # Parse error entries
            if line and line[0].isdigit() and ". Error:" in line:
                # Save previous error
                if current_error:
                    errors.append(current_error)

                # Start new error
                error_desc = line.split(". Error:", 1)[1].strip()
                current_error = {
                    "message": error_desc,
                    "location": "",
                    "correction": "",
                    "type": "grammar",
                }
            elif "Location:" in line:
                current_error["location"] = line.split("Location:", 1)[1].strip()
            elif "Correction:" in line:
                current_error["correction"] = line.split("Correction:", 1)[1].strip()
            elif "Type:" in line:
                current_error["type"] = line.split("Type:", 1)[1].strip().lower()

    # Add last error
    if current_error:
        errors.append(current_error)

    return {
        "has_errors": len(errors) > 0,
        "corrected": corrected,
        "errors": errors,
        "error_count": len(errors),
        "ai_available": True,
    }


def get_ai_variations(corrected_text: str, original_text: str) -> List[Dict]:
    """
    Generate sentence variations using AI.

    Args:
        corrected_text: The corrected version
        original_text: The original text

    Returns:
        List of variation dictionaries
    """
    try:
        prompt = f"""Given this corrected text, provide 3 alternative phrasings:

Corrected text: "{corrected_text}"

Provide:
1. A more concise version (shorter, direct)
2. A more professional version (sophisticated vocabulary)
3. A more conversational version (friendly, casual but still correct)

Format your response as:
CONCISE: [concise version]
PROFESSIONAL: [professional version]
CONVERSATIONAL: [conversational version]"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Currently available model
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert writer who creates clear, varied sentence alternatives.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=500,
        )

        result = response.choices[0].message.content
        return _parse_variations(result, corrected_text)

    except Exception as e:
        print(f"AI Variations Error: {e}")
        return []


def _parse_variations(response_text: str, corrected_text: str) -> List[Dict]:
    """Parse AI variations response."""
    variations = [
        {
            "title": "📘 Standard (Corrected)",
            "text": corrected_text,
            "description": "Grammatically correct version",
        }
    ]

    lines = response_text.split("\n")
    for line in lines:
        if line.startswith("CONCISE:"):
            text = line.split("CONCISE:", 1)[1].strip()
            variations.append(
                {
                    "title": "✂️ Concise",
                    "text": text,
                    "description": "Shorter and more direct",
                }
            )
        elif line.startswith("PROFESSIONAL:"):
            text = line.split("PROFESSIONAL:", 1)[1].strip()
            variations.append(
                {
                    "title": "💼 Professional",
                    "text": text,
                    "description": "More sophisticated vocabulary",
                }
            )
        elif line.startswith("CONVERSATIONAL:"):
            text = line.split("CONVERSATIONAL:", 1)[1].strip()
            variations.append(
                {
                    "title": "💬 Conversational",
                    "text": text,
                    "description": "Friendly and approachable",
                }
            )

    return variations
    return variations
