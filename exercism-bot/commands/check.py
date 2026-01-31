"""Check CLI status command."""

import discord
from discord import app_commands
from discord.ext import commands

from services.exercism_cli import ExercismCLI


class CheckCommand(commands.Cog):
    """Check Exercism CLI status."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.cli = ExercismCLI()

    @app_commands.command(
        name="check", description="Check if Exercism CLI is installed and configured"
    )
    async def check(self, interaction: discord.Interaction):
        """Check CLI status with installation help."""
        await interaction.response.defer()

        installed, message = await self.cli.check_cli_installed()

        if installed:
            # Also check user info
            has_user, user_info = await self.cli.get_user_info()
            workspace = await self.cli.get_workspace()
            
            embed = discord.Embed(
                title="✅ Exercism CLI Status",
                color=discord.Color.green(),
            )
            
            embed.add_field(name="Version", value=message or "Unknown", inline=True)
            
            if has_user:
                embed.add_field(
                    name="✅ Authentication",
                    value="Token configured",
                    inline=True,
                )
                embed.add_field(
                    name="💡 Note",
                    value="To download exercises, join tracks on [Exercism.org](https://exercism.org/tracks)",
                    inline=False,
                )
            else:
                embed.add_field(
                    name="⚠️ Authentication",
                    value="Not authenticated",
                    inline=True,
                )
                embed.add_field(
                    name="🔑 Setup",
                    value="Run: `exercism configure --token=YOUR_TOKEN`\nGet token from: https://exercism.org/settings/api_cli_tokens",
                    inline=False,
                )
            
            if workspace:
                workspace_str: str = workspace
                embed.add_field(
                    name="📁 Workspace",
                    value=f"`{workspace_str}`",
                    inline=False,
                )
            
            embed.set_footer(text="Ready to use! Try /fetch to download exercises")
        else:
            embed = discord.Embed(
                title="❌ Exercism CLI Not Found",
                description="The Exercism CLI is not installed on the server.",
                color=discord.Color.red(),
            )
            
            embed.add_field(
                name="📥 Installation Instructions",
                value=(
                    "**1. Visit the official guide:**\n"
                    "https://exercism.org/cli-walkthrough\n\n"
                    "**2. Quick install commands:**\n"
                    "• **macOS (Homebrew):** `brew install exercism`\n"
                    "• **Linux:** Download from https://github.com/exercism/cli/releases\n"
                    "• **Windows:** Download installer from https://github.com/exercism/cli/releases\n\n"
                    "**3. Verify installation:**\n"
                    "Run `exercism version` in terminal\n\n"
                    "**4. Configure (optional):**\n"
                    "Get API token from: https://exercism.org/settings/api_cli_tokens\n"
                    "Run: `exercism configure --token=YOUR_TOKEN`"
                ),
                inline=False,
            )
            
            embed.add_field(
                name="💡 Note",
                value="The bot needs Exercism CLI installed on the server to automatically fetch and display problems.",
                inline=False,
            )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(CheckCommand(bot))
