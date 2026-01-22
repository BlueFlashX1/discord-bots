"""Data management utilities."""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class DataManager:
    """Manages bot data storage."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def _get_file_path(self, filename: str) -> Path:
        """Get full path to data file."""
        return self.data_dir / filename

    def load_json(self, filename: str, default: Optional[Dict] = None) -> Dict:
        """Load JSON data from file."""
        file_path = self._get_file_path(filename)
        if not file_path.exists():
            return default or {}
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
            return default or {}

    def save_json(self, filename: str, data: Dict) -> bool:
        """Save JSON data to file."""
        file_path = self._get_file_path(filename)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving {filename}: {e}")
            return False

    def add_exercise(self, user_id: int, exercise: str, track: str) -> None:
        """Track a downloaded exercise."""
        exercises = self.load_json("exercises.json", {})
        user_key = str(user_id)

        if user_key not in exercises:
            exercises[user_key] = []

        exercise_entry = {"exercise": exercise, "track": track}
        if exercise_entry not in exercises[user_key]:
            exercises[user_key].append(exercise_entry)

        self.save_json("exercises.json", exercises)

    def get_user_exercises(self, user_id: int) -> List[Dict]:
        """Get exercises for a user."""
        exercises = self.load_json("exercises.json", {})
        return exercises.get(str(user_id), [])

    def add_submission(
        self, user_id: int, exercise: str, track: str, file_path: str
    ) -> None:
        """Track a submission."""
        import datetime
        
        submissions = self.load_json("submissions.json", {})
        user_key = str(user_id)

        if user_key not in submissions:
            submissions[user_key] = []

        submissions[user_key].append(
            {
                "exercise": exercise,
                "track": track,
                "file_path": file_path,
                "timestamp": datetime.datetime.now().isoformat(),
            }
        )

        self.save_json("submissions.json", submissions)

    def update_progress(self, user_id: int, track: str, stats: Dict) -> None:
        """Update user progress."""
        progress = self.load_json("progress.json", {})
        user_key = str(user_id)

        if user_key not in progress:
            progress[user_key] = {}

        progress[user_key][track] = stats
        self.save_json("progress.json", progress)

    def get_progress(self, user_id: int, track: Optional[str] = None) -> Dict:
        """Get user progress."""
        progress = self.load_json("progress.json", {})
        user_data = progress.get(str(user_id), {})

        if track:
            return user_data.get(track, {})
        return user_data
