"""Set default channel command."""

from discord.ext import commands
from utils.data_manager import DataManager
from utils.embeds import create_error_embed, create_success_embed

import discord
from discord import app_commands


class SetChannelCommand(commands.Cog):
    """Set default channel command."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.data = DataManager()

    @app_commands.command(
        name="setchannel",
        description="Set the default channel for reminders in this server",
    )
    @app_commands.describe(
        channel="Channel to send reminders to by default (leave empty to clear and use DM)"
    )
    @app_commands.default_permissions(manage_channels=True)
    async def setchannel(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel = None,
    ):
        """Set default channel for reminders."""
        if not interaction.guild:
            embed = create_error_embed(
                "This command can only be used in a server, not in DMs."
            )
            await interaction.response.send_message(embed=embed)
            return

        await interaction.response.defer()

        guild_id = interaction.guild.id

        if channel:
            # Set default channel
            self.data.set_guild_default_channel(guild_id, channel.id)
            embed = create_success_embed(
                f"Default reminder channel set to {channel.mention}\n"
                "All reminders without a specified channel will be sent here."
            )
        else:
            # Clear default channel (revert to DM)
            self.data.clear_guild_default_channel(guild_id)
            embed = create_success_embed(
                "Default channel cleared. Reminders will now be sent via DM by default."
            )

        await interaction.followup.send(embed=embed)

    @app_commands.command(
        name="getchannel", description="View the current default channel for reminders"
    )
    async def getchannel(self, interaction: discord.Interaction):
        """Get default channel for reminders."""
        if not interaction.guild:
            embed = create_error_embed(
                "This command can only be used in a server, not in DMs."
            )
            await interaction.response.send_message(embed=embed)
            return

        await interaction.response.defer()

        guild_id = interaction.guild.id
        channel_id = self.data.get_guild_default_channel(guild_id)

        if channel_id:
            channel = interaction.guild.get_channel(channel_id)
            if channel:
                embed = create_success_embed(
                    f"Default reminder channel: {channel.mention}"
                )
            else:
                embed = create_error_embed(
                    f"Default channel ID {channel_id} not found. "
                    "The channel may have been deleted. Use `/setchannel` to set a new one."
                )
        else:
            embed = create_success_embed(
                "No default channel set. Reminders will be sent via DM by default.\n"
                "Use `/setchannel <channel>` to set a default channel."
            )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    """Add cog to bot."""
    await bot.add_cog(SetChannelCommand(bot))
