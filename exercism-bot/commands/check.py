"""Check CLI status command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI
from utils.embeds import create_success_embed, create_error_embed


class CheckCommand(commands.Cog):
    """Check Exercism CLI status."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    @app_commands.command(
        name="check", description="Check if Exercism CLI is installed and configured"
    )
    async def check(self, interaction: discord.Interaction):
        """Check CLI status."""
        await interaction.response.defer()

        installed, message = await self.cli.check_cli_installed()

        if installed:
            # Also check user info
            has_user, user_info = await self.cli.get_user_info()
            if has_user:
                username = user_info.get("username", "Unknown")
                embed = create_success_embed(
                    f"✅ Exercism CLI is installed!\n\n**Version:** {message}\n**User:** {username}"
                )
            else:
                embed = create_success_embed(
                    f"✅ Exercism CLI is installed!\n\n**Version:** {message}\n⚠️ Not authenticated. Run `exercism configure --token=YOUR_TOKEN`"
                )
        else:
            embed = create_error_embed(message)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(CheckCommand(bot))
