"""
Logging and debugging system for Hangman Bot

Logs all errors, warnings, info, and debug messages to:
- Console (stdout/stderr)
- File: logs/hangman.log
- File: logs/hangman.error.log (errors only)
"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Create logs directory if it doesn't exist
LOG_DIR = Path(__file__).parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Define log files
LOG_FILE = LOG_DIR / "hangman.log"
ERROR_LOG_FILE = LOG_DIR / "hangman.error.log"

# Create logger
logger = logging.getLogger("HangmanBot")
logger.setLevel(logging.DEBUG)

# Remove existing handlers to avoid duplicates
logger.handlers.clear()

# Create formatters
detailed_formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
)

simple_formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s", datefmt="%H:%M:%S"
)

# Console Handler (INFO level and above)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(simple_formatter)
logger.addHandler(console_handler)

# File Handler - All logs (DEBUG and above)
try:
    file_handler = logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)
    logger.addHandler(file_handler)
except Exception as e:
    logger.error(f"Failed to create main log file: {e}")

# Error File Handler - Errors only (ERROR level and above)
try:
    error_handler = logging.FileHandler(ERROR_LOG_FILE, mode="a", encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    logger.addHandler(error_handler)
except Exception as e:
    logger.error(f"Failed to create error log file: {e}")


def log_startup():
    """Log bot startup information"""
    logger.info("=" * 60)
    logger.info("🎮 HANGMAN BOT STARTING")
    logger.info("=" * 60)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"Python Version: {sys.version}")
    logger.info(f"Log Directory: {LOG_DIR}")
    logger.debug(f"Main Log: {LOG_FILE}")
    logger.debug(f"Error Log: {ERROR_LOG_FILE}")
    logger.info("=" * 60)


def log_shutdown():
    """Log bot shutdown information"""
    logger.info("=" * 60)
    logger.info("🎮 HANGMAN BOT SHUTTING DOWN")
    logger.info("=" * 60)


def log_command(command_name: str, user_id: int, user_name: str):
    """Log when a command is executed"""
    logger.info(f"CMD: /{command_name} by {user_name} ({user_id})")


def log_error_traceback(error: Exception, context: str = ""):
    """Log error with full traceback"""
    logger.error(f"ERROR in {context}: {str(error)}", exc_info=True)


def log_game_start(game_id: str, word: str, starter_id: int):
    """Log game start"""
    word_length = len(word)
    logger.info(
        f"GAME_START: {game_id} | Word length: {word_length} | "
        f"Started by: {starter_id}"
    )


def log_game_action(game_id: str, action: str, player_id: int, details: str = ""):
    """Log game actions"""
    logger.info(
        f"GAME_ACTION: {game_id} | {action} | Player: {player_id} | " f"{details}"
    )


def log_game_end(game_id: str, result: str, word: str):
    """Log game end"""
    logger.info(f"GAME_END: {game_id} | Result: {result} | Word: {word}")


def log_api_call(api_name: str, status: str, details: str = ""):
    """Log API calls (OpenAI, Discord)"""
    logger.debug(f"API: {api_name} | Status: {status} | {details}")


def log_debug(message: str):
    """Log debug message"""
    logger.debug(f"DEBUG: {message}")


def log_warning(message: str):
    """Log warning message"""
    logger.warning(f"WARNING: {message}")


def log_info(message: str):
    """Log info message"""
    logger.info(f"INFO: {message}")


def get_logger():
    """Get the main logger instance"""
    return logger
