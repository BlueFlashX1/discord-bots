"""Player statistics tracking across multiple game sessions"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class PlayerStats:
    """Track cumulative stats for a single player across all games"""

    def __init__(self, player_id: int, player_name: str = ""):
        """
        Initialize player stats

        Args:
            player_id: Discord user ID
            player_name: Player's display name (cached)
        """
        self.player_id = player_id
        self.player_name = player_name
        self.total_games_played = 0
        self.total_words_found = 0
        self.total_points = 0
        self.best_score = 0
        self.best_word_count = 0
        self.total_attempts = 0
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

    def update_from_session(self, session_results: Dict) -> None:
        """
        Update stats from a completed game session

        Args:
            session_results: Session data dict with:
                - word_count: int
                - total_score: int
                - attempt_count: int
        """
        self.total_games_played += 1
        word_count = session_results.get("word_count", 0)
        total_score = session_results.get("total_score", 0)
        attempt_count = session_results.get("attempt_count", 0)

        self.total_words_found += word_count
        self.total_points += total_score
        self.total_attempts += attempt_count

        self.best_score = max(self.best_score, total_score)
        self.best_word_count = max(self.best_word_count, word_count)

        self.updated_at = datetime.now().isoformat()

    def get_average_score(self) -> float:
        """Get average score per game"""
        if self.total_games_played == 0:
            return 0.0
        return round(
            self.total_points / self.total_games_played,
            2,
        )

    def get_average_words_per_game(self) -> float:
        """Get average words found per game"""
        if self.total_games_played == 0:
            return 0.0
        return round(
            self.total_words_found / self.total_games_played,
            2,
        )

    def to_dict(self) -> Dict:
        """Convert stats to dictionary for JSON storage"""
        return {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "total_games_played": self.total_games_played,
            "total_words_found": self.total_words_found,
            "total_points": self.total_points,
            "best_score": self.best_score,
            "best_word_count": self.best_word_count,
            "total_attempts": self.total_attempts,
            "average_score": self.get_average_score(),
            "average_words_per_game": self.get_average_words_per_game(),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "PlayerStats":
        """Create PlayerStats from dictionary"""
        stats = cls(data["player_id"], data.get("player_name", ""))
        stats.total_games_played = data.get("total_games_played", 0)
        stats.total_words_found = data.get("total_words_found", 0)
        stats.total_points = data.get("total_points", 0)
        stats.best_score = data.get("best_score", 0)
        stats.best_word_count = data.get("best_word_count", 0)
        stats.total_attempts = data.get("total_attempts", 0)
        stats.created_at = data.get(
            "created_at",
            datetime.now().isoformat(),
        )
        stats.updated_at = data.get(
            "updated_at",
            datetime.now().isoformat(),
        )
        return stats


class StatsTracker:
    """Global tracker for player statistics across all games"""

    def __init__(
        self,
        stats_file: Optional[str] = None,
    ):
        """
        Initialize stats tracker

        Args:
            stats_file: Path to JSON file for persistence
        """
        self.stats_file = (
            Path(stats_file) if stats_file else Path("data/player_stats.json")
        )
        self.player_stats: Dict[int, PlayerStats] = {}
        self.load_stats()

    def load_stats(self) -> None:
        """Load stats from JSON file"""
        if not self.stats_file.exists():
            return

        try:
            with open(self.stats_file, "r") as f:
                data = json.load(f)
                for player_id_str, stats_dict in data.items():
                    player_id = int(player_id_str)
                    stats = PlayerStats.from_dict(stats_dict)
                    self.player_stats[player_id] = stats
        except Exception as e:
            print(f"Error loading stats: {e}")

    def save_stats(self) -> None:
        """Save stats to JSON file"""
        try:
            self.stats_file.parent.mkdir(parents=True, exist_ok=True)

            data = {
                str(pid): stats.to_dict() for pid, stats in self.player_stats.items()
            }

            with open(self.stats_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving stats: {e}")

    def get_player_stats(
        self,
        player_id: int,
        player_name: str = "",
    ) -> PlayerStats:
        """
        Get or create stats for a player

        Args:
            player_id: Discord user ID
            player_name: Display name (used if new)

        Returns:
            PlayerStats object
        """
        if player_id not in self.player_stats:
            self.player_stats[player_id] = PlayerStats(
                player_id,
                player_name,
            )
        return self.player_stats[player_id]

    def update_player_stats(
        self,
        player_id: int,
        session_results: Dict,
    ) -> None:
        """
        Update player stats from a session

        Args:
            player_id: Discord user ID
            session_results: Session results dict
        """
        stats = self.get_player_stats(player_id)
        stats.update_from_session(session_results)
        self.save_stats()

    def get_leaderboard(
        self,
        limit: int = 10,
        sort_by: str = "total_points",
    ) -> List[Dict]:
        """
        Get top players leaderboard

        Args:
            limit: Number of players to return
            sort_by: Sort key (total_points, best_score,
                     total_games_played)

        Returns:
            List of player stats dicts sorted by criteria
        """
        sort_key_map = {
            "total_points": lambda s: s.total_points,
            "best_score": lambda s: s.best_score,
            "total_games_played": lambda s: s.total_games_played,
            "average_score": lambda s: s.get_average_score(),
        }

        sort_key_func = sort_key_map.get(
            sort_by,
            lambda s: s.total_points,
        )

        sorted_players = sorted(
            self.player_stats.values(),
            key=sort_key_func,
            reverse=True,
        )

        return [
            {
                "rank": rank,
                "player_id": s.player_id,
                "player_name": s.player_name,
                "total_points": s.total_points,
                "total_games": s.total_games_played,
                "best_score": s.best_score,
                "avg_score": s.get_average_score(),
                "total_words": s.total_words_found,
            }
            for rank, s in enumerate(
                sorted_players[:limit],
                1,
            )
        ]

    def get_player_rank(self, player_id: int) -> int:
        """Get player's rank by total points"""
        leaderboard = self.get_leaderboard(limit=10000)
        for entry in leaderboard:
            if entry["player_id"] == player_id:
                return entry["rank"]
        return -1  # Not in leaderboard
