"""Data manager for GitHub bot."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class DataManager:
    """Manages data storage for the GitHub bot."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        # File paths
        self.tracked_repos_file = self.data_dir / "tracked_repos.json"
        self.user_config_file = self.data_dir / "user_config.json"
        self.repo_updates_file = self.data_dir / "repo_updates.json"
        self.contributions_file = self.data_dir / "contributions.json"

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

    # Tracked repositories
    def get_tracked_repos(self) -> Dict[str, Dict]:
        """Get all tracked repositories."""
        return self._load_json(self.tracked_repos_file, {})

    def add_tracked_repo(
        self, repo: str, channel_id: int, user_id: int, events: List[str]
    ):
        """Add a repository to tracking."""
        repos = self.get_tracked_repos()
        repos[repo] = {
            "channel_id": channel_id,
            "user_id": user_id,
            "events": events,
            "last_check": None,
        }
        self._save_json(self.tracked_repos_file, repos)

    def remove_tracked_repo(self, repo: str):
        """Remove a repository from tracking."""
        repos = self.get_tracked_repos()
        repos.pop(repo, None)
        self._save_json(self.tracked_repos_file, repos)

    def update_repo_last_check(self, repo: str, timestamp: str):
        """Update last check timestamp for a repo."""
        repos = self.get_tracked_repos()
        if repo in repos:
            repos[repo]["last_check"] = timestamp
            self._save_json(self.tracked_repos_file, repos)

    # User configuration
    def get_user_config(self, user_id: int) -> Dict[str, Any]:
        """Get user configuration."""
        configs = self._load_json(self.user_config_file, {})
        return configs.get(str(user_id), {})

    def set_user_config(self, user_id: int, config: Dict[str, Any]):
        """Set user configuration."""
        configs = self._load_json(self.user_config_file, {})
        configs[str(user_id)] = config
        self._save_json(self.user_config_file, configs)

    def set_user_github_username(self, user_id: int, username: str):
        """Set GitHub username for a Discord user."""
        config = self.get_user_config(user_id)
        config["github_username"] = username
        self.set_user_config(user_id, config)

    def get_user_github_username(self, user_id: int) -> Optional[str]:
        """Get GitHub username for a Discord user."""
        config = self.get_user_config(user_id)
        return config.get("github_username")

    # Repository updates cache
    def get_repo_updates(self, repo: str) -> Dict[str, Any]:
        """Get cached repository updates."""
        updates = self._load_json(self.repo_updates_file, {})
        return updates.get(repo, {})

    def save_repo_updates(self, repo: str, updates: Dict[str, Any]):
        """Save repository updates cache."""
        all_updates = self._load_json(self.repo_updates_file, {})
        all_updates[repo] = updates
        self._save_json(self.repo_updates_file, all_updates)

    # Contributions tracking
    def get_contributions(self, user_id: int) -> Dict[str, Any]:
        """Get user contributions."""
        contributions = self._load_json(self.contributions_file, {})
        return contributions.get(str(user_id), {})

    def save_contributions(self, user_id: int, data: Dict[str, Any]):
        """Save user contributions."""
        contributions = self._load_json(self.contributions_file, {})
        contributions[str(user_id)] = data
        self._save_json(self.contributions_file, contributions)
