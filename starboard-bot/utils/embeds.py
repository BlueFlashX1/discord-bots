"""Embed utilities for Starboard bot."""

from typing import Optional

import discord


def create_starboard_embed(
    message: discord.Message, star_count: int
) -> discord.Embed:
    """
    Create embed for starboard post.

    Args:
        message: Original message to create embed for
        star_count: Number of star reactions

    Returns:
        Discord embed object
    """
    embed = discord.Embed(
        color=discord.Color.gold(),
        timestamp=message.created_at,
    )

    # Author info
    if message.author:
        embed.set_author(
            name=str(message.author),
            icon_url=message.author.display_avatar.url,
        )

    # Star count
    embed.add_field(
        name="⭐ Stars",
        value=str(star_count),
        inline=True,
    )

    # Original channel
    if message.channel:
        # Get channel mention safely using getattr (type-safe for Pyright)
        channel_mention = getattr(message.channel, 'mention', None)
        if not channel_mention:
            # Fallback: use channel ID format if mention not available
            channel_id = getattr(message.channel, 'id', None)
            if channel_id:
                channel_mention = f"<#{channel_id}>"
            else:
                # Last resort: use channel name or type
                channel_name = getattr(message.channel, 'name', 'Unknown Channel')
                channel_mention = f"#{channel_name}"

        embed.add_field(
            name=" channel",
            value=channel_mention,
            inline=True,
        )

    # Jump to message
    embed.add_field(
        name="🔗 Original",
        value=f"[Jump to message]({message.jump_url})",
        inline=True,
    )

    # Attachments
    if message.attachments:
        attachment_info = []
        for attachment in message.attachments[:3]:  # Limit to 3
            attachment_info.append(
                f"[{attachment.filename}]({attachment.url})"
            )
        if len(message.attachments) > 3:
            attachment_info.append(f"... and {len(message.attachments) - 3} more")
        embed.add_field(
            name="📎 Attachments",
            value="\n".join(attachment_info),
            inline=False,
        )

    # Footer
    embed.set_footer(text=f"Message ID: {message.id}")

    return embed
