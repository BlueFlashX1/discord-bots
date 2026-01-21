"""Progress tracking command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from utils.embeds import create_progress_embed, create_error_embed
from utils.data_manager import DataManager


class ProgressCommand(commands.Cog):
    """Progress tracking command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()
        self.data = DataManager()

    @app_commands.command(
        name="progress", description="View your Exercism progress and statistics"
    )
    @app_commands.describe(track="Track to view progress for (optional)")
    async def progress(
        self, interaction: discord.Interaction, track: str = None
    ):
        """View progress and statistics."""
        await interaction.response.defer()

        user_id = interaction.user.id

        # Get user info from CLI
        has_user, user_info = await self.cli.get_user_info()
        username = user_info.get("username", interaction.user.display_name)

        # Get tracked exercises
        exercises = self.data.get_user_exercises(user_id)
        submissions = self.data.load_json("submissions.json", {}).get(
            str(user_id), []
        )

        # Calculate stats
        stats = {
            "total_exercises": len(exercises),
            "total_submissions": len(submissions),
            "tracks": {},
        }

        # Group by track
        for exercise in exercises:
            ex_track = exercise.get("track", "unknown")
            if ex_track not in stats["tracks"]:
                stats["tracks"][ex_track] = {
                    "exercises": 0,
                    "submissions": 0,
                }
            stats["tracks"][ex_track]["exercises"] += 1

        for submission in submissions:
            sub_track = submission.get("track", "unknown")
            if sub_track not in stats["tracks"]:
                stats["tracks"][sub_track] = {
                    "exercises": 0,
                    "submissions": 0,
                }
            stats["tracks"][sub_track]["submissions"] += 1

        # Filter by track if specified
        if track:
            track = track.lower()
            if track in stats["tracks"]:
                track_stats = stats["tracks"][track]
                embed = create_progress_embed(
                    username=username,
                    track=track,
                    stats={
                        "completed": track_stats["submissions"],
                        "in_progress": track_stats["exercises"]
                        - track_stats["submissions"],
                    },
                )
            else:
                embed = create_progress_embed(
                    username=username,
                    track=track,
                    stats={"completed": 0, "in_progress": 0},
                )
        else:
            # Overall stats
            total_completed = sum(t["submissions"] for t in stats["tracks"].values())
            total_in_progress = sum(
                t["exercises"] - t["submissions"]
                for t in stats["tracks"].values()
            )

            embed = create_progress_embed(
                username=username,
                track=None,
                stats={
                    "completed": total_completed,
                    "in_progress": total_in_progress,
                },
            )

            # Add track breakdown
            if stats["tracks"]:
                tracks_str = "\n".join(
                    [
                        f"**{t.title()}**: {s['submissions']} completed, {s['exercises'] - s['submissions']} in progress"
                        for t, s in stats["tracks"].items()
                    ]
                )
                embed.add_field(name="Track Breakdown", value=tracks_str, inline=False)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(ProgressCommand(bot))
