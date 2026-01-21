"""Discord UI Views and Buttons for Spelling Bee game interactions"""

import asyncio
import time
from typing import Optional

import discord
from discord.ext import commands
from discord.ui import Button, View
from src.ai.word_generator import WordGenerator
from src.core.logger import log_debug, log_error_traceback, log_game_action
from src.gamification.game import SpellingBeeGame


class GameControlView(View):
    """View containing Join and Start buttons for game setup"""

    def __init__(
        self,
        game: SpellingBeeGame,
        channel_id: str,
        starter_id: int,
        word_generator: Optional[WordGenerator] = None,
        bot: Optional[commands.Bot] = None,
        embed_message=None,
        timeout=300,
    ):
        super().__init__(timeout=timeout)
        self.game = game
        self.channel_id = channel_id
        self.starter_id = starter_id
        self.word_generator = word_generator
        self.bot = bot
        self.embed_message = embed_message
        self.game_started = False
        self.game_creation_time = time.time()
        self.game_timer_task = None
        self.private_game_manager = None
        self.game_end_message = None

    def start_solo_monitor(self):
        """
        Start monitoring for solo player timeout (2 minutes).
        If still solo after timeout, end the lobby.
        """
        self.solo_monitor_task = asyncio.create_task(self._monitor_solo_player())

    async def _monitor_solo_player(self):
        """Monitor if only 1 player remains; end game after 2 min"""
        try:
            # Wait 2 minutes (120 seconds) - shorter than hangman
            await asyncio.sleep(120)

            # Check if still solo and game hasn't started
            if (
                not self.game_started
                and len(self.game.participants) == 1
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
                        "No other players joined within "
                        "2 minutes. Game lobby closed."
                    ),
                    color=0xFF9800,
                )
                embed.add_field(
                    name="📝 Letters Were",
                    value=f"`{self.game.letters}`",
                    inline=False,
                )

                # Post timeout message
                try:
                    await self.embed_message.reply(embed=embed)
                except Exception:
                    pass

                # Disable all buttons
                self.join_button.disabled = True
                self.start_button.disabled = True
                self.end_button.disabled = True
                self.leave_button.disabled = True

                try:
                    await self.embed_message.edit(view=self)
                except Exception:
                    pass

        except asyncio.CancelledError:
            log_debug("Solo monitor task cancelled")
        except Exception as e:
            log_debug(f"Error in solo monitor: {str(e)}")

    def start_game_timer(self, duration: int = 600):
        """
        Start 10-minute active game timer.
        When timer expires, automatically end game and
        calculate final scores.

        Args:
            duration: Game duration in seconds (default 600 = 10 min)
        """
        if self.game_timer_task:
            self.game_timer_task.cancel()
        self.game_timer_task = asyncio.create_task(self._run_game_timer(duration))

    async def _run_game_timer(self, duration: int):
        """Run the active game timer"""
        try:
            # Mark game as started
            self.game.mark_game_started()
            log_game_action(
                self.channel_id,
                "game_timer_started",
                self.starter_id,
            )

            # Wait for game duration
            await asyncio.sleep(duration)

            # Timer expired - end game
            await self._end_game_timer_expired()

        except asyncio.CancelledError:
            log_debug("Game timer task cancelled")
        except Exception as e:
            log_error_traceback(e, "_run_game_timer")

    async def _end_game_timer_expired(self):
        """Called when game timer expires"""
        try:
            self.game.mark_game_ended()
            log_game_action(
                self.channel_id,
                "game_ended_timer_expired",
                self.starter_id,
            )

            # Get results from PrivateGameManager
            if not self.private_game_manager:
                log_debug("No PrivateGameManager - using fallback results")
                await self._post_fallback_results()
                return

            # Create final results embed with definitions
            embed = discord.Embed(
                title="🏆 Final Results",
                description=(
                    "The 10-minute game session has ended. "
                    "Here are the final results with all words."
                ),
                color=0xFFD700,
            )

            embed.add_field(
                name="📝 Letters",
                value=f"`{self.game.letters}`",
                inline=False,
            )

            # Get leaderboard from session tracker
            leaderboard = self.private_game_manager.session_tracker.get_leaderboard()

            # Add each player's words with definitions
            for rank, (
                pid,
                name,
                score,
                word_count,
                attempts,
            ) in enumerate(leaderboard, 1):
                words_str = ""
                player_words = (
                    self.private_game_manager.session_tracker.get_player_words(pid)
                )

                if player_words:
                    for word, points, definition in player_words:
                        words_str += f"• **{word}** (+{points}): {definition}\n"
                else:
                    words_str = "_No words found_"

                # Add player field
                rank_emoji = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank, f"{rank}.")
                embed.add_field(
                    name=(
                        f"{rank_emoji} <@{pid}> - " f"{score} pts ({word_count} words)"
                    ),
                    value=words_str[:1024],  # Discord limit
                    inline=False,
                )

            # Game stats
            total_unique_words = len(
                set(
                    word
                    for session in (
                        self.private_game_manager.session_tracker.players.values()
                    )
                    for word, _, _ in session.valid_words
                )
            )

            embed.add_field(
                name="📊 Stats",
                value=(
                    f"Total Unique Words: {total_unique_words}\n"
                    f"Possible Words: "
                    f"{len(self.game.possible_words)}"
                ),
                inline=False,
            )

            # Post results
            try:
                if self.embed_message:
                    await self.embed_message.reply(embed=embed)
            except Exception as e:
                log_debug(f"Could not post results: {e}")

            # Save session and update stats
            await self._save_game_results()

        except Exception as e:
            log_error_traceback(e, "_end_game_timer_expired")
            await self._post_fallback_results()

    async def _post_fallback_results(self):
        """Post basic results if PrivateGameManager unavailable"""
        try:
            embed = discord.Embed(
                title="⏰ Game Time's Up!",
                description="Final results",
                color=0xFFD700,
            )

            embed.add_field(
                name="📝 Letters",
                value=f"`{self.game.letters}`",
                inline=False,
            )

            embed.add_field(
                name="ℹ️ Note",
                value="Results not available - see your DM for details",
                inline=False,
            )

            if self.embed_message:
                await self.embed_message.reply(embed=embed)

        except Exception as e:
            log_debug(f"Error posting fallback results: {e}")

    async def _save_game_results(self):
        """Save game results to JSON and update player stats"""
        try:
            if not self.private_game_manager:
                return

            # Save session to JSON
            from src.gamification.session_saver import SessionSaver

            saver = SessionSaver()
            success = saver.save_session(
                self.game.game_id,
                self.game.letters,
                self.private_game_manager.session_tracker,
            )

            if success:
                log_debug(f"Session saved to JSON: {self.game.game_id}")
            else:
                log_debug("Failed to save session")

            # Update player stats
            from src.gamification.stats_tracker import StatsTracker

            stats_tracker = StatsTracker()

            for (
                player_id,
                session,
            ) in self.private_game_manager.session_tracker.players.items():
                stats_tracker.update_player_stats(
                    player_id,
                    session.to_dict(),
                )

            log_debug("Player stats updated")

        except Exception as e:
            log_error_traceback(e, "_save_game_results")

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
            if user_id in self.game.participants:
                await interaction.response.send_message(
                    f"❌ You're already in the game, " f"{interaction.user.mention}!",
                    ephemeral=True,
                )
                return

            # Check if game is full
            if len(self.game.participants) >= 4:
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
            success, message = self.game.add_participant(user_id)

            if success:
                log_game_action(self.channel_id, "player_joined", user_id)

                # Update embed
                await interaction.response.defer()
                await self._update_game_embed()

                # Send confirmation
                msg = (
                    f"✅ {interaction.user.mention} joined the game! "
                    f"({len(self.game.participants)}/4 players)"
                )
                await interaction.followup.send(msg, ephemeral=False)
            else:
                await interaction.response.send_message(
                    f"❌ {message}",
                    ephemeral=True,
                )

        except Exception as e:
            log_error_traceback(e, "join_button")
            await interaction.response.send_message(
                f"❌ Error joining game: {str(e)}",
                ephemeral=True,
            )

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
                    msg = f"❌ Only {starter.mention} can start the game!"
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
            if len(self.game.participants) < 2:
                await interaction.response.send_message(
                    "❌ Need at least 2 players to start! "
                    "(You need someone to join first)",
                    ephemeral=True,
                )
                return

            # Mark game as started
            self.game_started = True

            log_game_action(
                self.channel_id,
                "game_started",
                self.starter_id,
            )

            # Disable lobby buttons
            self.join_button.disabled = True
            self.start_button.disabled = True
            self.end_button.disabled = True
            self.leave_button.disabled = True

            await interaction.response.defer()

            # Initialize private game manager and send DMs to players
            from src.core.private_game_manager import PrivateGameManager

            # Verify we have required components
            if not self.word_generator or not self.bot:
                await interaction.followup.send(
                    "❌ Game initialization error - missing bot components",
                    ephemeral=True,
                )
                return

            self.private_game_manager = PrivateGameManager(
                game_id=self.game.game_id,
                letters=self.game.letters,
                word_generator=self.word_generator,
                bot=self.bot,
                possible_words=self.game.possible_words,
            )

            # Initialize each participant via DM
            failed_dm_players = []
            for player_id in list(self.game.participants.keys()):
                try:
                    member = (
                        interaction.guild.get_member(player_id)
                        if interaction.guild
                        else None
                    )
                    player_name = (
                        member.display_name if member else f"Player {player_id}"
                    )

                    success, error_msg = (
                        await self.private_game_manager.initialize_player(
                            player_id,
                            player_name,
                        )
                    )

                    if not success:
                        failed_dm_players.append(
                            (player_id, error_msg or "Unknown error")
                        )
                except Exception as e:
                    log_debug(f"Error initializing player {player_id}: {e}")
                    failed_dm_players.append((player_id, f"Setup error: {str(e)}"))

            # Notify about DM failures if any
            if failed_dm_players:
                failure_lines = [
                    f"❌ <@{uid}>: {msg}" for uid, msg in failed_dm_players
                ]
                failure_text = "\n".join(failure_lines)

                await interaction.followup.send(
                    f"⚠️ **Could not send game interfaces to:**\n"
                    f"{failure_text}\n\n"
                    f"Enable DMs with the bot and use `/reconnect` to join.",
                    ephemeral=False,
                )

            # Create game started embed
            embed = discord.Embed(
                title="🎮 Spelling Bee Started!",
                description=(
                    f"Spell words from: **{self.game.letters}**\n"
                    f"You have 10 minutes to find words!\n"
                    f"📝 Check your DMs for the game interface."
                ),
                color=0x00FF00,
            )
            embed.add_field(
                name="📝 Letters",
                value=f"`{self.game.letters}`",
                inline=False,
            )
            embed.add_field(
                name="👥 Players",
                value="\n".join([f"<@{pid}>" for pid in self.game.participants]),
                inline=False,
            )
            embed.add_field(
                name="⏱️ Game Duration",
                value="10 minutes",
                inline=False,
            )
            embed.add_field(
                name="📤 Where to Play",
                value=(
                    "Open your Direct Messages with the bot "
                    "and submit words using the modal form."
                ),
                inline=False,
            )

            await interaction.followup.send(embed=embed)

            # Start the 10-minute game timer
            self.start_game_timer(duration=600)

            # Update the original message
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

            # Prevent ending after game has started
            if self.game_started:
                await interaction.response.send_message(
                    "❌ Game has already started! Use `/spelling end` instead.",
                    ephemeral=True,
                )
                return

            # Mark game as cancelled
            self.game.game_state = "cancelled"
            log_game_action(self.channel_id, "game_cancelled_by_button", user_id)

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
                name="📝 Letters Were",
                value=f"`{self.game.letters}`",
                inline=False,
            )

            await interaction.followup.send(embed=embed)

            # Update the original message
            if self.embed_message:
                try:
                    await self.embed_message.edit(view=self)
                except Exception:
                    pass

        except Exception as e:
            log_error_traceback(e, "end_button")
            await interaction.response.send_message(
                f"❌ Error ending game: {str(e)}",
                ephemeral=True,
            )

    @discord.ui.button(
        label="👋 Leave Game",
        style=discord.ButtonStyle.secondary,
        emoji="🚪",
    )
    async def leave_button(self, interaction: discord.Interaction, button: Button):
        """Handle leave button click - only non-starters can leave"""
        try:
            user_id = interaction.user.id

            # Starter cannot leave
            if user_id == self.starter_id:
                await interaction.response.send_message(
                    "❌ Game starter cannot leave! Use `/spelling end` to cancel.",
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
            success, message = self.game.remove_participant(user_id)

            if success:
                log_game_action(self.channel_id, "player_left", user_id)

                # Update embed
                await interaction.response.defer()
                await self._update_game_embed()

                # Send confirmation
                msg = (
                    f"👋 {interaction.user.mention} left the game! "
                    f"({len(self.game.participants)}/4 players remaining)"
                )
                await interaction.followup.send(msg, ephemeral=False)
            else:
                await interaction.response.send_message(
                    f"❌ {message}",
                    ephemeral=True,
                )

        except Exception as e:
            log_error_traceback(e, "leave_button")
            await interaction.response.send_message(
                f"❌ Error leaving game: {str(e)}",
                ephemeral=True,
            )

    async def _update_game_embed(self):
        """Update the game embed with current player list"""
        try:
            if not self.embed_message:
                return

            # Build player list
            players_list = []
            for pid in self.game.participants:
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
                            name=(f"👥 Players " f"({len(self.game.participants)}/4)"),
                            value="\n".join(players_list),
                            inline=False,
                        )
                        break

                await self.embed_message.edit(embed=embed, view=self)
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
        except Exception as e:
            log_debug(f"Error on timeout: {str(e)}")
