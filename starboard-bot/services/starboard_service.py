"""Starboard service for monitoring reactions and posting to forum."""

import logging
from typing import List, Optional

import discord
from services.tag_classifier import TagClassifier
from utils.data_manager import DataManager
from utils.embeds import create_starboard_embed

logger = logging.getLogger(__name__)


class StarboardService:
    """Service that monitors star reactions and posts to forum channel."""

    def __init__(self, bot: discord.Client, data_manager: DataManager):
        self.bot = bot
        self.data = data_manager
        self.tag_classifier = TagClassifier()
        logger.info("StarboardService initialized")

    async def handle_reaction_add(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a star reaction is added to a message."""
        logger.info(
            f"⭐ HANDLE_REACTION_ADD: {reaction.emoji} by {user} on message {reaction.message.id}"
        )

        # Only process star emoji
        if str(reaction.emoji) != "⭐":
            logger.info(f"Ignoring non-star reaction: {reaction.emoji}")
            return

        message = reaction.message
        
        # Fetch message if it's a partial message (only PartialMessage has 'partial' attribute)
        # Use try/except to safely check for partial attribute without triggering AttributeError
        try:
            if message.partial:
                logger.info(f"Message {message.id} is partial, fetching...")
                try:
                    message = await message.fetch()
                    logger.info(f"Successfully fetched message {message.id}")
                except Exception as e:
                    logger.error(f"Failed to fetch partial message {message.id}: {e}")
                    return
        except AttributeError:
            # Message object doesn't have 'partial' attribute, so it's already a full Message
            # This is expected for messages fetched via channel.fetch_message()
            pass
        
        guild = message.guild

        if not guild:
            logger.warning("Message has no guild, skipping")
            return

        logger.info(f"Processing star reaction in guild: {guild.name} ({guild.id})")

        # Get configuration for this guild
        config = self.data.get_guild_config(guild.id)
        if not config:
            logger.warning(f"No configuration found for guild {guild.id}")
            return

        forum_channel_id = config.get("forum_channel_id")
        threshold = config.get("star_threshold", 1)

        logger.info(
            f"Guild config - Forum: {forum_channel_id}, Threshold: {threshold}"
        )

        if not forum_channel_id:
            logger.warning(f"Forum channel not configured for guild {guild.id}")
            return

        # Check if message already posted to starboard
        if self.data.is_message_starboarded(message.id):
            logger.info(f"Message {message.id} already posted to starboard, skipping")
            return

        # Count star reactions
        star_count = sum(1 for r in message.reactions if str(r.emoji) == "⭐")
        logger.info(f"Message {message.id} has {star_count} star reactions (threshold: {threshold})")

        # Check if threshold is met
        if star_count >= threshold:
            logger.info(
                f"✅ Threshold met! Posting message {message.id} to starboard "
                f"({star_count} >= {threshold})"
            )
            await self._post_to_starboard(message, forum_channel_id, star_count)
        else:
            logger.info(
                f"⏳ Threshold not met yet: {star_count} < {threshold} "
                f"({threshold - star_count} more needed)"
            )

    async def handle_reaction_remove(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a star reaction is removed (optional: update star count)."""
        logger.debug(
            f"Reaction removed: {reaction.emoji} by {user} on message {reaction.message.id}"
        )

        # Only process star emoji
        if str(reaction.emoji) != "⭐":
            logger.debug(f"Ignoring non-star reaction removal: {reaction.emoji}")
            return

        message = reaction.message
        guild = message.guild

        if not guild:
            logger.debug("Message has no guild, skipping")
            return

        # Check if message is already on starboard
        starboard_entry = self.data.get_starboard_entry(message.id)
        if not starboard_entry:
            logger.debug(f"Message {message.id} not on starboard, skipping update")
            return

        # Count current star reactions
        star_count = sum(1 for r in message.reactions if str(r.emoji) == "⭐")
        logger.debug(
            f"Star count updated for message {message.id}: {star_count} stars "
            f"(was on starboard at thread {starboard_entry.get('thread_id')})"
        )

    async def _post_to_starboard(
        self, message: discord.Message, forum_channel_id: int, star_count: int
    ):
        """Post message to starboard forum channel."""
        logger.info(
            f"Posting message {message.id} to starboard (channel: {forum_channel_id}, "
            f"stars: {star_count})"
        )

        try:
            forum_channel = self.bot.get_channel(forum_channel_id)

            if not forum_channel:
                logger.error(f"Forum channel {forum_channel_id} not found")
                # React with ❌ to indicate error
                try:
                    await message.add_reaction("❌")
                    logger.debug(f"Added ❌ reaction to message {message.id} (channel not found)")
                except Exception as react_error:
                    logger.warning(
                        f"Failed to add ❌ reaction to message {message.id}: {react_error}"
                    )
                return

            if not isinstance(forum_channel, discord.ForumChannel):
                logger.error(
                    f"Channel {forum_channel_id} is not a forum channel "
                    f"(type: {type(forum_channel).__name__})"
                )
                # React with ❌ to indicate error
                try:
                    await message.add_reaction("❌")
                    logger.debug(f"Added ❌ reaction to message {message.id} (not forum channel)")
                except Exception as react_error:
                    logger.warning(
                        f"Failed to add ❌ reaction to message {message.id}: {react_error}"
                    )
                return

            logger.debug(f"Forum channel found: {forum_channel.name} ({forum_channel.id})")

            # Get message content
            content = message.content or "*No content*"
            logger.debug(f"Message content length: {len(content)} chars")

            # Auto-classify tags
            logger.debug("Classifying message for tags...")
            tags = self.tag_classifier.classify(content)
            logger.info(f"Classified tags: {tags}")

            # Get forum tags (Discord tag objects)
            forum_tags = []
            available_tag_names = [tag.name for tag in forum_channel.available_tags]
            logger.debug(f"Forum has {len(available_tag_names)} available tags: {available_tag_names}")

            for tag_name in tags:
                # Find matching tag in forum channel
                forum_tag = discord.utils.get(forum_channel.available_tags, name=tag_name)
                if forum_tag:
                    forum_tags.append(forum_tag)
                    logger.debug(f"Found forum tag: {tag_name} (id: {forum_tag.id})")
                else:
                    logger.warning(
                        f"Tag '{tag_name}' not found in forum channel tags. "
                        f"Available tags: {available_tag_names}. "
                        f"Please create '{tag_name}' tag in Discord forum channel."
                    )

            if not forum_tags:
                logger.warning(
                    f"No matching forum tags found for classified tags: {tags}. "
                    f"Posting without tags."
                )

            # Create standardized title
            title = self._create_standardized_title(content, tags)
            logger.debug(f"Generated title: {title} (length: {len(title)})")

            # Create embed
            embed = create_starboard_embed(message, star_count)
            logger.debug("Created starboard embed")

            # Create forum post
            logger.info(f"Creating forum thread: '{title}' with {len(forum_tags)} tags")
            thread_result = await forum_channel.create_thread(
                name=title,
                content=content,
                embed=embed,
                applied_tags=forum_tags,
            )

            # ThreadWithMessage has a 'thread' attribute containing the actual Thread object
            thread = thread_result.thread if hasattr(thread_result, 'thread') else thread_result
            thread_id = thread.id

            logger.info(
                f"Successfully created forum thread {thread_id} for message {message.id}"
            )

            # Mark message as starboarded
            self.data.add_starboard_entry(
                message.id,
                thread_id,
                message.channel.id,
                message.guild.id,
                tags,
            )

            logger.info(
                f"Posted message {message.id} to starboard thread {thread_id} "
                f"with tags: {tags} (applied: {[t.name for t in forum_tags]})"
            )

            # React with ✅ to indicate successful posting
            try:
                await message.add_reaction("✅")
                logger.debug(f"Added ✅ reaction to message {message.id}")
            except Exception as react_error:
                logger.warning(
                    f"Failed to add ✅ reaction to message {message.id}: {react_error}"
                )

        except discord.Forbidden as e:
            logger.error(
                f"Bot lacks permission to create forum post in channel {forum_channel_id}. "
                f"Required permissions: View Channels, Send Messages, Manage Messages, "
                f"Read Message History. Error: {e}",
                exc_info=True
            )
            # React with ❌ to indicate error
            try:
                await message.add_reaction("❌")
                logger.debug(f"Added ❌ reaction to message {message.id} (permission error)")
            except Exception as react_error:
                logger.warning(
                    f"Failed to add ❌ reaction to message {message.id}: {react_error}"
                )
        except discord.HTTPException as e:
            logger.error(
                f"HTTP error creating forum post: {e.status} - {e.text}",
                exc_info=True
            )
            # React with ❌ to indicate error
            try:
                await message.add_reaction("❌")
                logger.debug(f"Added ❌ reaction to message {message.id} (HTTP error)")
            except Exception as react_error:
                logger.warning(
                    f"Failed to add ❌ reaction to message {message.id}: {react_error}"
                )
        except Exception as e:
            logger.error(
                f"Unexpected error posting to starboard: {e}",
                exc_info=True
            )
            # React with ❌ to indicate error
            try:
                await message.add_reaction("❌")
                logger.debug(f"Added ❌ reaction to message {message.id} (unexpected error)")
            except Exception as react_error:
                logger.warning(
                    f"Failed to add ❌ reaction to message {message.id}: {react_error}"
                )

    def _create_standardized_title(self, content: str, tags: List[str]) -> str:
        """
        Create standardized title with tags: [Tag1] [Tag2] Original Title.
        
        Args:
            content: Original message content
            tags: List of tags to include
            
        Returns:
            Standardized title string
        """
        logger.debug(f"Creating title from content (len: {len(content)}) with tags: {tags}")

        # Extract first line or first 100 chars as base title
        lines = content.split("\n")
        base_title = lines[0].strip() if lines else content.strip()

        # Limit base title length
        max_title_length = 100
        if len(base_title) > max_title_length:
            base_title = base_title[:max_title_length].rsplit(" ", 1)[0] + "..."
            logger.debug(f"Truncated base title to {len(base_title)} chars")

        # Build tag prefix
        tag_prefix = " ".join(f"[{tag}]" for tag in tags)

        # Combine: [Tag1] [Tag2] Original Title
        if tag_prefix:
            title = f"{tag_prefix} {base_title}"
        else:
            title = base_title
            logger.debug("No tags, using base title only")

        # Discord forum thread title limit is 100 characters - ENFORCE IT
        if len(title) > 100:
            # Prioritize tags, truncate base title if needed
            tag_length = len(tag_prefix) + 1 if tag_prefix else 0  # +1 for space if tags exist
            available_length = 100 - tag_length
            
            if available_length > 0:
                # Truncate base title to fit
                truncated_base = base_title[:available_length - 3]  # -3 for "..."
                if len(base_title) > available_length - 3:
                    truncated_base = truncated_base.rsplit(" ", 1)[0]  # Don't cut words
                title = f"{tag_prefix} {truncated_base}..." if tag_prefix else f"{truncated_base}..."
            else:
                # Tags alone exceed 100 chars - truncate tags
                title = tag_prefix[:97] + "..."
            
            logger.debug(f"Title exceeded 100 chars, truncated to: '{title}' (length: {len(title)})")
        
        # Final safety check - ensure title is exactly 100 chars or less
        if len(title) > 100:
            title = title[:100]
            logger.warning(f"Title still exceeded 100 chars after truncation, forced to: '{title}' (length: {len(title)})")

        logger.debug(f"Final title: '{title}' (length: {len(title)})")
        return title
