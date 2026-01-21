"""Session saver - persists game results to JSON without sensitive data"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.gamification.player_session import GameSessionTracker


class SessionSaver:
    """Save completed game sessions to JSON files securely"""

    def __init__(self, results_file: Optional[str] = None):
        """
        Initialize session saver

        Args:
            results_file: Path to JSON file for session results
        """
        self.results_file = (
            Path(results_file) if results_file else Path("data/session_results.json")
        )

    def save_session(
        self,
        game_id: str,
        letters: str,
        session_tracker: GameSessionTracker,
    ) -> bool:
        """
        Save a completed game session

        NO SENSITIVE DATA SAVED:
        - NO Discord tokens
        - NO API keys
        - NO passwords
        - NO user private info

        Saved data:
        - game_id: Unique game identifier
        - letters: Game letters
        - timestamp: When game completed
        - players: List of {player_id, player_name, score, words, attempts}
        - statistics: Total words, average score, etc.

        Args:
            game_id: Unique game identifier
            letters: Game letters used
            session_tracker: GameSessionTracker with all session data

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Compile session data (NO SENSITIVE INFO)
            players_data = []
            for player_id, session in session_tracker.players.items():
                player_data = {
                    "player_id": player_id,
                    "player_name": session.player_name,
                    "total_score": session.get_total_score(),
                    "word_count": session.get_word_count(),
                    "attempt_count": session.attempt_count,
                    "words": [
                        {
                            "word": word,
                            "points": points,
                            "definition": definition,
                        }
                        for word, points, definition in session.valid_words
                    ],
                }
                players_data.append(player_data)

            # Calculate aggregate stats
            total_words = sum(p["word_count"] for p in players_data)
            avg_score = (
                sum(p["total_score"] for p in players_data) / len(players_data)
                if players_data
                else 0
            )

            # Create session record
            session_record = {
                "game_id": game_id,
                "letters": letters,
                "player_count": len(players_data),
                "total_unique_words": total_words,
                "average_score": round(avg_score, 2),
                "timestamp": datetime.now().isoformat(),
                "players": players_data,
            }

            # Append to results file
            self.results_file.parent.mkdir(parents=True, exist_ok=True)

            # Load existing results or create new list
            results = []
            if self.results_file.exists():
                try:
                    with open(
                        self.results_file,
                        "r",
                        encoding="utf-8",
                    ) as f:
                        results = json.load(f)
                except Exception:
                    results = []

            # Append new session
            results.append(session_record)

            # Save back to file
            with open(
                self.results_file,
                "w",
                encoding="utf-8",
            ) as f:
                json.dump(results, f, indent=2)

            return True

        except Exception as e:
            print(f"Error saving session: {e}")
            return False

    def get_game_history(
        self,
        player_id: Optional[int] = None,
    ) -> list:
        """
        Get game history

        Args:
            player_id: Optional - filter by specific player

        Returns:
            List of session records
        """
        if not self.results_file.exists():
            return []

        try:
            with open(
                self.results_file,
                "r",
                encoding="utf-8",
            ) as f:
                results = json.load(f)

            if player_id:
                # Filter to specific player's games
                filtered = []
                for session in results:
                    for player_data in session.get("players", []):
                        if player_data["player_id"] == player_id:
                            filtered.append(session)
                            break
                return filtered

            return results

        except Exception as e:
            print(f"Error reading session history: {e}")
            return []

    def verify_no_sensitive_data(self) -> bool:
        """
        Verify that saved session files contain NO sensitive data

        Returns:
            True if no sensitive data found, False if potential issue
        """
        if not self.results_file.exists():
            return True

        try:
            with open(
                self.results_file,
                "r",
                encoding="utf-8",
            ) as f:
                content = f.read()

            # Check for common sensitive data patterns
            sensitive_patterns = [
                "token",
                "api_key",
                "password",
                "secret",
                "Bearer ",
                "oauth",
            ]

            content_lower = content.lower()
            for pattern in sensitive_patterns:
                if pattern in content_lower:
                    print(f"⚠️ WARNING: Potential sensitive data " f"found: {pattern}")
                    return False

            print("✅ Session files verified - no sensitive data found")
            return True

        except Exception as e:
            print(f"Error verifying data: {e}")
            return False
