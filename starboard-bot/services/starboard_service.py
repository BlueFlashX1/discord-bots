"""Starboard service for monitoring reactions and posting to forum."""

import asyncio
import logging
from typing import Dict, List, Optional, Set

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

        # Cache forum channel and config for instant access
        self._forum_channel_cache: Dict[int, Optional[discord.ForumChannel]] = {}
        self._guild_config_cache: Dict[int, Optional[Dict]] = {}
        self._tag_lookup_cache: Dict[int, Dict[str, discord.ForumTag]] = {}  # Cache tag lookups per forum

        # Processing locks to prevent duplicate work
        self._processing_messages: Set[int] = set()
        self._processing_lock = asyncio.Lock()

        # Pre-warm cache on startup to avoid first-reaction delay
        # Load config and starboard entries into cache immediately
        try:
            _ = self.data.get_config()  # Warm config cache
            _ = self.data.get_starboard_entries()  # Warm starboard cache
        except Exception as e:
            logger.warning(f"Failed to pre-warm cache: {e}")

        logger.info("StarboardService initialized")

    async def warm_forum_channel_cache(self):
        """Pre-warm forum channel cache after bot is ready."""
        try:
            config = self.data.get_config()
            for guild_id_str, guild_config in config.items():
                forum_channel_id = guild_config.get("forum_channel_id")
                if forum_channel_id:
                    forum_channel = self.bot.get_channel(forum_channel_id)
                    if forum_channel and isinstance(forum_channel, discord.ForumChannel):
                        self._forum_channel_cache[forum_channel_id] = forum_channel
                        # Also cache tag lookup
                        tag_lookup = {tag.name: tag for tag in forum_channel.available_tags}
                        self._tag_lookup_cache[forum_channel_id] = tag_lookup
        except Exception as e:
            logger.warning(f"Failed to pre-warm forum channel cache: {e}")

    async def handle_reaction_add(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a star reaction is added to a message."""
        # Only process star emoji
        if str(reaction.emoji) != "⭐":
            return

        message = reaction.message

        # Fetch message if it's a partial message
        try:
            if message.partial:
                try:
                    message = await message.fetch()
                except Exception as e:
                    logger.error(f"Failed to fetch partial message {message.id}: {e}")
                    return
        except AttributeError:
            pass

        guild = message.guild

        if not guild:
            logger.warning("Message has no guild, skipping")
            return

        # Get configuration for this guild (cached)
        guild_id = guild.id
        config = self._guild_config_cache.get(guild_id)
        if config is None:
            config = self.data.get_guild_config(guild_id)
            self._guild_config_cache[guild_id] = config

        if not config:
            logger.warning(f"No configuration found for guild {guild_id}")
            return

        forum_channel_id = config.get("forum_channel_id")
        threshold = config.get("star_threshold", 1)

        if not forum_channel_id:
            logger.warning(f"Forum channel not configured for guild {guild_id}")
            return

        # CRITICAL: Check if already processing FIRST (before any file I/O)
        async with self._processing_lock:
            if message.id in self._processing_messages:
                return
            self._processing_messages.add(message.id)

        try:
            # Fast cached check if already posted (prevents duplicates)
            if self.data.is_message_starboarded(message.id):
                self._processing_messages.discard(message.id)
                return

            # Count star reactions (optimized: count directly from reactions)
            star_count = sum(1 for r in message.reactions if str(r.emoji) == "⭐")

            # Check if threshold is met
            if star_count >= threshold:
                # Add ✅ reaction IMMEDIATELY for instant user feedback (before any blocking ops)
                try:
                    await message.add_reaction("✅")
                except Exception:
                    pass  # Non-critical, skip logging

                # Post to starboard in background (non-blocking for instant response)
                task = asyncio.create_task(
                    self._post_to_starboard(message, forum_channel_id, star_count)
                )
                # Add done callback to remove from processing set
                task.add_done_callback(lambda t: self._processing_messages.discard(message.id))
            else:
                # Not at threshold, remove from processing set immediately
                self._processing_messages.discard(message.id)
        except Exception as e:
            # On any error, remove from processing set
            logger.error(f"Error in handle_reaction_add: {e}", exc_info=True)
            self._processing_messages.discard(message.id)
            raise

    async def handle_reaction_remove(
        self, reaction: discord.Reaction, user: discord.Member
    ):
        """Handle when a star reaction is removed (optional: update star count)."""
        # Only process star emoji
        if str(reaction.emoji) != "⭐":
            return

        message = reaction.message
        guild = message.guild

        if not guild:
            return

        # Check if message is already on starboard
        starboard_entry = self.data.get_starboard_entry(message.id)
        if not starboard_entry:
            return

        # Count current star reactions (for potential future use)
        star_count = sum(1 for r in message.reactions if str(r.emoji) == "⭐")

    async def _post_to_starboard(
        self, message: discord.Message, forum_channel_id: int, star_count: int
    ):
        """Post message to starboard forum channel (runs in background task)."""
        try:
            # Yield control early to prevent blocking event loop
            await asyncio.sleep(0)

            # Check if already posted (fast cached check - prevents duplicates)
            if self.data.is_message_starboarded(message.id):
                self._processing_messages.discard(message.id)
                return
            # Use cached forum channel (pre-warmed on startup, should always be available)
            forum_channel = self._forum_channel_cache.get(forum_channel_id)
            if forum_channel is None:
                # Fallback: fetch if not cached (shouldn't happen, but handle gracefully)
                forum_channel = self.bot.get_channel(forum_channel_id)
                if forum_channel:
                    self._forum_channel_cache[forum_channel_id] = forum_channel

            if not forum_channel:
                logger.error(f"Forum channel {forum_channel_id} not found")
                try:
                    await message.add_reaction("❌")
                except Exception:
                    pass
                return

            if not isinstance(forum_channel, discord.ForumChannel):
                logger.error(
                    f"Channel {forum_channel_id} is not a forum channel "
                    f"(type: {type(forum_channel).__name__})"
                )
                try:
                    await message.add_reaction("❌")
                except Exception:
                    pass
                return

            # Get cached tag lookup or create it
            tag_lookup = self._tag_lookup_cache.get(forum_channel_id)
            if tag_lookup is None:
                tag_lookup = {tag.name: tag for tag in forum_channel.available_tags}
                self._tag_lookup_cache[forum_channel_id] = tag_lookup

            # Get message content (simplified - just get text or embed title)
            content = message.content.strip() if message.content else ""
            if not content and message.embeds:
                msg_embed = message.embeds[0]
                content = msg_embed.title or msg_embed.description or ""

            # Quick tag classification (simplified - content + channel only)
            tags = []
            if content:
                content_tags = self.tag_classifier.classify(content)
                tags.extend(content_tags)

            # Add channel-based tags
            channel_name = getattr(message.channel, 'name', '').lower()
            channel_tags = self._classify_channel_name(channel_name)
            tags.extend(channel_tags)

            # Remove duplicates
            tags = list(dict.fromkeys(tags))  # Preserves order, removes dupes

            # Get forum tags (fast O(1) lookup from cache)
            forum_tags = [tag_lookup[tag] for tag in tags if tag in tag_lookup]

            # Create title (simplified - use embed title if available, else content)
            base_title = None
            if message.embeds and message.embeds[0].title:
                base_title = message.embeds[0].title.strip()
            elif content:
                base_title = content.split("\n")[0].strip()[:80]

            if not base_title or len(base_title) < 3:
                channel_name = getattr(message.channel, 'name', 'Channel')
                base_title = f"Starred from #{channel_name}"

            # Build title with tags
            tag_prefix = " ".join(f"[{tag}]" for tag in tags[:3])  # Limit to 3 tags
            title = f"{tag_prefix} {base_title}" if tag_prefix else base_title
            if len(title) > 100:
                title = title[:97] + "..."

            # Create embed
            embed = create_starboard_embed(message, star_count)

            # Create forum post (simplified - minimal logging)
            thread_result = await forum_channel.create_thread(
                name=title,
                content=content or " ",
                embed=embed,
                applied_tags=forum_tags,
            )

            # ThreadWithMessage structure: try multiple ways to get thread ID
            try:
                # Try accessing thread attribute first (ThreadWithMessage.thread.id)
                if hasattr(thread_result, 'thread'):
                    thread_id = thread_result.thread.id
                # Try direct id access (in case it's already a Thread)
                elif hasattr(thread_result, 'id'):
                    thread_id = thread_result.id
                else:
                    # Fallback: try to get it from the thread object
                    thread = getattr(thread_result, 'thread', thread_result)
                    thread_id = thread.id if hasattr(thread, 'id') else None
                    if thread_id is None:
                        raise AttributeError("Could not find thread ID in ThreadWithMessage object")
            except Exception as id_error:
                logger.error(f"Error accessing thread ID: {id_error}, thread_result type: {type(thread_result)}, attributes: {dir(thread_result)}")
                raise

            # Save entry immediately after posting (async file write to avoid blocking)
            await asyncio.to_thread(
                self.data.add_starboard_entry,
                message.id,
                thread_id,
                message.channel.id,
                message.guild.id,
                tags,
            )

            # Log successful post (important event)
            logger.info(
                f"✅ Posted message {message.id} to starboard thread {thread_id} "
                f"(stars: {star_count}, tags: {tags[:3] if tags else 'none'})"
            )

            # Remove from processing set on success
            self._processing_messages.discard(message.id)

        except discord.Forbidden as e:
            logger.error(
                f"Bot lacks permission to create forum post in channel {forum_channel_id}. "
                f"Required permissions: View Channels, Send Messages, Manage Messages, "
                f"Read Message History. Error: {e}"
            )
            try:
                await message.add_reaction("❌")
            except Exception:
                pass
            self._processing_messages.discard(message.id)
        except discord.HTTPException as e:
            logger.error(f"HTTP error creating forum post: {e.status} - {e.text}")
            try:
                await message.add_reaction("❌")
            except Exception:
                pass
            self._processing_messages.discard(message.id)
        except Exception as e:
            logger.error(f"Unexpected error posting to starboard: {e}", exc_info=True)
            try:
                await message.add_reaction("❌")
            except Exception:
                pass
            self._processing_messages.discard(message.id)

    def _classify_channel_name(self, channel_name: str) -> List[str]:
        """
        Classify channel name to suggest tags.

        Args:
            channel_name: Channel name (lowercase)

        Returns:
            List of suggested tag names
        """
        tags = []

        # Channel name patterns -> tags
        channel_patterns = {
            'data-science': 'Data Science',
            'data-science-news': 'Data Science',
            'ai': 'AI',
            'artificial-intelligence': 'AI',
            'machine-learning': 'AI',
            'ml': 'AI',
            'programming': 'Programming',
            'code': 'Programming',
            'dev': 'Programming',
            'development': 'Programming',
            'question': 'Question',
            'help': 'Question',
            'support': 'Question',
            'resource': 'Resource',
            'links': 'Resource',
            'tutorial': 'Resource',
            'announcement': 'Announcement',
            'news': 'Announcement',
            'discussion': 'Discussion',
            'chat': 'Discussion',
        }

        # Check for patterns in channel name
        for pattern, tag_name in channel_patterns.items():
            if pattern in channel_name:
                tags.append(tag_name)

        return tags
