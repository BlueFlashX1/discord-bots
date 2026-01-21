"""Daily problem subscription command."""

import discord
from discord import app_commands
from discord.ext import commands

from utils.embeds import create_success_embed, create_error_embed


class DailySubscribeCommand(commands.Cog):
    """Daily problem subscription management."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="daily_subscribe",
        description="Subscribe to daily coding problems",
    )
    @app_commands.describe(
        track="Programming track (default: python)",
        difficulty="Difficulty level",
        channel="Channel to send daily problems (optional, defaults to DM)",
    )
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

        channel_id = channel.id if channel else None
        scheduler.subscribe(
            user_id=interaction.user.id,
            track=track.lower(),
            channel_id=channel_id,
            difficulty=difficulty.lower(),
        )

        location = f"#{channel.name}" if channel else "your DMs"
        embed = create_success_embed(
            f"✅ Subscribed to daily {track.title()} problems!\n\n"
            f"**Difficulty:** {difficulty.title()}\n"
            f"**Delivery:** {location}\n"
            f"**Time:** 9:00 AM daily\n\n"
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
