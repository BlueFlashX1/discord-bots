"""Daily problem command."""

import random
from typing import Optional

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from utils.embeds import create_daily_problem_embed

import discord
from discord import app_commands

# Exercise difficulty mapping
EXERCISE_DIFFICULTY = {
    "beginner": [
        "hello-world",
        "two-fer",
        "leap",
        "bob",
        "raindrops",
        "isogram",
        "pangram",
    ],
    "intermediate": [
        "hamming",
        "acronym",
        "word-count",
        "anagram",
        "scrabble-score",
    ],
    "advanced": [
        "sieve",
        "nth-prime",
        "largest-series-product",
    ],
}

COMMON_EXERCISES = {
    "python": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
    "javascript": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
    "rust": (
        EXERCISE_DIFFICULTY["beginner"]
        + EXERCISE_DIFFICULTY["intermediate"]
        + EXERCISE_DIFFICULTY["advanced"]
    ),
}


class DailyCommand(commands.Cog):
    """Daily problem command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

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

        exercises = []
        difficulties_map = {}
        try:
            if difficulty_key:
                exercises = await self.cli.get_exercises_by_difficulty(
                    track, difficulty_key
                )
            else:
                difficulties_map = await self.cli.get_track_difficulties(track)
                exercises = list(difficulties_map.keys()) if difficulties_map else []
        except Exception:
            pass

        if not exercises:
            if difficulty_key:
                fallback = EXERCISE_DIFFICULTY.get(
                    difficulty_key, EXERCISE_DIFFICULTY["beginner"]
                )
                track_exercises = COMMON_EXERCISES.get(
                    track, COMMON_EXERCISES["python"]
                )
                exercises = [e for e in fallback if e in track_exercises]
            else:
                exercises = list(
                    COMMON_EXERCISES.get(track, COMMON_EXERCISES["python"])
                )

        unlocked_exercises = []
        for ex in exercises:
            if await self.cli.is_exercise_unlocked(ex, track):
                unlocked_exercises.append(ex)
        in_workspace = await self.cli.get_exercises_for_track(track)
        unlocked_exercises = [
            e for e in unlocked_exercises if e not in in_workspace
        ]

        if unlocked_exercises:
            exercise = random.choice(unlocked_exercises)
            if difficulty_key:
                actual_difficulty = difficulty_key.title()
            elif difficulties_map and exercise in difficulties_map:
                actual_difficulty = self.cli.map_difficulty_to_category(
                    difficulties_map[exercise]
                ).title()
            else:
                actual_difficulty = "Beginner"
                for diff, ex_list in EXERCISE_DIFFICULTY.items():
                    if exercise in ex_list:
                        actual_difficulty = diff.title()
                        break
        else:
            diff_str = f" ({difficulty_key})" if difficulty_key else ""
            no_unlocked = discord.Embed(
                title="No New Exercises",
                description=(
                    f"No unlocked exercises for **{track.title()}**{diff_str}, "
                    "or all suggested ones are already in your workspace (solved or in progress).\n\n"
                    "Try a different track or difficulty, or complete more on [exercism.org](https://exercism.org) to unlock more."
                ),
                color=discord.Color.orange(),
            )
            no_unlocked.set_footer(text="Good luck!")
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

        exercises = []
        try:
            exercises = await self.cli.get_exercises_by_difficulty(
                track, difficulty
            )
        except Exception:
            pass
        if not exercises:
            fallback = EXERCISE_DIFFICULTY.get(
                difficulty, EXERCISE_DIFFICULTY["beginner"]
            )
            track_exercises = COMMON_EXERCISES.get(
                track, COMMON_EXERCISES["python"]
            )
            exercises = [e for e in fallback if e in track_exercises]

        unlocked_exercises = []
        for ex in exercises:
            if await self.cli.is_exercise_unlocked(ex, track):
                unlocked_exercises.append(ex)
        in_workspace = await self.cli.get_exercises_for_track(track)
        unlocked_exercises = [
            e for e in unlocked_exercises if e not in in_workspace
        ]

        if not unlocked_exercises:
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

        exercise = random.choice(unlocked_exercises)

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
