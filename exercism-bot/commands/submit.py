"""Submit solution command."""

import os
from typing import List, Optional, Tuple

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed


def _option_value(interaction: discord.Interaction, name: str) -> Optional[str]:
    """Get current value of a slash option from an autocomplete interaction."""
    opts = getattr(interaction, "options", None) or (interaction.data.get("options") if interaction.data else [])
    for opt in opts:
        n = opt.get("name") if isinstance(opt, dict) else getattr(opt, "name", None)
        if n != name:
            continue
        v = opt.get("value") if isinstance(opt, dict) else getattr(opt, "value", None)
        return str(v) if v is not None else None
    return None

EXTENSION_TO_TRACK = {
    "py": "python",
    "js": "javascript",
    "ts": "typescript",
    "rs": "rust",
    "go": "go",
    "java": "java",
    "cpp": "cpp",
    "c": "c",
    "cs": "csharp",
    "rb": "ruby",
    "php": "php",
    "swift": "swift",
    "kt": "kotlin",
    "dart": "dart",
    "ex": "elixir",
    "exs": "elixir",
}


def _normalize_track(s: str) -> str:
    return (s or "").strip().lower()


def _normalize_exercise(s: str) -> str:
    return (s or "").strip().lower().replace(" ", "-")


def _infer_from_filename(filename: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Infer (exercise, track) from a solution filename.
    e.g. hello_world.py -> (hello-world, python); two_fer.ts -> (two-fer, typescript).
    """
    base = os.path.basename(filename)
    if "." not in base:
        return None, None
    name, ext = base.rsplit(".", 1)
    ext = ext.lower()
    track = EXTENSION_TO_TRACK.get(ext)
    if not track:
        return None, None
    exercise = name.strip().replace("_", "-").lower()
    if not exercise:
        return None, track
    return exercise, track


class SubmitCommand(commands.Cog):
    """Submit solution command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.data = DataManager()

    async def track_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> List[app_commands.Choice[str]]:
        """Autocomplete track from workspace (downloaded tracks only)."""
        tracks = await self.cli.get_joined_tracks()
        if not tracks:
            return []
        cur = (current or "").strip().lower()
        matches = [t for t in tracks if cur in t.lower()]
        return [
            app_commands.Choice(name=t.title(), value=t)
            for t in sorted(matches)[:25]
        ]

    async def exercise_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> List[app_commands.Choice[str]]:
        """Autocomplete exercise from workspace (downloaded exercises for selected track)."""
        track = _option_value(interaction, "track")
        if not track:
            return []
        exercises = await self.cli.get_exercises_for_track(track)
        if not exercises:
            return []
        cur = (current or "").strip().lower()
        matches = [e for e in exercises if cur in e.lower()]
        return [
            app_commands.Choice(name=e, value=e)
            for e in sorted(matches)[:25]
        ]

    @app_commands.command(
        name="submit",
        description="Submit a solution file to Exercism (exercise + track auto-detected from filename if omitted)",
    )
    @app_commands.describe(
        file="Solution file to submit (e.g. hello_world.py)",
        exercise="Exercise slug (optional; autocomplete shows downloaded exercises for selected track)",
        track="Track name (optional; autocomplete shows downloaded tracks)",
    )
    @app_commands.autocomplete(track=track_autocomplete, exercise=exercise_autocomplete)
    async def submit(
        self,
        interaction: discord.Interaction,
        file: discord.Attachment,
        exercise: Optional[str] = None,
        track: Optional[str] = None,
    ):
        """Submit a solution file; exercise and track inferred from filename when omitted."""
        await interaction.response.defer()

        if exercise or track:
            track_norm = _normalize_track(track) if track else ""
            exercise_norm = _normalize_exercise(exercise) if exercise else ""
        else:
            exercise_norm = ""
            track_norm = ""

        if not track_norm or not exercise_norm:
            inferred_ex, inferred_tr = _infer_from_filename(file.filename)
            if inferred_ex:
                exercise_norm = exercise_norm or inferred_ex
            if inferred_tr:
                track_norm = track_norm or inferred_tr

        if not track_norm or not exercise_norm:
            await interaction.followup.send(
                embed=create_error_embed(
                    "Could not infer **exercise** and **track** from filename. "
                    "Use standard names (e.g. `hello_world.py` -> hello-world, python) or provide **exercise** and **track** manually."
                )
            )
            return

        workspace = await self.cli.get_workspace()
        if not workspace or not os.path.isdir(workspace):
            await interaction.followup.send(
                embed=create_error_embed(
                    "Exercism workspace not found. Run `/check` and configure the CLI on the server."
                )
            )
            return

        exercise_dir = os.path.join(workspace, track_norm, exercise_norm)
        os.makedirs(exercise_dir, exist_ok=True)
        file_path = os.path.join(exercise_dir, file.filename)

        try:
            await file.save(file_path)
        except Exception as e:
            await interaction.followup.send(
                embed=create_error_embed(f"Failed to save file: {e}")
            )
            return

        success, message = await self.cli.submit_solution(file_path)

        if success:
            self.data.add_submission(
                interaction.user.id, exercise_norm, track_norm, file_path
            )
            await interaction.followup.send(embed=create_success_embed(message))
        else:
            await interaction.followup.send(embed=create_error_embed(message))


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(SubmitCommand(bot))
