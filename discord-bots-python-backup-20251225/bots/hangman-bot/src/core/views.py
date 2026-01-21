"""Discord UI Views and Buttons for Hangman game interactions"""

import asyncio
import random
import time

import discord
from discord.ui import Button, View

from src.core.logger import log_debug, log_error_traceback, log_game_action
from src.gamification.game import HangmanGame


class GameControlView(View):
    """View containing Join and Start buttons for game setup"""

    def __init__(
        self,
        game: HangmanGame,
        channel_id: str,
        starter_id: int,
        embed_message=None,
        timeout=300,
    ):
        super().__init__(timeout=timeout)
        self.game = game
        self.channel_id = channel_id
        self.starter_id = starter_id
        self.embed_message = embed_message
        self.game_started = False
        self.game_creation_time = time.time()
        self.solo_monitor_task = None

    def start_solo_monitor(self):
        """Start monitoring for solo player timeout (3 minutes)"""
        if self.solo_monitor_task is None:
            self.solo_monitor_task = asyncio.create_task(self._monitor_solo_player())

    async def _monitor_solo_player(self):
        """Monitor if only 1 player remains; end game after 3 min"""
        try:
            # Wait 3 minutes (180 seconds)
            await asyncio.sleep(180)

            # Check if still solo and game hasn't started
            if (
                not self.game_started
                and len(self.game.players) == 1
                and self.embed_message
            ):
                log_game_action(
                    self.channel_id,
                    "game_ended_solo_timeout",
                    self.starter_id,
                )

                # Create timeout embed
                embed = discord.Embed(
                    title="⏰ Game Ended - Solo Timeout",
                    description=(
                        "No other players joined within 3 minutes. "
                        "Game lobby has been closed."
                    ),
                    color=0xFF9800,
                )
                embed.add_field(
                    name="📝 The Word Was",
                    value=f"`{self.game.word}`",
                    inline=False,
                )

                # Post timeout message
                try:
                    await self.embed_message.reply(embed=embed)
                except discord.errors.HTTPException as e:
                    if e.status != 404:  # Message deleted is OK
                        log_error_traceback(e, "solo_monitor - reply failed")
                except Exception as e:
                    log_debug(f"Error replying timeout message: {str(e)}")

                # Disable all buttons
                self.join_button.disabled = True
                self.start_button.disabled = True
                self.end_button.disabled = True
                self.leave_button.disabled = True

                try:
                    await self.embed_message.edit(view=self)
                except discord.errors.HTTPException as e:
                    if e.status != 404:  # Message deleted is OK
                        log_error_traceback(e, "solo_monitor - edit failed")
                except Exception as e:
                    log_debug(f"Error editing timeout message: {str(e)}")

        except asyncio.CancelledError:
            log_debug("Solo monitor task cancelled")
        except Exception as e:
            log_error_traceback(e, "solo_monitor")

    @discord.ui.button(
        label="✋ Join Game",
        style=discord.ButtonStyle.primary,
        emoji="👤",
    )
    async def join_button(self, interaction: discord.Interaction, button: Button):
        """Handle join button click"""
        try:
            user_id = interaction.user.id

            # Check if user is already in game
            if user_id in self.game.players:
                await interaction.response.send_message(
                    f"❌ You're already in the game, " f"{interaction.user.mention}!",
                    ephemeral=True,
                )
                return

            # Check if game is full
            if len(self.game.players) >= 4:
                await interaction.response.send_message(
                    "❌ Game is full! (Max 4 players)",
                    ephemeral=True,
                )
                return

            # Check if game has already started
            if self.game_started:
                await interaction.response.send_message(
                    "❌ Game has already started!",
                    ephemeral=True,
                )
                return

            # Add player to game
            success, message = self.game.add_player(user_id)

            if success:
                log_game_action(self.channel_id, "player_joined", user_id)

                # Update embed with new player list
                await interaction.response.defer()
                await self._update_game_embed()

                # Send confirmation
                msg = (
                    f"✅ {interaction.user.mention} joined the game! "
                    f"({len(self.game.players)}/4 players)"
                )
                await interaction.followup.send(
                    msg,
                    ephemeral=False,
                )
            else:
                await interaction.response.send_message(
                    f"❌ {message}",
                    ephemeral=True,
                )

        except discord.errors.HTTPException as e:
            if e.status == 429:
                log_error_traceback(e, "join_button - rate limited")
                await interaction.response.send_message(
                    "⚠️ Discord is rate limiting requests. Please try again in a moment.",
                    ephemeral=True,
                )
            else:
                log_error_traceback(e, "join_button - HTTP error")
                await interaction.response.send_message(
                    f"❌ Error joining game: {str(e)}",
                    ephemeral=True,
                )
        except Exception as e:
            log_error_traceback(e, "join_button")
            try:
                if interaction.response.is_done():
                    await interaction.followup.send(
                        f"❌ Error joining game: {str(e)}",
                        ephemeral=True,
                    )
                else:
                    await interaction.response.send_message(
                        f"❌ Error joining game: {str(e)}",
                        ephemeral=True,
                    )
            except Exception:
                pass  # If we can't send a message, log and continue

    @discord.ui.button(
        label="🎮 Start Game",
        style=discord.ButtonStyle.success,
        emoji="🚀",
    )
    async def start_button(self, interaction: discord.Interaction, button: Button):
        """Handle start button click"""
        try:
            user_id = interaction.user.id

            # Only starter can start the game
            if user_id != self.starter_id:
                starter = (
                    interaction.guild.get_member(self.starter_id)
                    if interaction.guild
                    else None
                )
                if starter:
                    msg = f"❌ Only {starter.mention} can start " f"the game!"
                else:
                    msg = "❌ Only the game starter can start the game!"
                await interaction.response.send_message(
                    msg,
                    ephemeral=True,
                )
                return

            # Check if game already started
            if self.game_started:
                await interaction.response.send_message(
                    "❌ Game has already started!",
                    ephemeral=True,
                )
                return

            # Must have at least 2 players
            if len(self.game.players) < 2:
                await interaction.response.send_message(
                    "❌ Need at least 2 players to start! "
                    "(You need someone to join first)",
                    ephemeral=True,
                )
                return

            # Mark game as started and select random first player
            self.game_started = True

            # Pick random first player
            first_player_id = random.choice(self.game.players)
            first_player_index = self.game.players.index(first_player_id)
            self.game.current_player_index = first_player_index

            first_player = None
            if interaction.guild:
                first_player = interaction.guild.get_member(first_player_id)

            log_game_action(self.channel_id, "game_started", self.starter_id)

            # Cancel solo monitor since game has started
            if self.solo_monitor_task:
                self.solo_monitor_task.cancel()

            # Disable buttons
            self.join_button.disabled = True
            self.start_button.disabled = True
            self.end_button.disabled = True
            self.leave_button.disabled = True

            await interaction.response.defer()

            # Update embed with game started message
            embed = discord.Embed(
                title="🎮 Game Started!",
                description=(
                    f"🎲 Random first player selected: "
                    f"{first_player.mention if first_player else 'Unknown'}"
                ),
                color=0x00FF00,
            )
            embed.add_field(
                name="📝 Word",
                value=f"`{self.game.get_display_word()}`",
                inline=False,
            )
            embed.add_field(
                name="👥 Players",
                value="\n".join([f"<@{pid}>" for pid in self.game.players]),
                inline=False,
            )
            embed.add_field(
                name=self.game.get_hangman_display(),
                value=(f"Mistakes: {self.game.mistakes}/" f"{self.game.MAX_MISTAKES}"),
                inline=False,
            )
            embed.set_footer(text=("Game is now active. Click a letter to guess!"))

            await interaction.followup.send(embed=embed)

            # Create and post letter button view
            gameplay_view = GamePlayView(self.game, self.channel_id, timeout=300)
            await interaction.followup.send(
                f"🎯 {first_player.mention if first_player else f'<@{first_player_id}>'}, "
                f"click a letter to guess!",
                view=gameplay_view,
            )

            # Update the original message to disable buttons
            if self.embed_message:
                try:
                    await self.embed_message.edit(view=self)
                except Exception:
                    pass

        except Exception as e:
            log_error_traceback(e, "start_button")
            await interaction.response.send_message(
                f"❌ Error starting game: {str(e)}",
                ephemeral=True,
            )

    @discord.ui.button(
        label="🛑 End Game",
        style=discord.ButtonStyle.danger,
        emoji="❌",
    )
    async def end_button(self, interaction: discord.Interaction, button: Button):
        """Handle end game button click - only starter can end"""
        try:
            user_id = interaction.user.id

            # Only starter can end the game
            if user_id != self.starter_id:
                starter = (
                    interaction.guild.get_member(self.starter_id)
                    if interaction.guild
                    else None
                )
                if starter:
                    msg = f"❌ Only {starter.mention} can end the game!"
                else:
                    msg = "❌ Only the game starter can end the game!"
                await interaction.response.send_message(
                    msg,
                    ephemeral=True,
                )
                return

            # Prevent ending after game has started (use /hangman end instead)
            if self.game_started:
                await interaction.response.send_message(
                    "❌ Game has already started! Use `/hangman end` instead.",
                    ephemeral=True,
                )
                return

            # Mark game as cancelled
            word = self.game.word
            self.game.game_state = "cancelled"
            log_game_action(self.channel_id, "game_cancelled_by_button", user_id)

            # Cancel solo monitor
            if self.solo_monitor_task:
                self.solo_monitor_task.cancel()

            # Disable all buttons
            self.join_button.disabled = True
            self.start_button.disabled = True
            self.end_button.disabled = True
            self.leave_button.disabled = True

            await interaction.response.defer()

            # Create cancellation embed
            embed = discord.Embed(
                title="🛑 Game Cancelled",
                description=(
                    f"**{interaction.user.display_name}** ended the game lobby."
                ),
                color=0xFF6B6B,
            )
            embed.add_field(
                name="📝 The Word Was",
                value=f"`{word}`",
                inline=False,
            )
            embed.add_field(
                name="💡 Status",
                value="Lobby closed (no points awarded)",
                inline=False,
            )

            await interaction.followup.send(embed=embed)

            # Update the original message to disable all buttons
            if self.embed_message:
                try:
                    await self.embed_message.edit(view=self)
                except discord.errors.HTTPException as e:
                    if e.status != 404:  # Message deleted is OK
                        log_error_traceback(e, "end_button - edit failed")
                except Exception as e:
                    log_debug(f"Error editing end message: {str(e)}")

        except discord.errors.HTTPException as e:
            if e.status == 429:
                log_error_traceback(e, "end_button - rate limited")
                await interaction.response.send_message(
                    "⚠️ Discord is rate limiting requests. Please try again in a moment.",
                    ephemeral=True,
                )
            else:
                log_error_traceback(e, "end_button - HTTP error")
                await interaction.response.send_message(
                    f"❌ Error ending game: {str(e)}",
                    ephemeral=True,
                )
        except Exception as e:
            log_error_traceback(e, "end_button")
            try:
                if interaction.response.is_done():
                    await interaction.followup.send(
                        f"❌ Error ending game: {str(e)}",
                        ephemeral=True,
                    )
                else:
                    await interaction.response.send_message(
                        f"❌ Error ending game: {str(e)}",
                        ephemeral=True,
                    )
            except Exception:
                pass  # If we can't send a message, log and continue

    @discord.ui.button(
        label="👋 Leave Game",
        style=discord.ButtonStyle.secondary,
        emoji="🚪",
    )
    async def leave_button(self, interaction: discord.Interaction, button: Button):
        """Handle leave button click - only non-starters can leave"""
        try:
            user_id = interaction.user.id

            # Only starter prevents from leaving
            if user_id == self.starter_id:
                await interaction.response.send_message(
                    "❌ Game starter cannot leave! Use `/hangman end` to cancel.",
                    ephemeral=True,
                )
                return

            # Check if game has already started
            if self.game_started:
                await interaction.response.send_message(
                    "❌ Cannot leave after game has started!",
                    ephemeral=True,
                )
                return

            # Remove player from game
            success, message = self.game.remove_player(user_id)

            if success:
                log_game_action(self.channel_id, "player_left", user_id)

                # Update embed with new player list
                await interaction.response.defer()
                await self._update_game_embed()

                # Send confirmation
                msg = (
                    f"👋 {interaction.user.mention} left the game! "
                    f"({len(self.game.players)}/4 players remaining)"
                )
                await interaction.followup.send(
                    msg,
                    ephemeral=False,
                )
            else:
                await interaction.response.send_message(
                    f"❌ {message}",
                    ephemeral=True,
                )

        except discord.errors.HTTPException as e:
            if e.status == 429:
                log_error_traceback(e, "leave_button - rate limited")
                await interaction.response.send_message(
                    "⚠️ Discord is rate limiting requests. Please try again in a moment.",
                    ephemeral=True,
                )
            else:
                log_error_traceback(e, "leave_button - HTTP error")
                await interaction.response.send_message(
                    f"❌ Error leaving game: {str(e)}",
                    ephemeral=True,
                )
        except Exception as e:
            log_error_traceback(e, "leave_button")
            try:
                if interaction.response.is_done():
                    await interaction.followup.send(
                        f"❌ Error leaving game: {str(e)}",
                        ephemeral=True,
                    )
                else:
                    await interaction.response.send_message(
                        f"❌ Error leaving game: {str(e)}",
                        ephemeral=True,
                    )
            except Exception:
                pass  # If we can't send a message, log and continue

            log_game_action(self.channel_id, "game_started", self.starter_id)

            # Disable buttons
            self.join_button.disabled = True
            self.start_button.disabled = True

            await interaction.response.defer()

            # Update embed with game started message
            embed = discord.Embed(
                title="🎮 Game Started!",
                description=(
                    f"🎲 Random first player selected: "
                    f"{first_player.mention if first_player else 'Unknown'}"
                ),
                color=0x00FF00,
            )
            embed.add_field(
                name="📝 Word",
                value=f"`{self.game.get_display_word()}`",
                inline=False,
            )
            embed.add_field(
                name="👥 Players",
                value="\n".join([f"<@{pid}>" for pid in self.game.players]),
                inline=False,
            )
            embed.add_field(
                name=self.game.get_hangman_display(),
                value=(f"Mistakes: {self.game.mistakes}/" f"{self.game.MAX_MISTAKES}"),
                inline=False,
            )
            embed.set_footer(text=("Game is now active. Click a letter to guess!"))

            await interaction.followup.send(embed=embed)

            # Create and post letter button view
            gameplay_view = GamePlayView(self.game, self.channel_id, timeout=300)
            await interaction.followup.send(
                f"🎯 {first_player.mention if first_player else f'<@{first_player_id}>'}, "
                f"click a letter to guess!",
                view=gameplay_view,
            )

            # Update the original message to disable buttons
            if self.embed_message:
                try:
                    await self.embed_message.edit(view=self)
                except Exception:
                    pass

        except Exception as e:
            log_error_traceback(e, "start_button")
            await interaction.response.send_message(
                f"❌ Error starting game: {str(e)}",
                ephemeral=True,
            )

    async def _update_game_embed(self):
        """Update the game embed with current player list"""
        try:
            if not self.embed_message:
                return

            # Build player list
            players_list = []
            for pid in self.game.players:
                if pid == self.starter_id:
                    players_list.append(f"<@{pid}> 👑 (Starter)")
                else:
                    players_list.append(f"<@{pid}>")

            # Get the embed from the message
            if self.embed_message.embeds:
                embed = self.embed_message.embeds[0]
                # Update players field
                for i, field in enumerate(embed.fields):
                    if "Players" in field.name:
                        embed.set_field_at(
                            i,
                            name=f"👥 Players ({len(self.game.players)}/4)",
                            value="\n".join(players_list),
                            inline=False,
                        )
                        break

                await self.embed_message.edit(embed=embed, view=self)
        except discord.errors.HTTPException as e:
            if e.status != 404:  # Message deleted is OK
                log_error_traceback(e, "update_game_embed - HTTP error")
        except Exception as e:
            log_debug(f"Error updating game embed: {str(e)}")

    async def on_timeout(self):
        """Called when view times out after 5 minutes"""
        try:
            if self.embed_message:
                embed = discord.Embed(
                    title="⏰ Game Timed Out",
                    description=(
                        "This game lobby has expired " "(no activity for 5 minutes)"
                    ),
                    color=0xFF6B6B,
                )
                await self.embed_message.edit(embed=embed, view=None)
        except discord.errors.HTTPException as e:
            if e.status != 404:  # Message deleted is OK
                log_error_traceback(e, "on_timeout - HTTP error")
        except Exception as e:
            log_debug(f"Error on timeout: {str(e)}")


