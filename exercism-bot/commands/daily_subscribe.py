"""Daily problem subscription command."""

from discord.ext import commands
from services.exercism_cli import ExercismCLI
from utils.embeds import create_error_embed, create_success_embed

import discord
from discord import app_commands


class DailySubscribeCommand(commands.Cog):
    """Daily problem subscription management."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    async def track_autocomplete(
        self, interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        """Autocomplete for track parameter - shows joined tracks + 'all' option."""
        tracks = await self.cli.get_joined_tracks()
        current_lower = current.lower()

        choices = []

        # Always include "all" option if user types "all" or "a" or empty
        if "all" in current_lower or current_lower == "" or current_lower == "a":
            choices.append(
                app_commands.Choice(name="All Tracks (Rotate Daily)", value="all")
            )

        # Add joined tracks
        if tracks:
            matching = [
                track
                for track in tracks
                if current_lower in track.lower() and track.lower() != "all"
            ]
            choices.extend(
                [
                    app_commands.Choice(name=track.title(), value=track)
                    for track in sorted(matching)
                ]
            )

        return choices[:25]  # Discord limit

    @app_commands.command(
        name="daily_subscribe",
        description="Subscribe to daily coding problems",
    )
    @app_commands.describe(
        track="Programming track (or 'all' for all joined tracks)",
        difficulty="Difficulty level",
        channel="Channel to send daily problems (optional, defaults to DM)",
        all_tracks="Subscribe to all joined tracks and rotate daily",
    )
    @app_commands.autocomplete(track=track_autocomplete)
    @app_commands.choices(
        difficulty=[
            app_commands.Choice(name="Beginner", value="beginner"),
            app_commands.Choice(name="Intermediate", value="intermediate"),
            app_commands.Choice(name="Advanced", value="advanced"),
        ]
    )
    async def daily_subscribe(
        self,
        interaction: discord.Interaction,
        track: str = "python",
        difficulty: str = "beginner",
        channel: discord.TextChannel = None,
        all_tracks: bool = False,
    ):
        """Subscribe to daily problems."""
        await interaction.response.defer()

        # Get scheduler from bot
        scheduler = getattr(self.bot, "daily_scheduler", None)
        if not scheduler:
            await interaction.followup.send(
                embed=create_error_embed(
                    "Daily scheduler not initialized. Contact bot administrator."
                )
            )
            return

        # Check if user wants all tracks
        if track.lower() == "all" or all_tracks:
            all_tracks = True
            joined_tracks = await self.cli.get_joined_tracks()
            if not joined_tracks:
                await interaction.followup.send(
                    embed=create_error_embed(
                        "No joined tracks found. Join tracks on Exercism.org first!\n"
                        "Visit: https://exercism.org/tracks"
                    )
                )
                return
            track = None  # Will use all tracks
        else:
            all_tracks = False
            track = track.lower()

        channel_id = channel.id if channel else None
        scheduler.subscribe(
            user_id=interaction.user.id,
            track=track or "python",  # Fallback if all_tracks
            channel_id=channel_id,
            difficulty=difficulty.lower(),
            all_tracks=all_tracks,
        )

        location = f"#{channel.name}" if channel else "your DMs"

        if all_tracks:
            joined_tracks = await self.cli.get_joined_tracks()
            tracks_list = ", ".join([t.title() for t in joined_tracks])
            embed = create_success_embed(
                f"✅ Subscribed to daily problems from ALL joined tracks!\n\n"
                f"**Tracks:** {tracks_list}\n"
                f"**Rotation:** One problem per day, rotating through all tracks\n"
                f"**Difficulty:** {difficulty.title()}\n"
                f"**Delivery:** {location}\n"
                f"**Time:** 9:00 AM daily\n\n"
                f"Use `/daily_unsubscribe` to stop receiving daily problems."
            )
        else:
            embed = create_success_embed(
                f"✅ Subscribed to daily {track.title()} problems!\n\n"
                f"**Difficulty:** {difficulty.title()}\n"
                f"**Delivery:** {location}\n"
                f"**Time:** 9:00 AM daily\n\n"
                f"💡 Tip: Use `track: all` to rotate through all joined tracks!\n\n"
                f"Use `/daily_unsubscribe` to stop receiving daily problems."
            )

        await interaction.followup.send(embed=embed)

    @app_commands.command(
        name="daily_unsubscribe",
        description="Unsubscribe from daily coding problems",
    )
    async def daily_unsubscribe(self, interaction: discord.Interaction):
        """Unsubscribe from daily problems."""
        await interaction.response.defer()

        scheduler = getattr(self.bot, "daily_scheduler", None)
        if not scheduler:
            await interaction.followup.send(
                embed=create_error_embed(
                    "Daily scheduler not initialized. Contact bot administrator."
                )
            )
            return

        scheduler.unsubscribe(interaction.user.id)

        embed = create_success_embed(
            "✅ Unsubscribed from daily problems.\n\n"
            "You won't receive daily problems anymore. Use `/daily_subscribe` to resubscribe."
        )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(DailySubscribeCommand(bot))
