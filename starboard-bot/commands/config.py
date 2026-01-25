"""Configuration commands for Starboard bot."""

import logging

import discord
from discord import app_commands
from discord.ext import commands

from utils.data_manager import DataManager

logger = logging.getLogger(__name__)


class ConfigCommands(commands.Cog):
    """Commands for configuring starboard settings."""

    def __init__(self, bot: commands.Bot, data_manager: DataManager):
        self.bot = bot
        self.data = data_manager

    @app_commands.command(name="starboard-set-channel")
    @app_commands.describe(
        forum_channel="The forum channel where starred messages will be posted"
    )
    @app_commands.checks.has_permissions(manage_channels=True)
    async def set_channel(
        self, interaction: discord.Interaction, forum_channel: discord.ForumChannel
    ):
        """Set the forum channel for starboard posts."""
        if not interaction.guild:
            await interaction.response.send_message(
                "This command can only be used in a server.", ephemeral=True
            )
            return

        # Verify it's a forum channel
        if not isinstance(forum_channel, discord.ForumChannel):
            await interaction.response.send_message(
                "The channel must be a forum channel.", ephemeral=True
            )
            return

        logger.info(
            f"Setting starboard channel: guild={interaction.guild.id}, "
            f"channel={forum_channel.id} ({forum_channel.name})"
        )

        # Set forum channel
        self.data.set_forum_channel(interaction.guild.id, forum_channel.id)

        # Log available tags
        available_tags = [tag.name for tag in forum_channel.available_tags]
        logger.info(
            f"Forum channel has {len(available_tags)} tags: {available_tags}"
        )

        await interaction.response.send_message(
            f"✅ Starboard forum channel set to {forum_channel.mention}\n"
            f"📋 Available tags: {', '.join(available_tags) if available_tags else 'None'}",
            ephemeral=True,
        )
        logger.info(
            f"✓ Starboard channel configured: {forum_channel.id} for guild {interaction.guild.id}"
        )

    @app_commands.command(name="starboard-set-threshold")
    @app_commands.describe(
        threshold="Minimum number of ⭐ reactions needed to post to starboard"
    )
    @app_commands.checks.has_permissions(manage_channels=True)
    async def set_threshold(
        self, interaction: discord.Interaction, threshold: int
    ):
        """Set the star threshold for posting to starboard."""
        if not interaction.guild:
            await interaction.response.send_message(
                "This command can only be used in a server.", ephemeral=True
            )
            return

        if threshold < 1:
            await interaction.response.send_message(
                "Threshold must be at least 1.", ephemeral=True
            )
            return

        if threshold > 100:
            await interaction.response.send_message(
                "Threshold cannot exceed 100.", ephemeral=True
            )
            return

        logger.info(
            f"Setting star threshold: guild={interaction.guild.id}, threshold={threshold}"
        )

        # Set threshold
        self.data.set_star_threshold(interaction.guild.id, threshold)

        await interaction.response.send_message(
            f"✅ Star threshold set to {threshold} ⭐",
            ephemeral=True,
        )
        logger.info(
            f"✓ Star threshold configured: {threshold} for guild {interaction.guild.id}"
        )

    @app_commands.command(name="starboard-config")
    async def show_config(self, interaction: discord.Interaction):
        """Show current starboard configuration."""
        if not interaction.guild:
            await interaction.response.send_message(
                "This command can only be used in a server.", ephemeral=True
            )
            return

        config = self.data.get_guild_config(interaction.guild.id)

        if not config or not config.get("forum_channel_id"):
            await interaction.response.send_message(
                "⚠️ Starboard is not configured. Use `/starboard-set-channel` to set up.",
                ephemeral=True,
            )
            return

        forum_channel_id = config.get("forum_channel_id")
        threshold = config.get("star_threshold", 5)

        forum_channel = self.bot.get_channel(forum_channel_id)
        channel_mention = (
            forum_channel.mention if forum_channel else f"<#{forum_channel_id}>"
        )

        embed = discord.Embed(
            title="⭐ Starboard Configuration",
            color=discord.Color.gold(),
        )
        embed.add_field(name="Forum Channel", value=channel_mention, inline=False)
        embed.add_field(name="Star Threshold", value=f"{threshold} ⭐", inline=False)

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    """Setup function for loading the cog."""
    data_manager = DataManager()
    await bot.add_cog(ConfigCommands(bot, data_manager))
