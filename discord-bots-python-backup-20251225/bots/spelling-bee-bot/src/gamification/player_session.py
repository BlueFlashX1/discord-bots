"""Player game session tracking and word validation.

This module provides classes for tracking individual player performance and
aggregated game session results. It serves as the source of truth for all
game scoring data.

Classes:
    PlayerSession: Tracks one player's performance in a single game.
    GameSessionTracker: Tracks all players' performance in a single game.
    WordData: TypedDict for word submission data structure.
    PlayerSummary: TypedDict for player session summary.
    GameSummary: TypedDict for complete game session summary.

Example:
    >>> tracker = GameSessionTracker("game-123")
    >>> tracker.add_player(456, "Alice")
    >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
    >>> leaderboard = tracker.get_leaderboard()
    >>> print(tracker.get_summary())
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple, TypedDict


class WordData(TypedDict):
    """Data structure for a single word submission.

    Attributes:
        word: The word found (uppercase string).
        points: Points awarded for this word.
        definition: Definition fetched from OpenAI API.
    """

    word: str
    points: int
    definition: str


class PlayerSummary(TypedDict):
    """Summary data for a single player's session.

    Attributes:
        player_id: Discord user ID.
        player_name: Player's display name.
        valid_words: List of words with points and definitions.
        attempt_count: Total submission attempts.
        total_score: Sum of all points.
        word_count: Number of unique words found.
        started_at: ISO format timestamp when session started.
        ended_at: ISO format timestamp when session ended (or None if ongoing).
    """

    player_id: int
    player_name: str
    valid_words: List[Tuple[str, int, str]]
    attempt_count: int
    total_score: int
    word_count: int
    started_at: str
    ended_at: Optional[str]


class GameSummary(TypedDict):
    """Summary data for an entire game session.

    Attributes:
        game_id: Unique game identifier.
        started_at: ISO format timestamp when game started.
        ended_at: ISO format timestamp when game ended (or None if ongoing).
        total_players: Number of players in the game.
        leaderboard: List of (player_id, name, score, word_count, attempts).
        players: Dictionary mapping player_id to PlayerSummary.
    """

    game_id: str
    started_at: str
    ended_at: Optional[str]
    total_players: int
    leaderboard: List[Tuple[int, str, int, int, int]]
    players: Dict[int, PlayerSummary]


class PlayerSession:
    """Tracks an individual player's performance in a single game session.

    This class maintains all data related to one player's game including words
    found, points earned, attempts made, and session timestamps. It is the
    primary unit of session tracking and aggregates to GameSessionTracker.

    Attributes:
        player_id (int): Discord user ID.
        player_name (str): Player's display name.
        valid_words (List[Tuple[str, int, str]]): Valid words with
            (word, points, definition) tuples.
        attempt_count (int): Total number of word submission attempts.
        started_at (str): ISO format timestamp when session started.
        ended_at (Optional[str]): ISO format timestamp when ended, None if
            ongoing.

    Example:
        >>> session = PlayerSession(123, "Alice")
        >>> session.add_valid_word("HELLO", 10, "A greeting")
        >>> session.add_valid_word("WORLD", 8, "The planet")
        >>> print(session.get_total_score())
        18
        >>> print(session.get_word_count())
        2
        >>> session.end_session()
        >>> print(session.to_dict())
        {'player_id': 123, 'player_name': 'Alice', ...}
    """

    def __init__(self, player_id: int, player_name: str) -> None:
        """Initialize a new player session.

        Args:
            player_id: Discord user ID (integer).
            player_name: Player's display name (string).

        Raises:
            TypeError: If player_id is not an integer.
            ValueError: If player_name is empty string.
        """
        self.player_id: int = player_id
        self.player_name: str = player_name
        self.valid_words: List[Tuple[str, int, str]] = []
        self.attempt_count: int = 0
        self.started_at: str = datetime.now().isoformat()
        self.ended_at: Optional[str] = None

    def add_valid_word(self, word: str, points: int, definition: str) -> None:
        """Add a valid word that the player found.

        Args:
            word: The word found (uppercase, 3-15 characters).
            points: Points awarded for this word (integer >= 0).
            definition: Definition from OpenAI API (non-empty string).

        Returns:
            None

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.add_valid_word("HELLO", 10, "A greeting")
            >>> assert len(session.valid_words) == 1
        """
        self.valid_words.append((word, points, definition))

    def increment_attempt(self) -> None:
        """Increment the attempt counter by one.

        Used to track how many times the player submitted words (valid or
        invalid). Called for each submission attempt.

        Returns:
            None

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.increment_attempt()
            >>> session.increment_attempt()
            >>> assert session.attempt_count == 2
        """
        self.attempt_count += 1

    def get_total_score(self) -> int:
        """Calculate total score from all valid words.

        Sums the points from every valid word found by this player.

        Args:
            None

        Returns:
            Total points as integer (>= 0).

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.add_valid_word("HELLO", 10, "A greeting")
            >>> session.add_valid_word("WORLD", 8, "The planet")
            >>> assert session.get_total_score() == 18
        """
        return sum(points for _, points, _ in self.valid_words)

    def get_word_count(self) -> int:
        """Get the number of valid words found by this player.

        Args:
            None

        Returns:
            Number of unique words found (integer >= 0).

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.add_valid_word("HELLO", 10, "A greeting")
            >>> session.add_valid_word("WORLD", 8, "The planet")
            >>> assert session.get_word_count() == 2
        """
        return len(self.valid_words)

    def end_session(self) -> None:
        """Mark the session as ended and record completion time.

        Sets ended_at timestamp to current time in ISO format. Should be
        called when game timer expires or game is manually ended.

        Args:
            None

        Returns:
            None

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.end_session()
            >>> assert session.ended_at is not None
        """
        self.ended_at = datetime.now().isoformat()

    def to_dict(self) -> PlayerSummary:
        """Convert session to dictionary for storage/serialization.

        Creates a complete representation of the session suitable for
        JSON serialization or database storage. All fields are included.

        Args:
            None

        Returns:
            PlayerSummary TypedDict with all session data.

        Example:
            >>> session = PlayerSession(123, "Alice")
            >>> session.add_valid_word("HELLO", 10, "A greeting")
            >>> summary = session.to_dict()
            >>> assert summary["player_id"] == 123
            >>> assert summary["total_score"] == 10
        """
        return PlayerSummary(
            player_id=self.player_id,
            player_name=self.player_name,
            valid_words=self.valid_words,
            attempt_count=self.attempt_count,
            total_score=self.get_total_score(),
            word_count=self.get_word_count(),
            started_at=self.started_at,
            ended_at=self.ended_at,
        )


class GameSessionTracker:
    """Tracks all players' performance in a single game session.

    This is the source of truth for game session data. It maintains a
    dictionary of PlayerSession objects and provides aggregated views of
    game results (leaderboards, summaries). Used by PrivateGameManager
    and views to get accurate game state.

    Attributes:
        game_id (str): Unique game identifier.
        players (Dict[int, PlayerSession]): Maps player_id to their session.
        started_at (str): ISO format timestamp when game started.
        ended_at (Optional[str]): ISO format timestamp when ended, None if
            ongoing.

    Note:
        This is the PRIMARY tracking mechanism. SpellingBeeGame.participants
        is NOT used for final results - all results come from this tracker.

    Example:
        >>> tracker = GameSessionTracker("game-123")
        >>> tracker.add_player(456, "Alice")
        >>> tracker.add_player(789, "Bob")
        >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
        >>> tracker.record_valid_word(789, "WORLD", 8, "The planet")
        >>> leaderboard = tracker.get_leaderboard()
        >>> # leaderboard = [(456, "Alice", 10, 1, 1), (789, "Bob", 8, 1, 1)]
        >>> summary = tracker.get_summary()
    """

    def __init__(self, game_id: str) -> None:
        """Initialize a new game session tracker.

        Args:
            game_id: Unique identifier for this game (non-empty string).

        Raises:
            ValueError: If game_id is empty string.
        """
        self.game_id: str = game_id
        self.players: Dict[int, PlayerSession] = {}
        self.started_at: str = datetime.now().isoformat()
        self.ended_at: Optional[str] = None

    def add_player(self, player_id: int, player_name: str) -> None:
        """Add a player to session tracking.

        Creates a new PlayerSession for the player if they're not already
        tracked. Idempotent - calling multiple times is safe.

        Args:
            player_id: Discord user ID (integer).
            player_name: Player's display name (string).

        Returns:
            None

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> assert 456 in tracker.players
        """
        if player_id not in self.players:
            self.players[player_id] = PlayerSession(player_id, player_name)

    def record_attempt(self, player_id: int) -> None:
        """Record a submission attempt by a player.

        Increments the attempt counter for the player. Called for each word
        submission, whether valid or invalid.

        Args:
            player_id: Discord user ID (integer).

        Returns:
            None

        Note:
            Silent no-op if player_id not in tracker (player not added yet).

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.record_attempt(456)
            >>> assert tracker.players[456].attempt_count == 1
        """
        if player_id in self.players:
            self.players[player_id].increment_attempt()

    def record_valid_word(
        self,
        player_id: int,
        word: str,
        points: int,
        definition: str,
    ) -> None:
        """Record a valid word submission by a player.

        Adds the word to the player's session. Called after validation and
        definition fetching are complete.

        Args:
            player_id: Discord user ID (integer).
            word: The word found (uppercase, 3-15 characters).
            points: Points awarded (integer >= 0).
            definition: Definition from OpenAI API (non-empty string).

        Returns:
            None

        Note:
            Silent no-op if player_id not in tracker.

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
            >>> assert len(tracker.players[456].valid_words) == 1
        """
        if player_id in self.players:
            self.players[player_id].add_valid_word(word, points, definition)

    def end_session(self) -> None:
        """End the game session for all players.

        Marks the session as complete with current timestamp. Called when
        game timer expires.

        Args:
            None

        Returns:
            None

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.end_session()
            >>> assert tracker.ended_at is not None
            >>> assert tracker.players[456].ended_at is not None
        """
        self.ended_at = datetime.now().isoformat()
        for player in self.players.values():
            player.end_session()

    def get_leaderboard(
        self,
    ) -> List[Tuple[int, str, int, int, int]]:
        """Get leaderboard sorted by score (descending).

        Returns all players ranked by total points. Includes player ID,
        name, score, word count, and attempt count.

        Args:
            None

        Returns:
            List of tuples: (player_id, name, score, word_count, attempts)
            Sorted by score descending (highest first).

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.add_player(789, "Bob")
            >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
            >>> tracker.record_valid_word(789, "WORLD", 8, "The planet")
            >>> leaderboard = tracker.get_leaderboard()
            >>> # [(456, "Alice", 10, 1, 1), (789, "Bob", 8, 1, 1)]
            >>> leaderboard[0][2] > leaderboard[1][2]  # Alice > Bob
            True
        """
        board: List[Tuple[int, str, int, int, int]] = []
        for player in self.players.values():
            board.append(
                (
                    player.player_id,
                    player.player_name,
                    player.get_total_score(),
                    player.get_word_count(),
                    player.attempt_count,
                )
            )
        # Sort by score descending
        board.sort(key=lambda x: x[2], reverse=True)
        return board

    def get_player_words(self, player_id: int) -> List[Tuple[str, int, str]]:
        """Get player's valid words with points and definitions.

        Returns a copy of the player's valid words list.

        Args:
            player_id: Discord user ID (integer).

        Returns:
            List of (word, points, definition) tuples. Empty list if player
            not found or no words.

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
            >>> words = tracker.get_player_words(456)
            >>> assert words[0][0] == "HELLO"
        """
        if player_id in self.players:
            return self.players[player_id].valid_words.copy()
        return []

    def get_player_score(self, player_id: int) -> int:
        """Get player's total score.

        Sums all points from valid words found by the player.

        Args:
            player_id: Discord user ID (integer).

        Returns:
            Total points (integer >= 0). Returns 0 if player not found.

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
            >>> assert tracker.get_player_score(456) == 10
            >>> assert tracker.get_player_score(999) == 0
        """
        if player_id in self.players:
            return self.players[player_id].get_total_score()
        return 0

    def get_summary(self) -> GameSummary:
        """Get complete session summary suitable for storage/transmission.

        Returns a comprehensive snapshot of the entire game session
        including all players and their data.

        Args:
            None

        Returns:
            GameSummary TypedDict with complete game state.

        Example:
            >>> tracker = GameSessionTracker("game-123")
            >>> tracker.add_player(456, "Alice")
            >>> tracker.record_valid_word(456, "HELLO", 10, "A greeting")
            >>> tracker.end_session()
            >>> summary = tracker.get_summary()
            >>> assert summary["game_id"] == "game-123"
            >>> assert summary["total_players"] == 1
            >>> assert summary["ended_at"] is not None
            >>> import json
            >>> json_str = json.dumps(summary)  # Fully serializable
        """
        return GameSummary(
            game_id=self.game_id,
            started_at=self.started_at,
            ended_at=self.ended_at,
            total_players=len(self.players),
            leaderboard=self.get_leaderboard(),
            players={pid: player.to_dict() for pid, player in self.players.items()},
        )