class GamePlayView(View):
    """View with letter buttons for guessing letters during gameplay"""

    def __init__(
        self,
        game: HangmanGame,
        channel_id: str,
        timeout=300,
    ):
        super().__init__(timeout=timeout)
        self.game = game
        self.channel_id = channel_id
        self.guessed_letters = set(game.guessed_letters)

    def _create_letter_buttons(self):
        """Create buttons for A-Z with already-guessed letters disabled"""
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            button = discord.ui.Button(
                label=letter,
                style=(
                    discord.ButtonStyle.danger
                    if letter in self.guessed_letters
                    else discord.ButtonStyle.primary
                ),
                disabled=letter in self.guessed_letters,
            )
            button.callback = self._make_guess_callback(letter)
            self.add_item(button)

    def _make_guess_callback(self, letter: str):
        """Create callback for letter button"""

        async def callback(interaction: discord.Interaction):
            await self._handle_guess(letter, interaction)

        return callback

    async def _handle_guess(self, letter: str, interaction: discord.Interaction):
        """Handle letter guess from button click"""
        try:
            user_id = interaction.user.id

            # Check if it's this player's turn
            if self.game.get_current_player_id() != user_id:
                current_player = self.game.get_current_player_id()
                await interaction.response.send_message(
                    f"⏳ It's <@{current_player}>'s turn!",
                    ephemeral=True,
                )
                return

            # Process guess
            (
                is_correct,
                message,
                has_bonus_guess,
                letter_value,
            ) = self.game.guess_letter(letter)
            log_game_action(
                self.channel_id,
                "guess",
                user_id,
                f"letter={letter},correct={is_correct},bonus={has_bonus_guess}",
            )

            # Update game state
            embed = discord.Embed(
                title="🎮 Hangman Game",
                description=message,
                color=0x00FF00 if is_correct else 0xFF0000,
            )
            embed.add_field(
                name="📝 Word",
                value=f"`{self.game.get_display_word()}`",
                inline=False,
            )
            embed.add_field(
                name="📋 Guessed Letters",
                value=" ".join(sorted(self.game.guessed_letters)) or "None",
                inline=False,
            )
            embed.add_field(
                name=self.game.get_hangman_display(),
                value=(f"Mistakes: {self.game.mistakes}/" f"{self.game.MAX_MISTAKES}"),
                inline=False,
            )

            if self.game.game_state == "won":
                embed.color = 0x00FF00
                embed.title = "🎉 Game Won!"

                # Get individual scores
                individual_scores = self.game.calculate_individual_scores()
                score_text = "\n".join(
                    [
                        f"<@{pid}>: **{score}** points"
                        for pid, score in individual_scores.items()
                    ]
                )

                embed.add_field(
                    name="🏆 Final Scores",
                    value=score_text,
                    inline=False,
                )
                embed.set_footer(
                    text="Game Complete! Start a new game with " "/hangman start <word>"
                )
                await interaction.response.send_message(embed=embed)
                return

            if self.game.game_state == "lost":
                embed.color = 0xFF0000
                embed.title = "💀 Game Over!"
                embed.add_field(
                    name="📖 The Word Was",
                    value=f"`{self.game.word}`",
                    inline=False,
                )
                embed.set_footer(
                    text="Game Complete! Start a new game with " "/hangman start <word>"
                )
                await interaction.response.send_message(embed=embed)
                return

            # Momentum system: only pass turn if wrong guess
            if not has_bonus_guess:
                self.game.next_turn()
                next_player_id = self.game.get_current_player_id()
                embed.add_field(
                    name="🎯 Next Turn",
                    value=f"<@{next_player_id}>, your turn!",
                    inline=False,
                )
            else:
                # Bonus guess - same player goes again
                embed.add_field(
                    name="🌟 Bonus Guess",
                    value=f"<@{user_id}>, you get another guess!",
                    inline=False,
                )

            # Update buttons (recreate with disabled letters)
            self.guessed_letters = set(self.game.guessed_letters)
            self.clear_items()
            self._create_letter_buttons()

            await interaction.response.send_message(embed=embed, view=self)

        except discord.errors.HTTPException as e:
            if e.status == 429:
                log_error_traceback(e, "letter_guess_button - rate limited")
                await interaction.response.send_message(
                    "⚠️ Discord is rate limiting requests. Please try again in a moment.",
                    ephemeral=True,
                )
            else:
                log_error_traceback(e, "letter_guess_button - HTTP error")
                await interaction.response.send_message(
                    f"❌ Error processing guess: {str(e)}",
                    ephemeral=True,
                )
        except Exception as e:
            log_error_traceback(e, "letter_guess_button")
            try:
                if interaction.response.is_done():
                    await interaction.followup.send(
                        f"❌ Error processing guess: {str(e)}",
                        ephemeral=True,
                    )
                else:
                    await interaction.response.send_message(
                        f"❌ Error processing guess: {str(e)}",
                        ephemeral=True,
                    )
            except Exception:
                pass  # If we can't send a message, log and continue
