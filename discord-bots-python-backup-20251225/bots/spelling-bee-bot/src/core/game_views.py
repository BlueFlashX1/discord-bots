"""Private game interaction views for individual players.

This module provides UI components for the Spelling Bee game that are sent
to players as Direct Messages. It implements the complete player interaction
flow:

1. PlayerGameEmbed - Visual representation of game state in DM
   - Shows available letters and timer
   - Displays found words with definitions and points
   - Updates dynamically as players submit words

2. PlayerGameView - Interactive button container for player actions
   - Contains "📝 Submit Word" button
   - Opens WordSubmitModal when clicked
   - Automatically times out when game ends

3. WordSubmitModal - Text input form for word submission
   - Validates word length (3-15 chars)
   - Uses available letters as placeholder hint
   - Submits to game handler for validation

Data Flow:
    1. Game starts → PrivateGameManager.initialize_player()
    2. Player gets DM with PlayerGameEmbed + PlayerGameView
    3. Player clicks "Submit Word" button → WordSubmitModal opens
    4. Player types word → Modal submitted to game handler
    5. Handler validates word + fetches definition
    6. PlayerGameEmbed.update_embed() refreshes display
    7. Loop continues until timer expires

The views are completely stateless - all state is in GameSessionTracker.
Messages are simply views of that state.

Attributes:
    discord (module): Discord.py library for DM/embed functionality.
    ui (module): Discord.py UI components (Modal, View, Button).
"""

from typing import Callable, Optional

import discord
from discord import ui
from src.core.logger import log_debug, log_error_traceback


