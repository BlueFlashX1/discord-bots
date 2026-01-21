"""Logging utilities for spelling bee bot"""

import logging
from pathlib import Path

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Configure logging
LOG_FILE = LOGS_DIR / "spelling_bee.log"

logger = logging.getLogger("spelling_bee_bot")
logger.setLevel(logging.DEBUG)

# File handler
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)


def log_debug(message: str):
    """Log debug message"""
    logger.debug(message)


def log_info(message: str):
    """Log info message"""
    logger.info(message)


def log_warning(message: str):
    """Log warning message"""
    logger.warning(message)


def log_error(message: str):
    """Log error message"""
    logger.error(message)


def log_game_action(channel_id: str, action: str, user_id: int):
    """
    Log game-related actions

    Args:
        channel_id: Discord channel ID
        action: Action description
        user_id: Discord user ID
    """
    logger.info(f"[Ch:{channel_id}] {action} | User:{user_id}")


def log_error_traceback(error: Exception, context: str = ""):
    """
    Log error with full traceback

    Args:
        error: The exception that occurred
        context: Context where error occurred
    """
    logger.exception(f"Error in {context}: {str(error)}")
