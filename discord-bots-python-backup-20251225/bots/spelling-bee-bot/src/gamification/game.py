"""Spelling Bee game logic and session management"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

SESSIONS_FILE = "data/spelling_sessions.json"


class GameRegistry:
    """
    Global registry for all active games.

    Enables:
    - Finding games by ID, channel, or player
    - Preventing duplicate joins
    - Supporting concurrent games per guild
    """

    _games: Dict[str, "SpellingBeeGame"] = {}
    # player_id → list of game IDs
    _player_games: Dict[int, List[str]] = {}
    # channel_id → game_id (one game per channel)
    _channel_games: Dict[int, str] = {}

    @classmethod
    def register_game(
        cls,
        game: "SpellingBeeGame",
        channel_id: int,
    ) -> None:
        """
        Register a new game in the registry.

        Args:
            game: The SpellingBeeGame instance
            channel_id: The Discord channel ID
        """
        # Register by game ID
        cls._games[game.game_id] = game

        # Register channel
        cls._channel_games[channel_id] = game.game_id

        # Register starter player
        if game.starter_id not in cls._player_games:
            cls._player_games[game.starter_id] = []
        cls._player_games[game.starter_id].append(game.game_id)

    @classmethod
    def unregister_game(cls, game_id: str) -> None:
        """
        Remove a game from the registry.

        Args:
            game_id: The game ID to remove
        """
        if game_id not in cls._games:
            return

        # Remove from game registry
        del cls._games[game_id]

        # Remove from channel registry
        for ch_id, g_id in list(cls._channel_games.items()):
            if g_id == game_id:
                del cls._channel_games[ch_id]
                break

        # Remove from player registry
        for player_id, game_ids in list(cls._player_games.items()):
            if game_id in game_ids:
                cls._player_games[player_id].remove(game_id)
                if not cls._player_games[player_id]:
                    del cls._player_games[player_id]

    @classmethod
    def get_game_by_id(cls, game_id: str) -> Optional["SpellingBeeGame"]:
        """
        Get a game by its ID.

        Args:
            game_id: The game ID

        Returns:
            The game or None if not found
        """
        return cls._games.get(game_id)

    @classmethod
    def get_game_by_channel(cls, channel_id: int) -> Optional["SpellingBeeGame"]:
        """
        Get the active game in a channel.

        Args:
            channel_id: The Discord channel ID

        Returns:
            The active game in that channel, or None
        """
        game_id = cls._channel_games.get(channel_id)
        if game_id:
            return cls._games.get(game_id)
        return None

    @classmethod
    def get_player_games(cls, player_id: int) -> List["SpellingBeeGame"]:
        """
        Get all active games for a player.

        Args:
            player_id: The Discord player ID

        Returns:
            List of active games the player is in
        """
        game_ids = cls._player_games.get(player_id, [])
        return [cls._games[gid] for gid in game_ids if gid in cls._games]

    @classmethod
    def get_player_current_game(cls, player_id: int) -> Optional["SpellingBeeGame"]:
        """
        Get the player's current active game.

        Useful for /reconnect command.

        Args:
            player_id: The Discord player ID

        Returns:
            The active game, or None if not in a game
        """
        games = cls.get_player_games(player_id)
        if games:
            # Return the first active game
            return games[0]
        return None

    @classmethod
    def is_player_in_game(cls, player_id: int, game_id: str) -> bool:
        """
        Check if a player is already in a specific game.

        Args:
            player_id: The Discord player ID
            game_id: The game ID

        Returns:
            True if player is in the game
        """
        game_ids = cls._player_games.get(player_id, [])
        return game_id in game_ids

    @classmethod
    def add_player_to_registry(cls, player_id: int, game_id: str) -> None:
        """
        Register that a player joined a game.

        Args:
            player_id: The Discord player ID
            game_id: The game ID
        """
        if player_id not in cls._player_games:
            cls._player_games[player_id] = []
        if game_id not in cls._player_games[player_id]:
            cls._player_games[player_id].append(game_id)

    @classmethod
    def remove_player_from_registry(cls, player_id: int, game_id: str) -> None:
        """
        Register that a player left a game.

        Args:
            player_id: The Discord player ID
            game_id: The game ID
        """
        if player_id in cls._player_games:
            if game_id in cls._player_games[player_id]:
                cls._player_games[player_id].remove(game_id)
            if not cls._player_games[player_id]:
                del cls._player_games[player_id]

    @classmethod
    def get_all_active_games(cls) -> Dict[str, "SpellingBeeGame"]:
        """
        Get all currently active games.

        Returns:
            Dictionary of game_id → SpellingBeeGame
        """
        return cls._games.copy()

    @classmethod
    def get_game_count(cls) -> int:
        """Get total number of active games."""
        return len(cls._games)

    @classmethod
    def clear_all(cls) -> None:
        """Clear all game registrations (useful for testing)."""
        cls._games.clear()
        cls._player_games.clear()
        cls._channel_games.clear()


class SpellingBeeGame:
    """Represents a single spelling bee game session with simultaneous timer-based gameplay"""

    def __init__(
        self,
        game_id: str,
        starter_id: int,
        letters: str,
        possible_words: List[Dict],
    ):
        """
        Initialize a spelling bee game

        Args:
            game_id: Unique game identifier
            starter_id: Discord ID of game starter
            letters: Random letters for this session
            possible_words: List of possible words with data
        """
        self.game_id = game_id
        self.starter_id = starter_id
        self.letters = letters.upper()
        self.possible_words = {w["word"]: w for w in possible_words}
        self.participants: Dict[int, Dict] = {starter_id: self._init_player()}
        self.game_state = "active"  # active, completed, cancelled
        self.created_at = datetime.now().isoformat()
        self.game_started_at: Optional[str] = None
        self.game_ended_at: Optional[str] = None
        self.session_attempts: Dict[int, List[Dict]] = {}
        self.session_errors: List[Dict] = []

    def _init_player(self) -> Dict:
        """Initialize player data structure"""
        return {
            "words_found": [],
            "total_points": 0,
            "attempts": [],
            "errors": [],
        }

    def mark_game_started(self):
        """Record game start time (called when timer begins)"""
        self.game_started_at = datetime.now().isoformat()

    def mark_game_ended(self):
        """Record game end time (called when timer expires)"""
        self.game_ended_at = datetime.now().isoformat()
        self.game_state = "completed"

    def add_participant(self, player_id: int) -> Tuple[bool, str]:
        """
        Add a player to the game

        Returns:
            (success: bool, message: str)
        """
        if player_id in self.participants:
            return False, "Already in game"

        if len(self.participants) >= 4:
            return False, "Game is full (max 4 players)"

        self.participants[player_id] = self._init_player()
        # Register with global registry
        GameRegistry.add_player_to_registry(player_id, self.game_id)
        return True, "Player added"

    def remove_participant(self, player_id: int) -> Tuple[bool, str]:
        """
        Remove a player from the game

        Returns:
            (success: bool, message: str)
        """
        if player_id == self.starter_id:
            return False, "Starter cannot leave"

        if player_id not in self.participants:
            return False, "Player not in game"

        del self.participants[player_id]
        # Unregister with global registry
        GameRegistry.remove_player_from_registry(player_id, self.game_id)
        return True, "Player removed"

    def submit_word(self, player_id: int, word: str) -> Tuple[bool, int, Optional[str]]:
        """
        Submit a word for validation

        Args:
            player_id: Player submitting the word
            word: Word to submit

        Returns:
            (is_valid: bool, points: int, message: str)
        """
        if player_id not in self.participants:
            return False, 0, "Player not in game"

        word = word.upper()

        # Track attempt
        if player_id not in self.session_attempts:
            self.session_attempts[player_id] = []

        attempt = {"word": word, "timestamp": datetime.now().isoformat()}
        self.session_attempts[player_id].append(attempt)

        # Check if word already found by this player
        if word in self.participants[player_id]["words_found"]:
            return False, 0, f"You already found '{word}'"

        # Check if word is in available words
        if word not in self.possible_words:
            # Track as error
            error_record = {
                "player_id": player_id,
                "word": word,
                "type": "invalid_word",
                "timestamp": datetime.now().isoformat(),
            }
            self.session_errors.append(error_record)
            self.participants[player_id]["errors"].append(error_record)

            return False, 0, f"'{word}' is not a valid word from these letters"

        # Valid word found!
        word_data = self.possible_words[word]
        points = word_data.get("points", 5)

        self.participants[player_id]["words_found"].append(word)
        self.participants[player_id]["total_points"] += points

        return True, points, f"✅ Found '{word}' for {points} points!"

    def get_leaderboard(self) -> List[Tuple[int, str, int, int]]:
        """
        Get current leaderboard

        Returns:
            List of (player_id, player_name, points, words_found_count)
        """
        leaderboard = []
        for player_id, data in self.participants.items():
            leaderboard.append(
                (
                    player_id,
                    f"<@{player_id}>",
                    data["total_points"],
                    len(data["words_found"]),
                )
            )

        # Sort by points (descending)
        leaderboard.sort(key=lambda x: x[2], reverse=True)
        return leaderboard

    def get_player_stats(self, player_id: int) -> Optional[Dict]:
        """Get statistics for a specific player"""
        if player_id not in self.participants:
            return None

        player_data = self.participants[player_id]
        return {
            "player_id": player_id,
            "words_found": player_data["words_found"],
            "total_points": player_data["total_points"],
            "words_count": len(player_data["words_found"]),
            "errors_count": len(player_data["errors"]),
            "attempts_count": len(self.session_attempts.get(player_id, [])),
        }

    def get_game_summary(self) -> Dict:
        """Get complete game summary"""
        return {
            "game_id": self.game_id,
            "starter_id": self.starter_id,
            "letters": self.letters,
            "created_at": self.created_at,
            "game_state": self.game_state,
            "participants": len(self.participants),
            "leaderboard": self.get_leaderboard(),
            "possible_words_count": len(self.possible_words),
            "words_found_total": sum(
                len(p["words_found"]) for p in self.participants.values()
            ),
        }


# Global games tracker (legacy, use GameRegistry instead)
active_games: Dict[str, SpellingBeeGame] = {}


def create_game(
    game_id: str,
    starter_id: int,
    letters: str,
    possible_words: List[Dict],
) -> SpellingBeeGame:
    """Create a new game"""
    game = SpellingBeeGame(game_id, starter_id, letters, possible_words)
    active_games[game_id] = game
    return game


def get_game(game_id: str) -> Optional[SpellingBeeGame]:
    """Get a game by ID"""
    return active_games.get(game_id)


def delete_game(game_id: str):
    """Delete a game"""
    if game_id in active_games:
        del active_games[game_id]


def list_active_games() -> Dict[str, SpellingBeeGame]:
    """Get all active games"""
    return active_games
