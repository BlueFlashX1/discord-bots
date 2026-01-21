"""Configuration for Spelling Bee Bot"""

import os
from pathlib import Path

# Bot token and API keys
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Game configuration
GAME_CONFIG = {
    "max_players": 4,
    "min_players": 2,
    "game_timeout": 300,  # 5 minutes - lobby timeout before game starts
    "solo_timeout": 120,  # 2 minutes - wait for other players to join
    "game_duration": 600,  # 10 minutes - active game play time
    "default_letters": 7,
    "max_letters": 10,
    "min_letters": 5,
    "session_dir": "data/sessions",
    # AI and API settings
    "definition_api_timeout": 10,  # 10 seconds for OpenAI definition API
    "definition_retry_attempts": 2,  # Retry twice on timeout
    "word_validation_timeout": 8,  # 8 seconds for word validation
}

# Difficulty configuration
DIFFICULTY_CONFIG = {
    "easy": {"min_length": 3, "max_length": 5, "point_multiplier": 1},
    "medium": {"min_length": 5, "max_length": 8, "point_multiplier": 2},
    "hard": {"min_length": 8, "max_length": 12, "point_multiplier": 3},
    "expert": {"min_length": 10, "max_length": 15, "point_multiplier": 4},
}

# Create session directory
Path(GAME_CONFIG["session_dir"]).mkdir(parents=True, exist_ok=True)


def validate_config():
    """Validate that all required configuration is present"""
    if not BOT_TOKEN:
        raise ValueError("DISCORD_BOT_TOKEN environment variable not set")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set")


if __name__ == "__main__":
    validate_config()
