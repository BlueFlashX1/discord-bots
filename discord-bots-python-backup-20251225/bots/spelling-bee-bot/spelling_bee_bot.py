"""Spelling Bee Discord Bot - AI-powered spelling game"""

import random
import string
from typing import Optional

import discord
from config.settings import GAME_CONFIG, OPENAI_API_KEY
from discord import app_commands
from discord.ext import commands
from src.ai.word_generator import WordGenerator
from src.core.logger import log_error_traceback, log_game_action
from src.core.views import GameControlView
from src.gamification.game import active_games, create_game, delete_game
from src.gamification.session_analyzer import SessionAnalyzer


class SpellingBeeBot(commands.Cog):
    """Spelling Bee Game Cog"""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.word_generator = WordGenerator(OPENAI_API_KEY)
        self.session_analyzer = SessionAnalyzer(self.word_generator)

    def _generate_game_id(self) -> str:
        """Generate unique game ID"""
        return f"spelling-{''.join(random.choices(string.ascii_lowercase, k=6))}"

    @app_commands.command(
        name="spelling",
        description="Start a spelling bee game",
    )
    @app_commands.describe(
        letters="Number of random letters (default: random 5-12, max: 12)",
        words="Max number of words to generate (default: 20)",
    )
    async def spelling_command(
        self,
        interaction: discord.Interaction,
        letters: Optional[int] = None,
        words: int = 20,
    ):
        """Start a new spelling bee game"""
        try:
            # Validate letters input
            if letters is not None:
                letters = max(3, min(letters, GAME_CONFIG["max_letters"]))

            await interaction.response.defer()

            # Generate random letters
            # If no letters specified, generate_game_letters will pick random
            game_letters, letter_count = self.word_generator.generate_game_letters(
                num_letters=letters
            )
            log_game_action(
                str(interaction.channel_id),
                "game_created_with_letters",
                interaction.user.id,
            )

            # Generate possible words using AI
            await interaction.followup.send(
                "⏳ Generating spelling bee words using AI...",
                ephemeral=True,
            )

            possible_words = await self.word_generator.generate_possible_words(
                game_letters, max_words=words
            )

            if not possible_words:
                await interaction.followup.send(
                    "❌ Failed to generate words. Please try again.",
                    ephemeral=True,
                )
                return

            # Create game
            game_id = self._generate_game_id()
            game = create_game(
                game_id,
                interaction.user.id,
                game_letters,
                possible_words,
            )

            # Create embed
            embed = discord.Embed(
                title="🐝 Spelling Bee Started!",
                description=(
                    f"Create words from these letters: "
                    f"**{game_letters}**\n"
                    f"React or click buttons to join!"
                ),
                color=0xFFD700,
            )
            embed.add_field(
                name="📝 Letters",
                value=f"`{game_letters}` ({letter_count} letters)",
                inline=False,
            )
            embed.add_field(
                name="📊 Possible Words",
                value=f"{len(possible_words)} words available",
                inline=False,
            )
            embed.add_field(
                name="👥 Players (1/4)",
                value=f"<@{interaction.user.id}> 👑 (Starter)",
                inline=False,
            )
            embed.add_field(
                name="⏱️ Game Duration",
                value=("2 min to join, then 10 min to play"),
                inline=False,
            )
            embed.set_footer(text="Game ID: " + game_id)

            # Create view (pass word_generator and bot for modal system)
            view = GameControlView(
                game,
                str(interaction.channel_id),
                interaction.user.id,
                self.word_generator,
                self.bot,
            )

            # Send game message
            msg = await interaction.followup.send(embed=embed, view=view)
            view.embed_message = msg

            # Start solo monitor
            view.start_solo_monitor()

            log_game_action(
                str(interaction.channel_id),
                "game_lobby_created",
                interaction.user.id,
            )

        except Exception as e:
            log_error_traceback(e, "spelling_command")
            await interaction.followup.send(
                f"❌ Error creating game: {str(e)}",
                ephemeral=True,
            )

    @app_commands.command(
        name="stats",
        description="View current game statistics",
    )
    async def stats_command(self, interaction: discord.Interaction):
        """Show current game stats"""
        try:
            # Find active game
            game = None
            for g in active_games.values():
                if not g.game_state == "active":
                    continue
                game = g
                break

            if not game:
                await interaction.response.send_message(
                    "❌ No active spelling bee game!",
                    ephemeral=True,
                )
                return

            # Create stats embed
            embed = discord.Embed(
                title="📊 Spelling Bee Stats",
                color=0xFFD700,
            )

            embed.add_field(
                name="📝 Letters",
                value=f"`{game.letters}`",
                inline=False,
            )
            embed.add_field(
                name="💭 Possible Words",
                value=str(len(game.possible_words)),
                inline=True,
            )

            # Leaderboard
            leaderboard = game.get_leaderboard()
            lb_text = ""
            for rank, (_, name, pts, cnt) in enumerate(leaderboard, 1):
                lb_text += f"{rank}. {name}: {pts} pts "
                lb_text += f"({cnt} words)\n"

            embed.add_field(
                name="🏆 Leaderboard",
                value=lb_text if lb_text else "No words found yet",
                inline=False,
            )

            await interaction.response.send_message(embed=embed)

        except Exception as e:
            log_error_traceback(e, "stats_command")
            await interaction.response.send_message(
                f"❌ Error getting stats: {str(e)}",
                ephemeral=True,
            )

    @app_commands.command(
        name="spelling_end",
        description="End the current spelling bee game",
    )
    async def end_command(self, interaction: discord.Interaction):
        """End the current game"""
        try:
            # Find game
            game = None
            for g in active_games.values():
                if not g.game_state == "active":
                    continue
                game = g
                break

            if not game:
                await interaction.response.send_message(
                    "❌ No active spelling bee game!",
                    ephemeral=True,
                )
                return

            if interaction.user.id != game.starter_id:
                await interaction.response.send_message(
                    "❌ Only the starter can end the game!",
                    ephemeral=True,
                )
                return

            # Generate final report
            game.game_state = "completed"
            summary = game.get_game_summary()

            # Create final embed
            embed = discord.Embed(
                title="🐝 Spelling Bee Final Results",
                color=0xFFD700,
            )

            embed.add_field(
                name="📝 Letters",
                value=f"`{game.letters}`",
                inline=False,
            )

            # Final leaderboard
            leaderboard = game.get_leaderboard()
            lb_text = ""
            for rank, (_, name, pts, cnt) in enumerate(leaderboard, 1):
                lb_text += f"{rank}. {name}: {pts} pts "
                lb_text += f"({cnt} words)\n"

            embed.add_field(
                name="🏆 Final Leaderboard",
                value=lb_text if lb_text else "No words found",
                inline=False,
            )

            embed.add_field(
                name="📊 Game Stats",
                value=(
                    f"Total Words Found: "
                    f"{summary['words_found_total']}\n"
                    f"Possible Words: "
                    f"{summary['possible_words_count']}"
                ),
                inline=False,
            )

            await interaction.response.send_message(embed=embed)

            # Clean up
            delete_game(game.game_id)

            log_game_action(
                str(interaction.channel_id),
                "game_ended",
                interaction.user.id,
            )

        except Exception as e:
            log_error_traceback(e, "end_command")
            await interaction.response.send_message(
                f"❌ Error ending game: {str(e)}",
                ephemeral=True,
            )

    @app_commands.command(
        name="reconnect",
        description="Reconnect to your game DM if you closed it",
    )
    async def reconnect_command(self, interaction: discord.Interaction):
        """
        Reconnect to the game DM if the player accidentally closed it.

        This allows players to recover their game interface without losing progress.
        """
        try:
            # Import here to avoid circular imports
            from src.core.private_game_manager import PrivateGameManager
            from src.gamification.game import GameRegistry
            from src.utils.helpers import get_player_display_name

            await interaction.response.defer(ephemeral=True)

            # Find player's active game
            game = GameRegistry.get_player_current_game(interaction.user.id)

            if not game:
                await interaction.followup.send(
                    "❌ You're not currently in an active spelling bee game!",
                    ephemeral=True,
                )
                return

            # Check if game is still active
            if game.game_state != "active":
                await interaction.followup.send(
                    "❌ This game has already ended!",
                    ephemeral=True,
                )
                return

            # Get player display name
            player_name = get_player_display_name(
                interaction.guild,
                interaction.user.id,
                interaction.user.name,
            )

            # Reinitialize the DM interface
            try:
                private_manager = PrivateGameManager(
                    game_id=game.game_id,
                    letters=game.letters,
                    word_generator=self.word_generator,
                    bot=self.bot,
                    possible_words=game.possible_words,
                )
                success, error = await private_manager.initialize_player(
                    player_id=interaction.user.id,
                    player_name=player_name,
                )

                if success:
                    await interaction.followup.send(
                        "✅ Reconnected! Check your DMs for the game interface.",
                        ephemeral=True,
                    )
                    log_game_action(
                        str(interaction.channel_id),
                        "player_reconnected",
                        interaction.user.id,
                    )
                else:
                    await interaction.followup.send(
                        f"❌ Could not reconnect: {error}",
                        ephemeral=True,
                    )

            except Exception as e:
                await interaction.followup.send(
                    f"❌ Error reconnecting: {str(e)}",
                    ephemeral=True,
                )
                log_error_traceback(e, "reconnect_send_dm")

        except Exception as e:
            log_error_traceback(e, "reconnect_command")
            await interaction.response.send_message(
                f"❌ Error with reconnect: {str(e)}",
                ephemeral=True,
            )


async def setup(bot: commands.Bot):
    """Setup function for loading the cog"""
    await bot.add_cog(SpellingBeeBot(bot))
