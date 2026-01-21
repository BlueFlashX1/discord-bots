"""Daily problem scheduler service."""

import asyncio
import logging
import random
from datetime import datetime, time
from typing import Optional, Dict, List

import discord
from discord.ext import tasks

from services.exercism_cli import ExercismCLI
from utils.embeds import create_daily_problem_embed
from utils.data_manager import DataManager

logger = logging.getLogger(__name__)


# Exercise difficulty mapping (simplified - could be enhanced with API data)
EXERCISE_DIFFICULTY = {
    "beginner": [
        "hello-world",
        "two-fer",
        "leap",
        "bob",
        "raindrops",
        "isogram",
        "pangram",
    ],
    "intermediate": [
        "hamming",
        "acronym",
        "word-count",
        "anagram",
        "scrabble-score",
        "roman-numerals",
        "phone-number",
    ],
    "advanced": [
        "sieve",
        "nth-prime",
        "largest-series-product",
        "allergies",
        "crypto-square",
        "robot-name",
    ],
}

COMMON_EXERCISES = {
    "python": EXERCISE_DIFFICULTY["beginner"] + EXERCISE_DIFFICULTY["intermediate"],
    "javascript": EXERCISE_DIFFICULTY["beginner"] + EXERCISE_DIFFICULTY["intermediate"],
    "rust": EXERCISE_DIFFICULTY["beginner"] + EXERCISE_DIFFICULTY["intermediate"],
    "go": EXERCISE_DIFFICULTY["beginner"] + EXERCISE_DIFFICULTY["intermediate"],
    "java": EXERCISE_DIFFICULTY["beginner"] + EXERCISE_DIFFICULTY["intermediate"],
}


class DailyScheduler:
    """Manages daily problem delivery."""

    def __init__(self, bot: discord.Client, cli: ExercismCLI, data: DataManager):
        self.bot = bot
        self.cli = cli
        self.data = data
        self.subscribers: Dict[int, Dict] = {}  # user_id -> {track, channel_id, difficulty}

    def subscribe(
        self,
        user_id: int,
        track: str = "python",
        channel_id: Optional[int] = None,
        difficulty: str = "beginner",
    ):
        """Subscribe a user to daily problems."""
        self.subscribers[user_id] = {
            "track": track,
            "channel_id": channel_id,
            "difficulty": difficulty,
            "last_sent": None,
        }
        logger.info(f"User {user_id} subscribed to daily {track} problems ({difficulty})")

    def unsubscribe(self, user_id: int):
        """Unsubscribe a user from daily problems."""
        if user_id in self.subscribers:
            del self.subscribers[user_id]
            logger.info(f"User {user_id} unsubscribed from daily problems")

    def get_random_exercise(self, track: str, difficulty: str = "beginner") -> str:
        """Get a random exercise for track and difficulty."""
        exercises = EXERCISE_DIFFICULTY.get(difficulty, EXERCISE_DIFFICULTY["beginner"])
        track_exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])

        # Filter to exercises available in track
        available = [e for e in exercises if e in track_exercises]
        if not available:
            available = track_exercises

        return random.choice(available)

    async def send_daily_problem(self, user_id: int):
        """Send daily problem to a user."""
        if user_id not in self.subscribers:
            return

        config = self.subscribers[user_id]
        track = config["track"]
        difficulty = config["difficulty"]
        channel_id = config.get("channel_id")

        # Get random exercise
        exercise = self.get_random_exercise(track, difficulty)

        # Create embed
        embed = create_daily_problem_embed(
            exercise=exercise,
            track=track,
            description=f"Difficulty: {difficulty.title()}\n\nUse `/fetch {exercise} {track}` to download!",
        )

        # Send to channel or DM
        try:
            if channel_id:
                channel = self.bot.get_channel(channel_id)
                if channel:
                    await channel.send(embed=embed)
                else:
                    # Fallback to DM
                    user = await self.bot.fetch_user(user_id)
                    await user.send(embed=embed)
            else:
                user = await self.bot.fetch_user(user_id)
                await user.send(embed=embed)

            config["last_sent"] = datetime.now().isoformat()
            logger.info(f"Sent daily problem {exercise} ({track}) to user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send daily problem to {user_id}: {e}")

    @tasks.loop(time=time(hour=9, minute=0))  # 9 AM daily
    async def daily_problem_task(self):
        """Background task to send daily problems."""
        if not self.subscribers:
            return

        for user_id in list(self.subscribers.keys()):
            try:
                await self.send_daily_problem(user_id)
                await asyncio.sleep(1)  # Rate limit protection
            except Exception as e:
                logger.warning(f"Error sending daily problem to {user_id}: {e}")

    def start(self):
        """Start the daily problem scheduler."""
        self.daily_problem_task.start()
        logger.info("Daily problem scheduler started (9:00 AM daily)")

    def stop(self):
        """Stop the daily problem scheduler."""
        self.daily_problem_task.cancel()
        logger.info("Daily problem scheduler stopped")
