"""
AI-Powered Statistics Analysis
================================

Uses OpenAI GPT to analyze user writing patterns and provide
personalized, actionable recommendations for improvement.
"""

import os
from typing import Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI
from src.ai.budget_monitor import check_budget_before_request, track_request

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def analyze_trends_ai(user_stats: Dict) -> Optional[List[str]]:
    """
    Use AI to analyze user writing patterns and generate personalized recommendations.

    Args:
        user_stats: Dictionary containing user statistics

    Returns:
        List of AI-generated recommendations, or None if error occurs
    """
    if not user_stats:
        return None

    # Extract key statistics
    messages_monitored = user_stats.get("messages_monitored", 0)
    auto_corrections = user_stats.get("auto_corrections", 0)
    errors_found = user_stats.get("errors_found", 0)
    error_patterns = user_stats.get("error_patterns", {})
    error_history = user_stats.get("error_history", [])

    # Need at least some data to analyze
    if messages_monitored < 5:
        return [
            "Keep writing! I need more data to provide personalized recommendations.",
            "Write at least 10 messages for detailed AI analysis.",
        ]

    # Calculate accuracy rate
    accuracy = (
        ((messages_monitored - auto_corrections) / messages_monitored) * 100
        if messages_monitored > 0
        else 0
    )

    # Get top error patterns
    sorted_patterns = sorted(error_patterns.items(), key=lambda x: x[1], reverse=True)[
        :5
    ]

    # Analyze recent trend with more granularity
    recent_trend = "stable"
    trend_details = ""

    if len(error_history) >= 6:
        # Compare last 3 with previous 3 for more accurate trend
        recent_errors = len(error_history[-3:])
        previous_errors = len(error_history[-6:-3])

        if previous_errors > 0:
            trend_pct = ((recent_errors - previous_errors) / previous_errors) * 100

            if recent_errors < previous_errors:
                recent_trend = "improving"
                improvement = (
                    (previous_errors - recent_errors) / previous_errors
                ) * 100
                trend_details = f"Down {improvement:.0f}% - Great progress!"
            elif recent_errors > previous_errors:
                recent_trend = "declining"
                decline = ((recent_errors - previous_errors) / previous_errors) * 100
                trend_details = f"Up {decline:.0f}% - Watch out!"
            else:
                recent_trend = "stable"
                trend_details = "Consistent error rate"

    try:
        # Check budget before making API call
        check_budget_before_request()

        # Calculate error type percentages
        total_errors_typed = sum(count for _, count in sorted_patterns)
        error_breakdown = {}
        for pattern_key, count in sorted_patterns:
            if ":" in pattern_key:
                error_type, _ = pattern_key.split(":", 1)
                error_breakdown[error_type] = error_breakdown.get(error_type, 0) + count

        error_type_text = "\nERROR TYPE BREAKDOWN:\n"
        for error_type in sorted(
            error_breakdown.keys(), key=lambda x: error_breakdown[x], reverse=True
        ):
            count = error_breakdown[error_type]
            pct = (count / total_errors_typed * 100) if total_errors_typed > 0 else 0
            error_type_text += (
                f"- {error_type.upper()}: {count} errors ({pct:.0f}% of issues)\n"
            )

        # Build rich analysis prompt
        prompt = f"""You are an expert writing coach analyzing a detailed user profile.

=== COMPREHENSIVE STATISTICS ===
Writing Volume:
- Total messages written: {messages_monitored}
- Messages with errors: {auto_corrections} ({(auto_corrections/messages_monitored*100) if messages_monitored > 0 else 0:.1f}% error rate)
- Accuracy: {accuracy:.1f}% error-free messages

Total Issues: {errors_found} errors across all writing

Writing Trend: {recent_trend} - {trend_details}

{error_type_text}

=== TOP SPECIFIC ERROR PATTERNS ===
"""

        for i, (pattern_key, count) in enumerate(sorted_patterns[:5], 1):
            if ":" in pattern_key:
                error_type, error_msg = pattern_key.split(":", 1)
                pct = (count / errors_found * 100) if errors_found > 0 else 0
                prompt += f"{i}. [{error_type}] {error_msg}: {count} instances ({pct:.1f}% of all errors)\n"

        prompt += f"""

=== YOUR COACHING BRIEF ===
This user has made {messages_monitored} writing submissions with a {accuracy:.1f}% accuracy rate.
They've accumulated {errors_found} total errors, with {sorted_patterns[0][1] if sorted_patterns else 0} instances of their most common mistake.
Their error trend is: {recent_trend} ({trend_details})

Provide 3 HIGHLY SPECIFIC recommendations that:
1. Address their actual error data, not generic advice
2. Prioritize by error frequency and impact
3. Provide concrete, actionable next steps with measurable targets

Format EXACTLY like this:

RECOMMENDATION 1:
[Reference their #1 issue, its frequency/percentage, and specific steps to fix it]

RECOMMENDATION 2:
[Based on their error trend AND error type breakdown - if improving, target #2 weakness; if stable/declining, provide strategic priority]

RECOMMENDATION 3:
[Based on their overall profile - realistic milestone given their current performance and error breakdown]

Be specific with numbers and percentages from their data. Maximum 2 sentences each."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert writing coach providing data-driven, specific feedback. Analyze the user's error patterns and statistics deeply. Cite their numbers and percentages in recommendations.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=600,
        )

        result_text = response.choices[0].message.content

        # Track this request for budget monitoring
        usage = response.usage
        if usage:
            track_request(
                input_tokens=usage.prompt_tokens,
                output_tokens=usage.completion_tokens,
                model="gpt-4o-mini",
            )

        # Parse recommendations
        recommendations = []
        lines = result_text.strip().split("\n")

        current_rec = ""
        for line in lines:
            line = line.strip()
            if line.startswith("RECOMMENDATION"):
                if current_rec:
                    recommendations.append(current_rec.strip())
                current_rec = ""
            elif line and not line.startswith("RECOMMENDATION"):
                current_rec += " " + line if current_rec else line

        # Add last recommendation
        if current_rec:
            recommendations.append(current_rec.strip())

        # Ensure we have recommendations
        if not recommendations:
            # Fallback to basic recommendations
            return _get_basic_recommendations(user_stats)

        return recommendations[:3]  # Return max 3

    except Exception as e:
        print(f"AI Stats Analysis Error: {e}")
        # Fallback to basic recommendations
        return _get_basic_recommendations(user_stats)


def _get_basic_recommendations(user_stats: Dict) -> List[str]:
    """Fallback recommendations when AI is unavailable"""
    recommendations = []

    error_patterns = user_stats.get("error_patterns", {})
    if not error_patterns:
        return [
            "Great job! Your writing is clean.",
            "Keep up the good work with grammar and spelling.",
            "Continue writing regularly to maintain quality.",
        ]

    sorted_patterns = sorted(error_patterns.items(), key=lambda x: x[1], reverse=True)[
        :3
    ]

    for pattern_key, count in sorted_patterns:
        if ":" in pattern_key:
            error_type, _ = pattern_key.split(":", 1)

            if error_type == "grammar" and count >= 3:
                recommendations.append(
                    f"Review basic grammar rules - you've had {count} similar grammar issues."
                )
            elif error_type == "spelling" and count >= 3:
                recommendations.append(
                    f"Double-check spelling - {count} repeated spelling errors detected."
                )
            elif error_type == "punctuation" and count >= 3:
                recommendations.append(
                    f"Pay attention to punctuation - {count} punctuation issues found."
                )

    # Add general encouragement
    messages = user_stats.get("messages_monitored", 0)
    auto_corrections = user_stats.get("auto_corrections", 0)
    accuracy = ((messages - auto_corrections) / messages) * 100 if messages > 0 else 0

    if accuracy >= 90:
        recommendations.append(
            "Excellent accuracy! You're writing at a professional level."
        )
    elif accuracy >= 75:
        recommendations.append(
            "Good progress! A bit more attention to detail will perfect your writing."
        )
    else:
        recommendations.append(
            "Take your time when writing - slow down and proofread before sending."
        )

    return recommendations[:3]
    return recommendations[:3]