class WordSubmitModal(ui.Modal):
    """Modal for submitting a word during active game.

    Provides a text input form that players interact with when they click
    the "Submit Word" button. Validates word length and passes submission
    to the game handler for validation.

    The modal is ephemeral and only visible to the player who clicked the
    button. Automatically normalizes input to uppercase and strips whitespace.

    Attributes:
        player_id (int): Discord user ID of the player.
        letters (str): Available letters for this game (used as hint).
        on_submit_callback (Callable): Async function to call on submission.
            Signature: async def callback(interaction, player_id, word)
        word_input (ui.TextInput): The text input component.

    Example:
        >>> modal = WordSubmitModal(
        ...     player_id=456,
        ...     letters="AEIOUX",
        ...     on_submit=handle_word_submission,
        ...     timeout=300
        ... )
        >>> # User types "AXLE" and submits
        >>> # on_submit callback invoked with ("AXLE", 456, INTERACTION)
    """

    def __init__(
        self,
        player_id: int,
        letters: str,
        on_submit: Callable,
        timeout: float = 300,
    ) -> None:
        """Initialize word submit modal.

        Args:
            player_id: Discord user ID (integer).
            letters: Available letters for this game (string, shown as hint).
            on_submit: Async callback function when word submitted.
                Signature: async def callback(interaction, player_id, word)
            timeout: Modal timeout in seconds (default 300).

        Returns:
            None

        Example:
            >>> async def handle_submission(interaction, pid, word):
            ...     print(f"Player {pid} submitted '{word}'")
            >>>
            >>> modal = WordSubmitModal(
            ...     456,
            ...     "AEIOUX",
            ...     handle_submission
            ... )
        """
        super().__init__(title="Submit a Word", timeout=timeout)
        self.player_id: int = player_id
        self.letters: str = letters
        self.on_submit_callback: Callable = on_submit

        # Add word input field
        self.word_input: ui.TextInput = ui.TextInput(
            label="Enter a word",
            placeholder=f"Use letters from: {letters}",
            min_length=3,
            max_length=15,
            required=True,
        )
        self.add_item(self.word_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        """Handle modal submission by player.

        Extracts the word, normalizes it (uppercase, strip whitespace),
        and passes it to the game handler. Automatically defers response
        as ephemeral to avoid publicly exposing the submission.

        Args:
            interaction: Discord interaction object representing the
                modal submission.

        Returns:
            None

        Note:
            All exceptions are caught and logged. If word submission fails,
            an error message is sent to the player.

        Example:
            >>> # Called automatically when player submits modal
            >>> # Handler receives interaction, player_id=456, word="HELLO"
            >>> # Game validates word and sends result to player
        """
        try:
            word: str = self.word_input.value.strip().upper()

            # Defer response to avoid "Application did not respond" error
            await interaction.response.defer(ephemeral=True)

            # Call the game's word submission handler with normalized word
            await self.on_submit_callback(interaction, self.player_id, word)

        except Exception as e:
            log_error_traceback(e, "WordSubmitModal.on_submit")
            try:
                # Send error message to player
                await interaction.followup.send(
                    f"❌ Error submitting word: {str(e)}",
                    ephemeral=True,
                )
            except Exception:
                # If even error message fails, silently log
                pass


class PlayerGameView(ui.View):
    """View for active game player interactions (submit word button).

    Contains the "Submit Word" button that players see in their game DM.
    When clicked, opens a WordSubmitModal for player input. Automatically
    times out when the game ends.

    This view is stateless - it simply shows the button and delegates
    to the game handler. All game state is in GameSessionTracker.

    Attributes:
        player_id (int): Discord user ID of the player.
        letters (str): Available letters for this game.
        on_submit_callback (Callable): Async function to call on submission.
        timeout (float): View timeout in seconds before button disappears.

    Example:
        >>> view = PlayerGameView(
        ...     player_id=456,
        ...     letters="AEIOUX",
        ...     on_submit=handle_submission,
        ...     timeout=300
        ... )
        >>> # Send in DM with embed
        >>> await player_user.send(embed=embed, view=view)
        >>> # Player clicks "Submit Word" button
        >>> # WordSubmitModal opens, player types word and submits
    """

    def __init__(
        self,
        player_id: int,
        letters: str,
        on_submit: Callable,
        timeout: float = 300,
    ) -> None:
        """Initialize player game view.

        Args:
            player_id: Discord user ID (integer).
            letters: Available letters (string, for reference).
            on_submit: Async callback for word submission.
                Signature: async def callback(interaction, player_id, word)
            timeout: View timeout in seconds (default 300).

        Returns:
            None

        Example:
            >>> async def handle_sub(interaction, pid, word):
            ...     await validate_and_respond(interaction, pid, word)
            >>>
            >>> view = PlayerGameView(456, "AEIOUX", handle_sub)
        """
        super().__init__(timeout=timeout)
        self.player_id: int = player_id
        self.letters: str = letters
        self.on_submit_callback: Callable = on_submit

    @ui.button(
        label="📝 Submit Word",
        style=discord.ButtonStyle.primary,
        emoji="✏️",
    )
    async def submit_word_button(
        self, interaction: discord.Interaction, button: ui.Button
    ) -> None:
        """Handle submit word button - opens modal.

        Creates and sends a WordSubmitModal to the player when they click
        the "Submit Word" button. Catches any errors and sends error message
        to player.

        Args:
            interaction: Discord interaction from button click.
            button: The button that was clicked (unused).

        Returns:
            None

        Note:
            All exceptions are caught and logged. If modal creation fails,
            an error message is sent to the player.

        Example:
            >>> # Called when player clicks "📝 Submit Word" button
            >>> # WordSubmitModal appears for player to type in
            >>> # Player types word and clicks "Submit"
        """
        try:
            # Create modal with current game state
            modal = WordSubmitModal(
                self.player_id,
                self.letters,
                self.on_submit_callback,
                timeout=300,
            )
            # Show modal to player
            await interaction.response.send_modal(modal)

        except Exception as e:
            log_error_traceback(e, "submit_word_button")
            # Send error message to player
            await interaction.response.send_message(
                f"❌ Error: {str(e)}",
                ephemeral=True,
            )

    async def on_timeout(self) -> None:
        """Called when view times out after game ends.

        View timeout is typically set to match game duration. When timer
        expires, button disappears from the embed automatically.

        Args:
            None

        Returns:
            None

        Note:
            This is a logging hook only - view teardown is automatic.

        Example:
            >>> # Called 600 seconds after game start
            >>> # Button disappears from player's embed
            >>> # Player can no longer submit words via this embed
        """
        log_debug("PlayerGameView timed out")


class PlayerGameEmbed:
    """Manages the personal game embed for each player.

    Creates and maintains the visual Discord embed that appears in each
    player's DM during the game. The embed shows:
    - Available letters
    - Time remaining
    - Found words with definitions and points
    - Current score
    - Attempt count

    This class is essentially a view layer - all actual game state is stored
    in GameSessionTracker. PlayerGameEmbed just formats and displays that
    state as a pretty Discord embed.

    Attributes:
        player_id (int): Discord user ID of the player.
        letters (str): Available letters for this game.
        game_duration (int): Total game duration in seconds.
        valid_words (List[Tuple[str, int, str]]): Found words with
            (word, points, definition).
        attempt_count (int): Number of submission attempts.
        message (Optional[discord.Message]): The sent message object
            (for updates).
        remaining_time (int): Seconds left in game (updated by timer).

    Example:
        >>> embed_mgr = PlayerGameEmbed(456, "AEIOUX", game_duration=600)
        >>> embed_mgr.add_valid_word("HELLO", 10, "A greeting")
        >>> embed_mgr.increment_attempts()
        >>> embed_mgr.update_timer(540)  # 9 minutes remaining
        >>> view = PlayerGameView(456, "AEIOUX", handle_submit)
        >>> msg = await embed_mgr.send_to_player(user, view)
        >>> # Player submits another word
        >>> embed_mgr.add_valid_word("WORLD", 8, "The planet")
        >>> await embed_mgr.update_embed()  # Refresh display
    """

    def __init__(
        self,
        player_id: int,
        letters: str,
        game_duration: int = 600,
    ) -> None:
        """Initialize player game embed manager.

        Args:
            player_id: Discord user ID (integer).
            letters: Available letters for this game (string).
            game_duration: Total game duration in seconds (default 600).

        Returns:
            None

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX", 600)
        """
        self.player_id: int = player_id
        self.letters: str = letters
        self.game_duration: int = game_duration
        self.valid_words: list = []  # List[Tuple[str, int, str]]
        self.attempt_count: int = 0
        self.message: Optional[discord.Message] = None
        self.remaining_time: int = game_duration

    def create_embed(self) -> discord.Embed:
        """Create the player's personal game embed.

        Builds a Discord embed showing current game state including letters,
        timer, found words, and score. Called before every update.

        Args:
            None

        Returns:
            discord.Embed: Formatted embed ready to send/edit.

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> embed.add_valid_word("HELLO", 10, "A greeting")
            >>> discord_embed = embed.create_embed()
            >>> assert "HELLO" in discord_embed.fields[1].value
            >>> assert "10 points" in discord_embed.fields[1].value
        """
        embed = discord.Embed(
            title="🐝 Your Spelling Bee Game",
            description=(
                f"Find words from: **{self.letters}**\n"
                f"Time Remaining: **{self.remaining_time}s**"
            ),
            color=0x00FF00,
        )

        embed.add_field(
            name="📝 Letters Available",
            value=f"`{self.letters}`",
            inline=False,
        )

        # Valid words found
        if self.valid_words:
            words_text = ""
            total_points = 0
            for word, points, definition in self.valid_words:
                words_text += f"✅ **{word}** (+{points} pts)\n"
                words_text += f"   *{definition}*\n"
                total_points += points

            embed.add_field(
                name=f"✅ Words Found ({len(self.valid_words)})",
                value=words_text,
                inline=False,
            )
            embed.add_field(
                name="🏆 Your Score",
                value=f"**{total_points} points**",
                inline=False,
            )
        else:
            embed.add_field(
                name="✅ Words Found",
                value="None yet - keep trying!",
                inline=False,
            )
            embed.add_field(
                name="🏆 Your Score",
                value="**0 points**",
                inline=False,
            )

        # Attempts
        embed.add_field(
            name="📊 Statistics",
            value=f"Total Attempts: **{self.attempt_count}**",
            inline=False,
        )

        embed.set_footer(text="Click 'Submit Word' to add more words!")

        return embed

    async def send_to_player(
        self,
        user: discord.User,
        view: ui.View,
    ) -> Optional[discord.Message]:
        """Send initial embed to player via DM.

        Creates embed with current state and sends to player as DM with
        submit button. Stores message object for later updates.

        Args:
            user: Discord user object to send DM to.
            view: PlayerGameView with submit button.

        Returns:
            The sent discord.Message object, or None if send failed.

        Note:
            Catches discord.Forbidden (blocked DMs) and other exceptions.
            All errors are logged but not raised.

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> view = PlayerGameView(456, "AEIOUX", handle_submit)
            >>> user = bot.get_user(456)
            >>> msg = await embed.send_to_player(user, view)
            >>> assert msg is not None  # Successfully sent
        """
        try:
            embed = self.create_embed()
            self.message = await user.send(
                embed=embed,
                view=view,
            )
            return self.message
        except Exception as e:
            log_error_traceback(e, "PlayerGameEmbed.send_to_player")
            return None

    async def update_embed(self, view: Optional[ui.View] = None) -> None:
        """Update the player's game embed.

        Refreshes the sent embed with current state (new words, updated
        timer, etc). Call this after adding words or updating timer.

        Args:
            view: Optional new PlayerGameView to replace old one. If None,
                only content is updated.

        Returns:
            None

        Note:
            Safe to call when message is None (early game startup).
            Catches and logs all exceptions without raising.

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> msg = await embed.send_to_player(user, view)
            >>> # Player finds a word
            >>> embed.add_valid_word("HELLO", 10, "A greeting")
            >>> await embed.update_embed()  # Refresh display
        """
        try:
            if self.message:
                embed = self.create_embed()
                if view:
                    await self.message.edit(
                        embed=embed,
                        view=view,
                    )
                else:
                    await self.message.edit(embed=embed)
        except Exception as e:
            log_debug(f"Error updating embed: {str(e)}")

    def add_valid_word(self, word: str, points: int, definition: str) -> None:
        """Add a valid word to player's list.

        Called after word is validated and definition fetched. Appends to
        valid_words list for display in embed.

        Args:
            word: The word found (uppercase string, 3-15 chars).
            points: Points awarded (integer >= 0).
            definition: Word definition (non-empty string).

        Returns:
            None

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> embed.add_valid_word("HELLO", 10, "A greeting")
            >>> assert len(embed.valid_words) == 1
            >>> assert embed.valid_words[0][0] == "HELLO"
        """
        self.valid_words.append((word, points, definition))

    def increment_attempts(self) -> None:
        """Increment attempt counter.

        Called after every submission (valid or invalid). Used for display
        and statistics.

        Args:
            None

        Returns:
            None

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> embed.increment_attempts()
            >>> assert embed.attempt_count == 1
        """
        self.attempt_count += 1

    def update_timer(self, remaining_seconds: int) -> None:
        """Update the remaining time display.

        Called by game timer to show countdown. Updates are shown in next
        embed refresh.

        Args:
            remaining_seconds: Seconds left in game (integer >= 0).

        Returns:
            None

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX", 600)
            >>> embed.update_timer(300)
            >>> assert embed.remaining_time == 300
        """
        self.remaining_time = remaining_seconds

    def get_total_score(self) -> int:
        """Get player's total score.

        Sums all points from valid words found.

        Args:
            None

        Returns:
            Total points (integer >= 0).

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> embed.add_valid_word("HELLO", 10, "A greeting")
            >>> embed.add_valid_word("WORLD", 8, "The planet")
            >>> assert embed.get_total_score() == 18
        """
        return sum(points for _, points, _ in self.valid_words)

    def get_word_list(self) -> list:
        """Get list of (word, points, definition) tuples.

        Returns a copy of the valid words list for safe external access.

        Args:
            None

        Returns:
            List[Tuple[str, int, str]]: Copy of valid words list.

        Example:
            >>> embed = PlayerGameEmbed(456, "AEIOUX")
            >>> embed.add_valid_word("HELLO", 10, "A greeting")
            >>> words = embed.get_word_list()
            >>> assert words[0][0] == "HELLO"
            >>> words.append(("FAKE", 0, ""))  # Doesn't affect embed
            >>> assert len(embed.valid_words) == 1
        """
        return self.valid_words.copy()
