"""Daily problem scheduler service."""

import asyncio
import logging
import random
from datetime import datetime, time
from typing import Dict, Optional

from discord.ext import tasks
from utils.data_manager import DataManager
from utils.embeds import create_daily_problem_embed

import discord
from services.exercism_cli import ExercismCLI

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
        self.subscribers: Dict[int, Dict] = (
            {}
        )  # user_id -> {tracks, channel_id, difficulty, track_index}

    def subscribe(
        self,
        user_id: int,
        track: str = "python",
        channel_id: Optional[int] = None,
        difficulty: str = "beginner",
        all_tracks: bool = False,
    ):
        """Subscribe a user to daily problems.

        Args:
            user_id: Discord user ID
            track: Single track name (if all_tracks=False)
            channel_id: Channel to send to (None = DM)
            difficulty: Difficulty level
            all_tracks: If True, subscribe to all joined tracks and rotate
        """
        if all_tracks:
            # Get all joined tracks
            import asyncio

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, we need to use a different approach
                    # Store a flag and fetch tracks when sending
                    tracks = None  # Will be fetched dynamically
                else:
                    tracks = loop.run_until_complete(self.cli.get_joined_tracks())
            except:
                tracks = None

            self.subscribers[user_id] = {
                "tracks": tracks,  # None means "all joined tracks" - fetch dynamically
                "all_tracks": True,
                "channel_id": channel_id,
                "difficulty": difficulty,
                "track_index": 0,  # Current track in rotation
                "last_sent": None,
            }
            logger.info(
                f"User {user_id} subscribed to daily problems from ALL joined tracks ({difficulty})"
            )
        else:
            self.subscribers[user_id] = {
                "tracks": [track],  # Single track in list for consistency
                "all_tracks": False,
                "channel_id": channel_id,
                "difficulty": difficulty,
                "track_index": 0,
                "last_sent": None,
            }
            logger.info(
                f"User {user_id} subscribed to daily {track} problems ({difficulty})"
            )

    def unsubscribe(self, user_id: int):
        """Unsubscribe a user from daily problems."""
        if user_id in self.subscribers:
            del self.subscribers[user_id]
            logger.info(f"User {user_id} unsubscribed from daily problems")

    async def get_random_exercise(
        self, track: str, difficulty: str = "beginner"
    ) -> Optional[str]:
        """
        Get a random exercise for track and difficulty that is UNLOCKED for the user.

        Uses real Exercism difficulty data from GitHub config.json.
        Falls back to hardcoded mapping if API fetch fails.
        Only returns exercises that are unlocked. Returns None if none are unlocked.
        """
        try:
            exercises = await self.cli.get_exercises_by_difficulty(track, difficulty)

            if exercises:
                logger.debug(
                    f"Found {len(exercises)} exercises for {track} ({difficulty})"
                )
                unlocked_exercises = []
                for exercise in exercises:
                    if await self.cli.is_exercise_unlocked(exercise, track):
                        unlocked_exercises.append(exercise)
                    else:
                        logger.debug(f"Exercise {exercise} ({track}) is locked, skipping")

                in_workspace = await self.cli.get_exercises_for_track(track)
                unlocked_exercises = [
                    e for e in unlocked_exercises if e not in in_workspace
                ]

                if unlocked_exercises:
                    logger.debug(
                        f"Found {len(unlocked_exercises)} unlocked exercises for {track} ({difficulty})"
                    )
                    return random.choice(unlocked_exercises)
                logger.warning(
                    f"No unlocked exercises found for {track} ({difficulty}), trying fallback"
                )
        except Exception as e:
            logger.warning(f"Failed to fetch real difficulty data for {track}: {e}")

        logger.debug(f"Using fallback difficulty mapping for {track} ({difficulty})")
        exercises = EXERCISE_DIFFICULTY.get(difficulty, EXERCISE_DIFFICULTY["beginner"])
        track_exercises = COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
        available = [e for e in exercises if e in track_exercises]
        if not available:
            available = list(track_exercises)

        unlocked = []
        for exercise in available:
            if await self.cli.is_exercise_unlocked(exercise, track):
                unlocked.append(exercise)

        in_workspace = await self.cli.get_exercises_for_track(track)
        unlocked = [e for e in unlocked if e not in in_workspace]

        if unlocked:
            return random.choice(unlocked)
        logger.warning(
            f"No unlocked exercises for {track} ({difficulty}); skipping daily problem"
        )
        return None

    async def send_daily_problem(self, user_id: int):
        """Send daily problem to a user with full problem details."""
        if user_id not in self.subscribers:
            return

        config = self.subscribers[user_id]
        difficulty = config["difficulty"]
        channel_id = config.get("channel_id")
        all_tracks = config.get("all_tracks", False)

        # Get tracks list
        if all_tracks:
            # Fetch current joined tracks dynamically
            tracks = await self.cli.get_joined_tracks()
            if not tracks:
                # No joined tracks - can't send problem
                logger.warning(
                    f"User {user_id} subscribed to all tracks but has no joined tracks"
                )
                return
        else:
            tracks = config.get("tracks", [config.get("track", "python")])

        if not tracks:
            logger.warning(f"User {user_id} has no tracks configured")
            return

        # Rotate through tracks (round-robin)
        track_index = config.get("track_index", 0)
        track = tracks[track_index % len(tracks)]

        # Update index for next time
        config["track_index"] = (track_index + 1) % len(tracks)

        exercise = await self.get_random_exercise(track, difficulty)

        if exercise is None:
            no_unlocked_embed = discord.Embed(
                title="No Unlocked Exercises",
                description=(
                    f"No unlocked exercises for **{track.title()}** ({difficulty}).\n\n"
                    "Complete more exercises on [exercism.io](https://exercism.org) to unlock more, "
                    "then you'll receive daily problems again."
                ),
                color=discord.Color.orange(),
            )
            no_unlocked_embed.set_footer(text="Good luck! 🚀")
            try:
                if channel_id:
                    channel = self.bot.get_channel(channel_id)
                    if channel and hasattr(channel, "send"):
                        await channel.send(embed=no_unlocked_embed)
                    else:
                        user = await self.bot.fetch_user(user_id)
                        await user.send(embed=no_unlocked_embed)
                else:
                    user = await self.bot.fetch_user(user_id)
                    await user.send(embed=no_unlocked_embed)
            except Exception as e:
                logger.warning(f"Failed to send 'no unlocked' message to {user_id}: {e}")
            return

        cli_installed, cli_message = await self.cli.check_cli_installed()

        if not cli_installed:
            # CLI not installed - send installation help
            embed = create_daily_problem_embed(
                exercise=exercise,
                track=track,
                description=f"Difficulty: {difficulty.title()}",
                cli_installed=False,
                cli_message=cli_message,
            )
        else:
            # Try to fetch and display the problem
            try:
                # Download the exercise
                success, download_msg, exercise_path = await self.cli.download_exercise(
                    exercise, track
                )

                if success and exercise_path:
                    # Get exercise info (README, starter code, etc.)
                    info_success, exercise_info = await self.cli.get_exercise_info(
                        exercise, track
                    )

                    if info_success:
                        # Add rotation info if using all tracks
                        description = exercise_info.get(
                            "description", f"Difficulty: {difficulty.title()}"
                        )
                        if all_tracks and len(tracks) > 1:
                            current_track_num = (
                                config.get("track_index", 0) % len(tracks)
                            ) + 1
                            description = f"**🔄 Track Rotation:** {track.title()} ({current_track_num}/{len(tracks)})\n\n{description}"

                        # Create rich embed with problem details
                        embed = create_daily_problem_embed(
                            exercise=exercise,
                            track=track,
                            description=description,
                            exercise_path=exercise_path,
                            readme=exercise_info.get("readme"),
                            starter_code=exercise_info.get("starter_code"),
                            starter_file=exercise_info.get("starter_file"),
                            test_file=exercise_info.get("test_file"),
                            cli_installed=True,
                        )
                    else:
                        # Fallback if we can't read exercise files
                        embed = create_daily_problem_embed(
                            exercise=exercise,
                            track=track,
                            description=f"Difficulty: {difficulty.title()}\n\n✅ Exercise downloaded! Check your Exercism workspace.",
                            exercise_path=exercise_path,
                            cli_installed=True,
                        )
                else:
                    # Download failed - show error but still provide exercise info
                    embed = create_daily_problem_embed(
                        exercise=exercise,
                        track=track,
                        description=f"Difficulty: {difficulty.title()}\n\n⚠️ Could not download automatically. Use `/fetch {exercise} {track}` to download manually.\n\nError: {download_msg}",
                        cli_installed=True,
                    )
            except Exception as e:
                logger.error(f"Error fetching exercise {exercise} ({track}): {e}")
                # Fallback to basic embed
                embed = create_daily_problem_embed(
                    exercise=exercise,
                    track=track,
                    description=f"Difficulty: {difficulty.title()}\n\nUse `/fetch {exercise} {track}` to download!",
                    cli_installed=True,
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
            track_info = (
                f"{track} (track {config.get('track_index', 0) + 1}/{len(tracks)})"
                if all_tracks
                else track
            )
            logger.info(
                f"Sent daily problem {exercise} ({track_info}) to user {user_id}"
            )
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
