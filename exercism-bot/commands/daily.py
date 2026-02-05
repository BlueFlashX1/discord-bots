"""Daily problem command."""

import random
from typing import Optional

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from services.exercism_api import get_exercism_api
from utils.embeds import create_daily_problem_embed

import discord
from discord import app_commands


class DailyCommand(commands.Cog):
    """Daily problem command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.api = get_exercism_api()  # Use API for reliable unlock checks

    async def track_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        """Autocomplete for track parameter - only shows joined tracks."""
        tracks = await self.cli.get_joined_tracks()
        if not tracks:
            return []
        current_lower = current.lower()
        matching = [
            track
            for track in tracks
            if current_lower in track.lower()
        ]
        return [
            app_commands.Choice(name=track.title(), value=track)
            for track in sorted(matching)[:25]
        ]

    @app_commands.command(
        name="daily", description="Get today's recommended coding problem"
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level (optional)",
    )
    @app_commands.autocomplete(track=track_autocomplete)
    @app_commands.choices(
        difficulty=[
            app_commands.Choice(name="Beginner", value="beginner"),
            app_commands.Choice(name="Intermediate", value="intermediate"),
            app_commands.Choice(name="Advanced", value="advanced"),
        ]
    )
    async def daily(
        self,
        interaction: discord.Interaction,
        track: str = "python",
        difficulty: Optional[str] = None,
    ):
        """Get today's daily problem."""
        await interaction.response.defer()

        track = track.lower().strip()
        difficulty_key = (difficulty or "").lower() or None

        # Use API for reliable exercise fetching
        exercises = []
        api_error = None
        try:
            if difficulty_key:
                # Get unlocked exercises filtered by difficulty
                exercises = await self.api.get_unlocked_exercises_by_difficulty(
                    track, difficulty_key
                )
            else:
                # Get all unlocked exercises
                unlocked = await self.api.get_unlocked_exercises(track)
                exercises = list(unlocked)
        except Exception as e:
            api_error = str(e)

        # Filter out exercises already in workspace
        in_workspace = await self.cli.get_exercises_for_track(track)
        candidates = [e for e in exercises if e not in in_workspace]
        
        # Pick a random exercise
        exercise = random.choice(candidates) if candidates else None
        actual_difficulty = difficulty_key.title() if difficulty_key else "Mixed"

        if not exercise:
            diff_str = f" ({difficulty_key})" if difficulty_key else ""
            error_detail = f"\n\nAPI Error: {api_error}" if api_error else ""
            no_unlocked = discord.Embed(
                title="No Exercises Available",
                description=(
                    f"No unlocked exercises found for **{track.title()}**{diff_str}.\n\n"
                    "**Possible reasons:**\n"
                    "- All exercises are already in your workspace\n"
                    "- Track is in Learning Mode (enable Practice Mode on exercism.org)\n"
                    "- You haven't joined this track yet\n\n"
                    f"Try a different track or difficulty.{error_detail}"
                ),
                color=discord.Color.orange(),
            )
            no_unlocked.set_footer(text="Visit exercism.org to unlock more exercises")
            await interaction.followup.send(embed=no_unlocked)
            return

        embed = create_daily_problem_embed(
            exercise=exercise,
            track=track,
            description=f"**Difficulty:** {actual_difficulty}\n\nReady to solve {exercise.replace('-', ' ')}?",
        )
        await interaction.followup.send(embed=embed)

    @app_commands.command(
        name="daily-test",
        description="[TEST] Run daily flow: unlock check, download, embed. Verifies exercise delivery.",
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level (optional)",
    )
    @app_commands.autocomplete(track=track_autocomplete)
    @app_commands.choices(
        difficulty=[
            app_commands.Choice(name="Beginner", value="beginner"),
            app_commands.Choice(name="Intermediate", value="intermediate"),
            app_commands.Choice(name="Advanced", value="advanced"),
        ]
    )
    async def daily_test(
        self,
        interaction: discord.Interaction,
        track: str = "python",
        difficulty: Optional[str] = None,
    ):
        """[TEST] Full daily flow: pick unlocked exercise, download, build rich embed, send."""
        await interaction.response.defer()

        track = track.lower().strip()
        difficulty = (difficulty or "beginner").lower()

        # Use API for reliable exercise fetching
        exercises = []
        try:
            exercises = await self.api.get_unlocked_exercises_by_difficulty(
                track, difficulty
            )
        except Exception:
            pass

        in_workspace = await self.cli.get_exercises_for_track(track)
        candidates = [e for e in exercises if e not in in_workspace]
        
        # Pick random exercise (API already filtered to unlocked only)
        exercise = random.choice(candidates) if candidates else None

        if not exercise:
            no_unlocked = discord.Embed(
                title="No Unlocked Exercises [TEST]",
                description=(
                    f"No unlocked exercises for **{track.title()}** ({difficulty}).\n\n"
                    "Complete more on [exercism.io](https://exercism.org) to unlock more."
                ),
                color=discord.Color.orange(),
            )
            no_unlocked.set_footer(
                text="TEST – verify unlock check; no exercise was sent."
            )
            await interaction.followup.send(embed=no_unlocked)
            return

        cli_installed, cli_message = await self.cli.check_cli_installed()
        if not cli_installed:
            embed = create_daily_problem_embed(
                exercise=exercise,
                track=track,
                description=f"Difficulty: {difficulty.title()}",
                cli_installed=False,
                cli_message=cli_message,
            )
            embed.set_footer(
                text="TEST – CLI not installed; unlock check passed, download skipped."
            )
            await interaction.followup.send(embed=embed)
            return

        try:
            success, download_msg, exercise_path = await self.cli.download_exercise(
                exercise, track
            )
            if success and exercise_path:
                info_success, exercise_info = await self.cli.get_exercise_info(
                    exercise, track
                )
                if info_success:
                    description = exercise_info.get(
                        "description", f"Difficulty: {difficulty.title()}"
                    )
                    embed = create_daily_problem_embed(
                        exercise=exercise,
                        track=track,
                        description=description,
                        exercise_path=exercise_path,
                        readme=exercise_info.get("readme"),
                        starter_code=exercise_info.get("starter_code"),
                        starter_file=exercise_info.get("starter_file"),
                        test_file=exercise_info.get("test_file"),
                        cli_installed=True,
                    )
                else:
                    embed = create_daily_problem_embed(
                        exercise=exercise,
                        track=track,
                        description=f"Difficulty: {difficulty.title()}\n\nExercise downloaded; could not read exercise files.",
                        exercise_path=exercise_path,
                        cli_installed=True,
                    )
            else:
                embed = create_daily_problem_embed(
                    exercise=exercise,
                    track=track,
                    description=(
                        f"Difficulty: {difficulty.title()}\n\n"
                        f"Could not download automatically. Use `/fetch {exercise} {track}` to download manually.\n\n"
                        f"Error: {download_msg}"
                    ),
                    cli_installed=True,
                )
        except Exception as e:
            embed = create_daily_problem_embed(
                exercise=exercise,
                track=track,
                description=f"Difficulty: {difficulty.title()}\n\nUse `/fetch {exercise} {track}` to download!",
                cli_installed=True,
            )
            embed.set_footer(
                text=f"TEST – exception during fetch: {str(e)[:80]}"
            )
            await interaction.followup.send(embed=embed)
            return

        if "TEST" not in (embed.footer.text or ""):
            embed.set_footer(
                text="TEST – full flow OK: unlocked, downloaded, embed sent. Verify exercise is correct."
            )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(DailyCommand(bot))
