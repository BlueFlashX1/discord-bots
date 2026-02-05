"""Exercism REST API integration for reliable exercise status checking.

This module provides direct API access to Exercism to reliably determine
which exercises are unlocked, without relying on CLI error message parsing.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

import aiohttp

logger = logging.getLogger(__name__)


class ExercismAPI:
    """Direct API client for Exercism's REST API.

    Uses the same endpoints as the Exercism CLI and website to reliably
    fetch exercise status, track progress, and unlocked exercises.
    """

    BASE_URL = "https://exercism.org/api/v2"
    CACHE_DURATION = timedelta(hours=1)  # Cache unlocked exercises for 1 hour

    def __init__(self, token: Optional[str] = None):
        """
        Initialize Exercism API client.

        Args:
            token: Exercism API token. If not provided, will try:
                   1. EXERCISM_TOKEN environment variable
                   2. ~/.config/exercism/user.json
                   3. ~/.exercism/user.json
        """
        self.token = token or self._load_token()
        self._cache: Dict[str, Dict] = {}  # track -> {exercises: Set, fetched_at: datetime}
        self._session: Optional[aiohttp.ClientSession] = None

    def _load_token(self) -> Optional[str]:
        """Load Exercism token from environment or CLI config."""
        # 1. Check environment variables first (easiest for deployment)
        env_token = os.getenv("EXERCISM_TOKEN") or os.getenv("EXERCISM_API_TOKEN")
        if env_token:
            logger.info("Loaded Exercism token from environment variable")
            return env_token

        # 2. Check CLI config files
        config_paths = [
            os.path.expanduser("~/.config/exercism/user.json"),
            os.path.expanduser("~/.exercism/user.json"),
        ]

        for config_path in config_paths:
            if os.path.exists(config_path):
                try:
                    with open(config_path, "r") as f:
                        config = json.load(f)
                        token = config.get("token")
                        if token:
                            logger.info(f"Loaded Exercism token from {config_path}")
                            return token
                except Exception as e:
                    logger.debug(f"Error reading {config_path}: {e}")

        logger.warning("No Exercism token found. Set EXERCISM_TOKEN in .env or run: exercism configure --token=YOUR_TOKEN")
        return None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            headers = {
                "User-Agent": "ExercismBot/1.0",
                "Accept": "application/json",
            }
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"

            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self._session

    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def _request(self, endpoint: str, method: str = "GET") -> Tuple[bool, Dict]:
        """Make an API request.

        Returns:
            Tuple of (success, response_data)
        """
        if not self.token:
            return False, {"error": "No API token configured"}

        url = f"{self.BASE_URL}{endpoint}"

        try:
            session = await self._get_session()
            async with session.request(method, url) as response:
                if response.status == 200:
                    data = await response.json()
                    return True, data
                elif response.status == 401:
                    logger.error("Exercism API: Invalid or expired token")
                    return False, {"error": "Invalid token"}
                elif response.status == 404:
                    return False, {"error": "Not found"}
                else:
                    text = await response.text()
                    logger.warning(f"Exercism API error {response.status}: {text[:200]}")
                    return False, {"error": f"HTTP {response.status}"}
        except asyncio.TimeoutError:
            logger.error(f"Exercism API timeout: {endpoint}")
            return False, {"error": "Request timeout"}
        except Exception as e:
            logger.error(f"Exercism API error: {e}")
            return False, {"error": str(e)}

    async def get_track_exercises(self, track: str) -> Tuple[bool, List[Dict]]:
        """
        Get all exercises for a track with their unlock status.

        This is the key method that reliably returns which exercises are unlocked.

        Args:
            track: Track slug (e.g., "python", "typescript")

        Returns:
            Tuple of (success, list of exercise dicts with 'is_unlocked' field)
        """
        success, data = await self._request(f"/tracks/{track}/exercises")

        if success and "exercises" in data:
            exercises = data["exercises"]
            logger.info(f"Fetched {len(exercises)} exercises for {track}")
            return True, exercises

        return False, []

    async def get_unlocked_exercises(
        self,
        track: str,
        use_cache: bool = True
    ) -> Set[str]:
        """
        Get set of unlocked exercise slugs for a track.

        This method caches results to avoid repeated API calls.

        Args:
            track: Track slug
            use_cache: Whether to use cached results if available

        Returns:
            Set of unlocked exercise slugs
        """
        # Check cache
        if use_cache and track in self._cache:
            cache_entry = self._cache[track]
            if datetime.now() - cache_entry["fetched_at"] < self.CACHE_DURATION:
                logger.debug(f"Using cached unlocked exercises for {track}")
                return cache_entry["exercises"]

        # Fetch from API
        success, exercises = await self.get_track_exercises(track)

        if success:
            # Extract unlocked exercises
            unlocked = {
                ex["slug"]
                for ex in exercises
                if ex.get("is_unlocked", False)
            }

            # Cache the results
            self._cache[track] = {
                "exercises": unlocked,
                "fetched_at": datetime.now(),
                "all_exercises": exercises,
            }

            logger.info(f"Found {len(unlocked)} unlocked exercises for {track}")
            return unlocked

        logger.warning(f"Failed to fetch unlocked exercises for {track}")
        return set()

    async def get_unlocked_exercises_by_difficulty(
        self,
        track: str,
        difficulty_category: str
    ) -> List[str]:
        """
        Get unlocked exercises filtered by difficulty.

        Args:
            track: Track slug
            difficulty_category: "beginner", "intermediate", or "advanced"

        Returns:
            List of exercise slugs that are both unlocked and match the difficulty
        """
        success, exercises = await self.get_track_exercises(track)

        if not success:
            return []

        def map_difficulty(difficulty) -> str:
            # API returns strings: "easy", "medium", "hard"
            if isinstance(difficulty, str):
                difficulty_lower = difficulty.lower()
                if difficulty_lower in ("easy", "1", "2", "3"):
                    return "beginner"
                elif difficulty_lower in ("medium", "4", "5", "6"):
                    return "intermediate"
                elif difficulty_lower in ("hard", "7", "8", "9", "10"):
                    return "advanced"
            # Fallback for numeric
            try:
                numeric = int(difficulty)
                if numeric <= 3:
                    return "beginner"
                elif numeric <= 6:
                    return "intermediate"
                return "advanced"
            except (TypeError, ValueError):
                return "beginner"  # Default for unknown

        matching = [
            ex["slug"]
            for ex in exercises
            if ex.get("is_unlocked", False)
            and map_difficulty(ex.get("difficulty", 5)) == difficulty_category
        ]

        logger.info(
            f"Found {len(matching)} unlocked {difficulty_category} exercises for {track}"
        )
        return matching

    async def is_exercise_unlocked(self, exercise: str, track: str) -> bool:
        """
        Check if a specific exercise is unlocked.

        Args:
            exercise: Exercise slug
            track: Track slug

        Returns:
            True if exercise is unlocked
        """
        unlocked = await self.get_unlocked_exercises(track)
        return exercise in unlocked

    async def get_track_info(self, track: str) -> Tuple[bool, Dict]:
        """
        Get information about a track including mode (learning/practice).

        Returns:
            Tuple of (success, track_info_dict)
        """
        success, data = await self._request(f"/tracks/{track}")

        if success and "track" in data:
            return True, data["track"]

        return False, {}

    async def get_user_tracks(self) -> List[Dict]:
        """
        Get list of tracks the user has joined.

        Returns:
            List of track dicts with user's progress
        """
        success, data = await self._request("/tracks")

        if success and "tracks" in data:
            # Filter to only joined tracks
            joined = [t for t in data["tracks"] if t.get("is_joined", False)]
            logger.info(f"User has joined {len(joined)} tracks")
            return joined

        return []

    def clear_cache(self, track: Optional[str] = None):
        """
        Clear cached data.

        Args:
            track: If provided, only clear cache for this track.
                   Otherwise, clear all cached data.
        """
        if track:
            self._cache.pop(track, None)
            logger.debug(f"Cleared cache for {track}")
        else:
            self._cache.clear()
            logger.debug("Cleared all cached data")


# Singleton instance for shared use
_api_instance: Optional[ExercismAPI] = None


def get_exercism_api() -> ExercismAPI:
    """Get the shared ExercismAPI instance."""
    global _api_instance
    if _api_instance is None:
        _api_instance = ExercismAPI()
    return _api_instance
