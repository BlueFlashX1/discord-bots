"""Hangman game logic and state management"""

from datetime import datetime
from typing import Dict, List, Optional

GAMES_FILE = "data/active_games.json"

# Letter values based on Scrabble + game difficulty (rarity bonus)
LETTER_VALUES = {
    "Z": 10,
    "Q": 10,
    "X": 8,
    "J": 8,
    "K": 5,
    "W": 4,
    "Y": 4,
    "F": 4,
    "B": 3,
    "H": 4,
    "C": 3,
    "P": 3,
    "V": 4,
    "G": 2,
    "M": 1,
    "D": 1,
    "L": 1,
    "S": 1,
    "T": 1,
    "N": 1,
    "E": 1,
    "A": 1,
    "I": 1,
    "O": 1,
    "U": 1,
    "R": 1,
}


class HangmanGame:
    """Represents a single Hangman game instance"""

    MAX_MISTAKES = 6
    HANGMAN_STATES = [
        "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========\n```",  # 0
        "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========\n```",  # 1
        "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========\n```",  # 2
        "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========\n```",  # 3
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========\n```",  # 4
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========\n```",  # 5
        "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========\n```",  # 6 - Game Over
    ]

    def __init__(self, game_id: str, word: str, starter_id: int):
        self.game_id = game_id
        self.word = word.upper()
        self.starter_id = starter_id
        self.players: List[int] = [starter_id]
        self.guessed_letters: List[str] = []
        self.mistakes = 0
        self.current_player_index = 0
        self.game_state = "active"  # active, won, lost, cancelled
        self.created_at = datetime.now().isoformat()
        # Track individual player contributions
        self.player_guesses: Dict[int, List[str]] = {starter_id: []}
        self.player_letter_points: Dict[int, int] = {starter_id: 0}
        self.player_participation_points: Dict[int, int] = {
            starter_id: 0
        }  # +2 pts per guess (win or lose)
        self.game_winner_id: Optional[int] = None  # Who found final letter

    def get_display_word(self) -> str:
        """Get the word with unguessed letters as underscores"""
        display = ""
        for letter in self.word:
            if letter in self.guessed_letters or not letter.isalpha():
                display += letter
            else:
                display += "_"
        return " ".join(display)

    def add_player(self, player_id: int) -> tuple[bool, str]:
        """
        Add a player to the game if not already added

        Returns:
            (success: bool, message: str)
        """
        if player_id in self.players:
            return False, "Already in game"

        if len(self.players) >= 4:
            return False, "Game is full (max 4 players)"

        self.players.append(player_id)
        # Initialize tracking for new player
        self.player_guesses[player_id] = []
        self.player_letter_points[player_id] = 0
        self.player_participation_points[player_id] = 0
        return True, "Player added"

    def remove_player(self, player_id: int) -> tuple[bool, str]:
        """
        Remove a player from the game
        Starter cannot be removed

        Returns:
            (success: bool, message: str)
        """
        if player_id == self.starter_id:
            return False, "Game starter cannot leave"

        if player_id in self.players:
            self.players.remove(player_id)
            return True, "Player removed"

        return False, "Player not in game"

    def is_starter(self, player_id: int) -> bool:
        """Check if player is the game starter"""
        return player_id == self.starter_id

    def get_current_player_id(self) -> int:
        """Get the ID of the player whose turn it is"""
        return self.players[self.current_player_index]

    def guess_letter(self, letter: str) -> tuple[bool, str, bool, int]:
        """
        Process a letter guess

        Returns:
            (is_correct: bool, message: str, has_bonus_guess: bool, letter_value: int)
        """
        letter = letter.upper()

        # Validate input
        if not letter.isalpha() or len(letter) != 1:
            return False, "Please enter a single letter!", False, 0

        if letter in self.guessed_letters:
            return False, f"Letter **{letter}** already guessed!", False, 0

        self.guessed_letters.append(letter)
        current_player_id = self.get_current_player_id()
        letter_value = LETTER_VALUES.get(letter, 0)

        # Track player's guesses
        self.player_guesses[current_player_id].append(letter)
        # Award participation points: +2 pts for every guess (correct or wrong)
        self.player_participation_points[current_player_id] += 2

        if letter in self.word:
            # Correct guess - track letter points
            self.player_letter_points[current_player_id] += letter_value

            # Check if won
            if self._is_word_complete():
                self.game_state = "won"
                self.game_winner_id = current_player_id  # Track who won
                return (
                    True,
                    f"🎉 **{letter}** is correct! You found the word!",
                    False,
                    letter_value,
                )

            # Momentum system: correct guess = bonus guess (don't pass turn)
            return (
                True,
                f"✅ **{letter}** is in the word! (+{letter_value} pts, bonus guess!)",
                True,
                letter_value,
            )
        else:
            # Wrong guess - pass turn to next player
            self.mistakes += 1
            if self.mistakes >= self.MAX_MISTAKES:
                self.game_state = "lost"
                return (
                    False,
                    f"❌ **{letter}** is wrong! Game Over! "
                    f"The word was: **{self.word}**",
                    False,
                    0,
                )
            return (
                False,
                f"❌ **{letter}** is not in the word. "
                f"Mistakes: {self.mistakes}/{self.MAX_MISTAKES}",
                False,
                0,
            )

    def _is_word_complete(self) -> bool:
        """Check if all letters of the word have been guessed"""
        for letter in self.word:
            if letter.isalpha() and letter not in self.guessed_letters:
                return False
        return True

    def next_turn(self):
        """Move to the next player's turn"""
        if len(self.players) > 0:
            self.current_player_index = (self.current_player_index + 1) % len(
                self.players
            )

    def get_hangman_display(self) -> str:
        """Get the ASCII art hangman for current mistake count"""
        return self.HANGMAN_STATES[min(self.mistakes, self.MAX_MISTAKES)]

    def calculate_score(self) -> int:
        """
        Calculate score based on game performance

        Scoring system:
        - Base: 100 points
        - Word length bonus: word_length × 10
        - Perfect game (0 mistakes): 50 bonus points
        - Mistake penalty: mistakes × 20

        Example: 6-letter word, 2 mistakes
        Score = 100 + (6 × 10) + 0 - (2 × 20) = 120 points
        """
        if self.game_state != "won":
            return 0

        base_score = 100
        word_length_bonus = len(self.word) * 10
        perfect_bonus = 50 if self.mistakes == 0 else 0
        mistake_penalty = self.mistakes * 20

        total_score = base_score + word_length_bonus + perfect_bonus - mistake_penalty
        return max(total_score, 50)  # Minimum 50 points for a win

    def calculate_individual_scores(self) -> Dict[int, int]:
        """
        Calculate scores for each player with hybrid scoring system:
        - Base team score (divided equally)
        - Letter rarity bonuses (Scrabble-based)
        - Participation points (+2 per guess)
        - Winner bonus (for finding final letter)

        Returns:
            Dict mapping player_id -> total_points
        """
        if self.game_state != "won":
            return {pid: 0 for pid in self.players}

        # Calculate base team score
        base_team_score = self.calculate_score()

        # Divide base score equally among all players
        base_per_player = base_team_score // len(self.players)

        # Calculate winner bonus based on mistakes (encourages winning)
        winner_bonus = self._calculate_winner_bonus()

        individual_scores = {}
        for player_id in self.players:
            letter_bonus = self.player_letter_points.get(player_id, 0)
            participation = self.player_participation_points.get(player_id, 0)

            # Start with base score
            score = base_per_player + letter_bonus + participation

            # Add winner bonus if this player found the word
            if player_id == self.game_winner_id:
                score += winner_bonus

            individual_scores[player_id] = score

        return individual_scores

    def _calculate_winner_bonus(self) -> int:
        """
        Calculate bonus for the player who found the final letter
        Based on difficulty (mistakes)

        Returns:
            Bonus points (0-20)
        """
        if self.mistakes == 0:
            return 20  # Perfect game - big bonus for winning perfectly
        elif self.mistakes <= 2:
            return 15  # Good game - solid bonus
        elif self.mistakes <= 4:
            return 10  # Average game - modest bonus
        else:
            return 5  # Hard game - small bonus

    def get_game_status(self) -> Dict:
        """Get current game status as a dictionary"""
        return {
            "game_id": self.game_id,
            "word": self.word,
            "starter_id": self.starter_id,
            "players": self.players,
            "guessed_letters": self.guessed_letters,
            "mistakes": self.mistakes,
            "current_player_index": self.current_player_index,
            "game_state": self.game_state,
            "created_at": self.created_at,
        }


# Global games tracker
active_games: Dict[str, HangmanGame] = {}


def create_game(game_id: str, word: str, starter_id: int) -> HangmanGame:
    """Create a new game"""
    game = HangmanGame(game_id, word, starter_id)
    active_games[game_id] = game
    return game


def get_game(game_id: str) -> Optional[HangmanGame]:
    """Get a game by ID"""
    return active_games.get(game_id)


def delete_game(game_id: str):
    """Delete a game"""
    if game_id in active_games:
        del active_games[game_id]


def list_active_games() -> Dict[str, HangmanGame]:
    """Get all active games"""
    return active_games
