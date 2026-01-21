"""
Budget Monitor for OpenAI API Usage
====================================

Tracks spending and suspends bot if budget limit is exceeded.
Prevents unexpected costs by monitoring usage in real-time.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Budget settings
MAX_BUDGET = float(os.getenv("OPENAI_MAX_BUDGET", "10.0"))  # Default $10
BUDGET_FILE = Path(__file__).parent / "data" / "budget_tracking.json"


class BudgetExceededError(Exception):
    """Raised when budget limit is exceeded"""

    pass


def load_budget_data() -> Dict:
    """Load budget tracking data from file"""
    if not BUDGET_FILE.exists():
        BUDGET_FILE.parent.mkdir(exist_ok=True)
        return {
            "current_month": datetime.now().strftime("%Y-%m"),
            "estimated_cost": 0.0,
            "total_requests": 0,
            "last_reset": datetime.now().isoformat(),
            "suspended": False,
        }

    try:
        with open(BUDGET_FILE, "r") as f:
            data = json.load(f)

        # Check if we're in a new month - auto reset
        current_month = datetime.now().strftime("%Y-%m")
        if data.get("current_month") != current_month:
            return {
                "current_month": current_month,
                "estimated_cost": 0.0,
                "total_requests": 0,
                "last_reset": datetime.now().isoformat(),
                "suspended": False,
            }

        return data
    except Exception:
        return {
            "current_month": datetime.now().strftime("%Y-%m"),
            "estimated_cost": 0.0,
            "total_requests": 0,
            "last_reset": datetime.now().isoformat(),
            "suspended": False,
        }


def save_budget_data(data: Dict):
    """Save budget tracking data to file"""
    BUDGET_FILE.parent.mkdir(exist_ok=True)
    with open(BUDGET_FILE, "w") as f:
        json.dump(data, f, indent=2)


def estimate_cost(
    input_tokens: int, output_tokens: int, model: str = "gpt-4o-mini"
) -> float:
    """
    Estimate cost based on token usage

    Pricing (as of Oct 2025):
    - gpt-4o-mini: $0.15/1M input, $0.60/1M output (BEST for grammar!)
    - gpt-4o: $2.50/1M input, $10.00/1M output
    - gpt-4-turbo: $10.00/1M input, $30.00/1M output
    """
    pricing = {
        "gpt-4o-mini": {
            "input": 0.15 / 1_000_000,
            "output": 0.60 / 1_000_000,
        },
        "gpt-4o": {
            "input": 2.50 / 1_000_000,
            "output": 10.00 / 1_000_000,
        },
        "gpt-4-turbo": {
            "input": 10.00 / 1_000_000,
            "output": 30.00 / 1_000_000,
        },
    }

    model_pricing = pricing.get(model, pricing["gpt-4o-mini"])

    input_cost = input_tokens * model_pricing["input"]
    output_cost = output_tokens * model_pricing["output"]

    return input_cost + output_cost


def check_budget_before_request() -> None:
    """
    Check if we're within budget before making API request.
    Raises BudgetExceededError if limit reached.
    """
    data = load_budget_data()

    if data.get("suspended", False):
        raise BudgetExceededError(
            f"🚫 BOT SUSPENDED: Monthly budget of ${MAX_BUDGET:.2f} exceeded.\n"
            f"Current spending: ${data['estimated_cost']:.2f}\n"
            f"Resets on: {datetime.now().replace(day=1, month=datetime.now().month % 12 + 1).strftime('%B 1, %Y')}\n"
            f"To increase budget, set OPENAI_MAX_BUDGET in .env file."
        )

    if data["estimated_cost"] >= MAX_BUDGET:
        data["suspended"] = True
        save_budget_data(data)
        raise BudgetExceededError(
            f"🚫 BUDGET LIMIT REACHED: ${MAX_BUDGET:.2f}\n"
            f"Total spending this month: ${data['estimated_cost']:.2f}\n"
            f"Bot is now SUSPENDED until next month.\n"
            f"Resets automatically on: {datetime.now().replace(day=1, month=datetime.now().month % 12 + 1).strftime('%B 1, %Y')}"
        )


def track_request(input_tokens: int, output_tokens: int, model: str = "gpt-4o-mini"):
    """Track API request and update budget data"""
    data = load_budget_data()

    cost = estimate_cost(input_tokens, output_tokens, model)
    data["estimated_cost"] += cost
    data["total_requests"] += 1

    # Suspend if we hit the limit
    if data["estimated_cost"] >= MAX_BUDGET:
        data["suspended"] = True
        print("\n⚠️  WARNING: Budget limit reached!")
        print(f"   Spent: ${data['estimated_cost']:.2f} / ${MAX_BUDGET:.2f}")
        print("   Bot is now SUSPENDED")

    save_budget_data(data)

    return {
        "cost": cost,
        "total_cost": data["estimated_cost"],
        "remaining": MAX_BUDGET - data["estimated_cost"],
        "percentage": (data["estimated_cost"] / MAX_BUDGET) * 100,
    }


def get_budget_status() -> Dict:
    """Get current budget status"""
    data = load_budget_data()

    remaining = MAX_BUDGET - data["estimated_cost"]
    percentage = (data["estimated_cost"] / MAX_BUDGET) * 100

    # Determine status emoji
    if data.get("suspended"):
        status_emoji = "🚫"
        status = "SUSPENDED"
    elif percentage >= 90:
        status_emoji = "🔴"
        status = "CRITICAL"
    elif percentage >= 75:
        status_emoji = "🟡"
        status = "WARNING"
    else:
        status_emoji = "🟢"
        status = "OK"

    return {
        "status": status,
        "emoji": status_emoji,
        "spent": data["estimated_cost"],
        "limit": MAX_BUDGET,
        "remaining": remaining,
        "percentage": percentage,
        "requests": data["total_requests"],
        "suspended": data.get("suspended", False),
        "current_month": data.get("current_month"),
    }


def reset_budget_manually():
    """Manually reset budget (use with caution!)"""
    data = {
        "current_month": datetime.now().strftime("%Y-%m"),
        "estimated_cost": 0.0,
        "total_requests": 0,
        "last_reset": datetime.now().isoformat(),
        "suspended": False,
    }
    save_budget_data(data)
    return data


def get_openai_actual_usage() -> Optional[Dict]:
    """
    Fetch actual usage from OpenAI API (if available).
    This requires OpenAI API v2+ with usage endpoint.
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        # Note: OpenAI doesn't provide direct usage API in SDK yet
        # This would need to be implemented with direct HTTP requests
        # to https://api.openai.com/v1/usage
        # For now, we use estimation
        return None
    except Exception:
        return None
