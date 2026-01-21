"""Integration between game bot and private player gameplay"""

import asyncio
from typing import Dict, Optional, Tuple

import discord
from config.settings import GAME_CONFIG
from discord.ext import commands
from src.ai.word_generator import WordGenerator
from src.core.game_views import PlayerGameEmbed, PlayerGameView
from src.core.logger import log_debug, log_error_traceback
from src.gamification.player_session import GameSessionTracker


class PrivateGameManager:
    """Manages private gameplay for participants"""

    def __init__(
        self,
        game_id: str,
        letters: str,
        word_generator: WordGenerator,
        bot: commands.Bot,
        possible_words: Dict,
    ):
        """
        Initialize private game manager

        Args:
            game_id: Unique game identifier
            letters: Game letters
            word_generator: WordGenerator instance for validation
            bot: Discord bot instance
            possible_words: Dict of {word: word_data}
        """
        self.game_id = game_id
        self.letters = letters
        self.word_generator = word_generator
        self.bot = bot
        self.possible_words = possible_words
        self.session_tracker = GameSessionTracker(game_id)
        self.player_embeds: Dict[int, PlayerGameEmbed] = {}
        self.player_messages: Dict[int, discord.Message] = {}
        self.failed_dm_players: list = []  # Track players DM send failed for

    async def initialize_player(
        self,
        player_id: int,
        player_name: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Send private game interface to a player

        Args:
            player_id: Discord user ID
            player_name: Player's display name

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            # Add player to session tracker
            self.session_tracker.add_player(player_id, player_name)

            # Create player's personal game embed
            embed = PlayerGameEmbed(
                player_id, self.letters, GAME_CONFIG["game_duration"]
            )
            self.player_embeds[player_id] = embed

            # Get the user
            try:
                user = await self.bot.fetch_user(player_id)
                if not user:
                    error_msg = f"Could not fetch user {player_id}"
                    log_debug(error_msg)
                    self.failed_dm_players.append(player_id)
                    return False, error_msg
            except discord.NotFound:
                error_msg = f"User {player_id} not found or deleted"
                log_debug(error_msg)
                self.failed_dm_players.append(player_id)
                return False, error_msg

            # Create game view with callback
            async def on_word_submit(
                interaction: discord.Interaction,
                pid: int,
                word: str,
            ):
                await self.handle_word_submission(interaction, pid, word)

            view = PlayerGameView(
                player_id,
                self.letters,
                on_word_submit,
                timeout=GAME_CONFIG["game_duration"],
            )

            # Send to player via DM
            try:
                msg = await embed.send_to_player(user, view)
                if not msg:
                    error_msg = (
                        f"Could not send DM to {player_name} "
                        f"(check if DMs are enabled)"
                    )
                    log_debug(error_msg)
                    self.failed_dm_players.append(player_id)
                    return False, error_msg

                self.player_messages[player_id] = msg
                log_debug(f"Sent game interface to player {player_id}")
                return True, None

            except discord.Forbidden:
                error_msg = f"{player_name} has DMs disabled. " f"Enable DMs to play!"
                log_debug(error_msg)
                self.failed_dm_players.append(player_id)
                return False, error_msg

            except discord.HTTPException as e:
                error_msg = f"Failed to send DM to {player_name}: {str(e)}"
                log_error_traceback(e, "initialize_player")
                self.failed_dm_players.append(player_id)
                return False, error_msg

        except Exception as e:
            error_msg = f"Error initializing player: {str(e)}"
            log_error_traceback(e, "initialize_player")
            self.failed_dm_players.append(player_id)
            return False, error_msg

    async def handle_word_submission(
        self,
        interaction: discord.Interaction,
        player_id: int,
        word: str,
    ) -> None:
        """
        Handle a player's word submission

        Args:
            interaction: Discord interaction
            player_id: Player's Discord ID
            word: Word submitted
        """
        try:
            # Record attempt
            self.session_tracker.record_attempt(player_id)
            embed = self.player_embeds.get(player_id)
            if embed:
                embed.increment_attempts()

            log_debug(
                f"Player {player_id} submitted word: {word}, "
                f"attempt #{embed.attempt_count if embed else '?'}"
            )

            # Validate word
            is_valid, error_msg = await self.word_generator.validate_word(
                self.letters, word
            )

            if is_valid:
                # Word is valid - get points and definition
                word_data = self.possible_words.get(word)
                if word_data:
                    points = word_data.get("points", 5)
                else:
                    points = 5  # Default if not in word list

                # Get definition with timeout and retry
                definition = ""
                for attempt in range(GAME_CONFIG["definition_retry_attempts"]):
                    try:
                        definition = await asyncio.wait_for(
                            self.word_generator.get_word_definition(word),
                            timeout=GAME_CONFIG["definition_api_timeout"],
                        )
                        if definition:
                            break
                    except asyncio.TimeoutError:
                        log_debug(
                            f"Definition API timeout for '{word}' "
                            f"(attempt {attempt + 1}/"
                            f"{GAME_CONFIG['definition_retry_attempts']})"
                        )
                        if attempt == (GAME_CONFIG["definition_retry_attempts"] - 1):
                            definition = "Definition not available " "(API timeout)"
                    except Exception as e:
                        log_error_traceback(
                            e,
                            f"get_word_definition({word})",
                        )
                        if not definition:
                            definition = "Definition not available (error)"
                        break

                # Record in session
                self.session_tracker.record_valid_word(
                    player_id, word, points, definition
                )

                # Update player's embed
                if embed:
                    embed.add_valid_word(word, points, definition)

                # Send confirmation
                response_text = (
                    f"✅ **{word}** is valid!\n"
                    f"**+{points} points** awarded\n"
                    f"📖 {definition}"
                )
                await interaction.followup.send(
                    response_text,
                    ephemeral=True,
                )

                log_debug(
                    f"Player {player_id} found valid word: {word} " f"(+{points})"
                )

            else:
                # Word is invalid
                response_text = (
                    f"❌ **{word}** is not a valid word.\n"
                    f"Make sure all letters are from: {self.letters}\n"
                    f"Keep trying! You have unlimited attempts."
                )
                await interaction.followup.send(
                    response_text,
                    ephemeral=True,
                )

                log_debug(f"Player {player_id} submitted invalid word: {word}")

            # Update player's embed display
            if embed and player_id in self.player_messages:
                msg = self.player_messages[player_id]
                try:
                    # Create view for next submission
                    async def on_word_submit(
                        int_action: discord.Interaction,
                        pid: int,
                        w: str,
                    ):
                        await self.handle_word_submission(int_action, pid, w)

                    view = PlayerGameView(
                        player_id,
                        self.letters,
                        on_word_submit,
                        timeout=GAME_CONFIG["game_duration"],
                    )
                    await msg.edit(
                        embed=embed.create_embed(),
                        view=view,
                    )
                except Exception as e:
                    log_debug(
                        f"Could not update player embed " f"for {player_id}: {str(e)}"
                    )

        except Exception as e:
            log_error_traceback(
                e,
                f"handle_word_submission({player_id})",
            )
            try:
                await interaction.followup.send(
                    f"❌ Error processing word: {str(e)}",
                    ephemeral=True,
                )
            except Exception:
                pass

    async def end_game(self) -> str:
        """
        End the game and compile results

        Returns:
            Formatted results string
        """
        try:
            self.session_tracker.end_session()

            # Compile results embed
            results_text = "# 🐝 Spelling Bee Final Results\n\n"

            leaderboard = self.session_tracker.get_leaderboard()
            results_text += "## 🏆 Final Leaderboard\n\n"

            for rank, (pid, name, score, wc, attempts) in enumerate(leaderboard, 1):
                results_text += (
                    f"{rank}. **{name}**: "
                    f"{score} pts ({wc} words, "
                    f"{attempts} attempts)\n"
                )

            results_text += "\n## 📚 All Words Found\n\n"

            for pid, name, score, wc, _ in leaderboard:
                words = self.session_tracker.get_player_words(pid)
                if words:
                    results_text += f"### {name} ({score} points)\n"
                    for word, pts, definition in words:
                        results_text += f"- **{word}** (+{pts}): {definition}\n"
                    results_text += "\n"

            return results_text

        except Exception as e:
            log_error_traceback(e, "end_game")
            return "Error compiling results"

    def get_player_embed_data(self, player_id: int) -> Optional[Dict]:
        """Get player's current embed data"""
        if player_id in self.player_embeds:
            embed = self.player_embeds[player_id]
            return {
                "score": embed.get_total_score(),
                "words": embed.get_word_list(),
                "attempts": embed.attempt_count,
            }
        return None
