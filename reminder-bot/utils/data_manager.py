"""Data manager for Reminder bot."""

import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


class DataManager:
    """Manages data storage for the Reminder bot."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        # File paths
        self.reminders_file = self.data_dir / "reminders.json"
        self.config_file = self.data_dir / "config.json"

    def _load_json(self, file_path: Path, default: Any = None) -> Any:
        """Load JSON file."""
        if file_path.exists():
            try:
                with open(file_path, "r") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return default or {}
        return default or {}

    def _save_json(self, file_path: Path, data: Any):
        """Save JSON file."""
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

    # Reminders
    def get_reminders(self) -> Dict[str, Dict]:
        """Get all reminders."""
        return self._load_json(self.reminders_file, {})

    def get_user_reminders(self, user_id: int) -> List[Dict]:
        """Get all reminders for a user."""
        all_reminders = self.get_reminders()
        return [
            reminder
            for reminder in all_reminders.values()
            if reminder.get("user_id") == user_id
        ]

    def add_reminder(
        self,
        user_id: int,
        message: str,
        remind_at: str,
        channel_id: Optional[int] = None,
        recurring: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """Add a reminder."""
        reminders = self.get_reminders()
        reminder_id = str(uuid.uuid4())

        from datetime import datetime

        reminder = {
            "id": reminder_id,
            "user_id": user_id,
            "message": message,
            "remind_at": remind_at,
            "channel_id": channel_id,
            "recurring": recurring,
            "notes": notes,
            "created_at": datetime.utcnow().isoformat(),
        }

        reminders[reminder_id] = reminder
        self._save_json(self.reminders_file, reminders)

        return reminder_id

    def update_reminder_notes(self, reminder_id: str, user_id: int, notes: str) -> bool:
        """Update notes for a reminder."""
        reminders = self.get_reminders()
        if reminder_id in reminders:
            # Verify ownership
            if reminders[reminder_id]["user_id"] == user_id:
                reminders[reminder_id]["notes"] = notes
                self._save_json(self.reminders_file, reminders)
                return True
        return False

    def get_reminder(self, reminder_id: str, user_id: int) -> Optional[Dict]:
        """Get a specific reminder by ID."""
        reminders = self.get_reminders()
        if reminder_id in reminders:
            reminder = reminders[reminder_id]
            if reminder["user_id"] == user_id:
                return reminder
        return None

    def remove_reminder(self, reminder_id: str, user_id: int) -> bool:
        """Remove a reminder."""
        reminders = self.get_reminders()
        if reminder_id in reminders:
            # Verify ownership
            if reminders[reminder_id]["user_id"] == user_id:
                del reminders[reminder_id]
                self._save_json(self.reminders_file, reminders)
                return True
        return False

    def get_due_reminders(self, current_time: str) -> List[Dict]:
        """Get all reminders due at or before current_time."""
        reminders = self.get_reminders()
        due = []
        for reminder in reminders.values():
            if reminder.get("remind_at") <= current_time:
                due.append(reminder)
        return due

    def update_reminder_time(self, reminder_id: str, new_time: str):
        """Update reminder time (for recurring reminders)."""
        reminders = self.get_reminders()
        if reminder_id in reminders:
            reminders[reminder_id]["remind_at"] = new_time
            self._save_json(self.reminders_file, reminders)

    # Configuration (Guild settings)
    def get_config(self) -> Dict[str, Any]:
        """Get all guild configurations."""
        return self._load_json(self.config_file, {})

    def get_guild_default_channel(self, guild_id: int) -> Optional[int]:
        """Get default channel ID for a guild."""
        config = self.get_config()
        guild_key = str(guild_id)
        if guild_key in config:
            return config[guild_key].get("default_channel_id")
        return None

    def set_guild_default_channel(self, guild_id: int, channel_id: int) -> bool:
        """Set default channel ID for a guild."""
        config = self.get_config()
        guild_key = str(guild_id)

        if guild_key not in config:
            config[guild_key] = {}

        config[guild_key]["default_channel_id"] = channel_id
        self._save_json(self.config_file, config)
        return True

    def clear_guild_default_channel(self, guild_id: int) -> bool:
        """Clear default channel ID for a guild (revert to DM)."""
        config = self.get_config()
        guild_key = str(guild_id)

        if guild_key in config:
            if "default_channel_id" in config[guild_key]:
                del config[guild_key]["default_channel_id"]
                # Remove guild entry if empty
                if not config[guild_key]:
                    del config[guild_key]
                self._save_json(self.config_file, config)
                return True
        return False
