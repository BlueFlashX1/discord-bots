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
        
        # Processing locks to prevent duplicate work
        self._processing_messages: Set[int] = set()
        self._processing_lock = asyncio.Lock()
        
        # Pre-warm cache on startup to avoid first-reaction delay
        # Load config and starboard entries into cache immediately
        try:
            _ = self.data.get_config()  # Warm config cache
            _ = self.data.get_starboard_entries()  # Warm starboard cache
            logger.debug("Cache pre-warmed on startup")
        except Exception as e:
            logger.warning(f"Failed to pre-warm cache: {e}")
        
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

        logger.info(
            f"Guild config - Forum: {forum_channel_id}, Threshold: {threshold}"
        )

        if not forum_channel_id:
            logger.warning(f"Forum channel not configured for guild {guild_id}")
            return

        # CRITICAL: Check if already processing FIRST (before any file I/O)
        async with self._processing_lock:
            if message.id in self._processing_messages:
                logger.debug(f"Message {message.id} already being processed, skipping duplicate")
                return
            self._processing_messages.add(message.id)

        try:
            # Check if message already posted to starboard (fast cached check)
            if self.data.is_message_starboarded(message.id):
                logger.info(f"Message {message.id} already posted to starboard, skipping")
                self._processing_messages.discard(message.id)
                return

            # Count star reactions (optimized: count directly from reactions)
            star_count = sum(1 for r in message.reactions if str(r.emoji) == "⭐")
            logger.info(f"Message {message.id} has {star_count} star reactions (threshold: {threshold})")

            # Check if threshold is met
            if star_count >= threshold:
                logger.info(
                    f"✅ Threshold met! Posting message {message.id} to starboard "
                    f"({star_count} >= {threshold})"
                )
                # Add ✅ reaction IMMEDIATELY for instant user feedback
                try:
                    await message.add_reaction("✅")
                    logger.debug(f"Added ✅ reaction immediately for instant feedback")
                except Exception as react_error:
                    logger.warning(f"Failed to add ✅ reaction (non-critical): {react_error}")
                
                # Post to starboard in background (non-blocking for instant response)
                # Use asyncio.create_task with error handling to prevent blocking
                task = asyncio.create_task(
                    self._post_to_starboard(message, forum_channel_id, star_count)
                )
                # Add done callback to remove from processing set
                task.add_done_callback(lambda t: self._processing_messages.discard(message.id))
                logger.debug(f"Posted starboard task to background (non-blocking)")
            else:
                # Not at threshold, remove from processing set immediately
                self._processing_messages.discard(message.id)
        except Exception as e:
            # On any error, remove from processing set
            logger.error(f"Error in handle_reaction_add: {e}", exc_info=True)
            self._processing_messages.discard(message.id)
            raise
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
        """Post message to starboard forum channel (runs in background task)."""
        logger.info(
            f"Posting message {message.id} to starboard (channel: {forum_channel_id}, "
            f"stars: {star_count})"
        )

        try:
            # Yield control early to prevent blocking event loop
            await asyncio.sleep(0)
            # Use cached forum channel if available (avoid repeated lookups)
            forum_channel = self._forum_channel_cache.get(forum_channel_id)
            if forum_channel is None:
                forum_channel = self.bot.get_channel(forum_channel_id)
                if forum_channel:
                    self._forum_channel_cache[forum_channel_id] = forum_channel

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

            # Get message content with improved fallbacks
            content = self._extract_message_content(message)
            logger.debug(f"Message content length: {len(content)} chars, source: {getattr(content, '_source', 'message.content')}")

            # Auto-classify tags with improved context
            logger.debug("Classifying message for tags...")
            tags = self._classify_message(message, content)
            logger.info(f"Classified tags: {tags}")

            # Get forum tags (Discord tag objects) - optimized lookup
            forum_tags = []
            # Create lookup dict for O(1) tag matching instead of O(n) loop
            tag_lookup = {tag.name: tag for tag in forum_channel.available_tags}
            available_tag_names = list(tag_lookup.keys())
            logger.debug(f"Forum has {len(available_tag_names)} available tags: {available_tag_names}")

            for tag_name in tags:
                # Fast O(1) lookup instead of O(n) search
                forum_tag = tag_lookup.get(tag_name)
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

            # Create standardized title (pass message for better title extraction)
            title = self._create_standardized_title(message, content, tags)
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

            # ✅ reaction already added earlier for instant feedback, so skip here
            # (This prevents duplicate reactions if posting succeeds)
            
            # Remove from processing set on success
            self._processing_messages.discard(message.id)

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
        finally:
            # Always remove from processing set, even on error
            self._processing_messages.discard(message.id)

    def _extract_message_content(self, message: discord.Message) -> str:
        """
        Extract content from message with multiple fallbacks.
        
        Priority:
        1. message.content (text content)
        2. Embed title/description
        3. Attachment filenames
        4. Channel name + author name as fallback
        
        Args:
            message: Discord message object
            
        Returns:
            Extracted content string
        """
        # Try message content first
        if message.content and message.content.strip():
            return message.content.strip()
        
        # Try embeds
        if message.embeds:
            for embed in message.embeds:
                # Try embed title
                if embed.title and embed.title.strip():
                    content = embed.title.strip()
                    if embed.description and embed.description.strip():
                        content += f" - {embed.description.strip()}"
                    return content
                # Try embed description
                if embed.description and embed.description.strip():
                    return embed.description.strip()
                # Try embed fields
                if embed.fields:
                    field_texts = [f"{field.name}: {field.value}" for field in embed.fields if field.value]
                    if field_texts:
                        return " | ".join(field_texts)
        
        # Try attachments
        if message.attachments:
            filenames = [att.filename for att in message.attachments if att.filename]
            if filenames:
                return f"Attachment: {', '.join(filenames)}"
        
        # Fallback: Use channel name and author
        channel_name = getattr(message.channel, 'name', 'Unknown Channel')
        author_name = getattr(message.author, 'display_name', getattr(message.author, 'name', 'Unknown'))
        return f"Message from {author_name} in #{channel_name}"

    def _classify_message(self, message: discord.Message, content: str) -> List[str]:
        """
        Classify message with improved context including channel names.
        
        Args:
            message: Discord message object
            content: Message content string
            
        Returns:
            List of tag names
        """
        tags = []
        
        # Classify based on content
        content_tags = self.tag_classifier.classify(content)
        tags.extend(content_tags)
        
        # Classify based on channel name
        channel_name = getattr(message.channel, 'name', '').lower()
        channel_tags = self._classify_channel_name(channel_name)
        tags.extend(channel_tags)
        
        # Classify based on embeds
        if message.embeds:
            for embed in message.embeds:
                embed_text = ""
                if embed.title:
                    embed_text += embed.title + " "
                if embed.description:
                    embed_text += embed.description + " "
                if embed_text:
                    embed_tags = self.tag_classifier.classify(embed_text)
                    tags.extend(embed_tags)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tags = []
        for tag in tags:
            if tag not in seen:
                seen.add(tag)
                unique_tags.append(tag)
        
        return unique_tags

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
                logger.debug(f"Channel '{channel_name}' matched pattern '{pattern}' -> tag '{tag_name}'")
        
        return tags

    def _create_standardized_title(self, message: discord.Message, content: str, tags: List[str]) -> str:
        """
        Create standardized title with tags: [Tag1] [Tag2] Original Title.
        
        Args:
            message: Discord message object (for direct embed/attachment access)
            content: Extracted message content
            tags: List of tags to include
            
        Returns:
            Standardized title string
        """
        logger.debug(f"Creating title from content (len: {len(content)}) with tags: {tags}")

        # Try to get best title from message directly (prioritize embeds for titles)
        base_title = None
        
        # First, try embed title (best for RSS feeds and rich embeds)
        if message.embeds:
            for embed in message.embeds:
                if embed.title and embed.title.strip():
                    base_title = embed.title.strip()
                    logger.debug(f"Using embed title for base_title: {base_title}")
                    break
        
        # If no embed title, use content (first line)
        if not base_title:
            lines = content.split("\n")
            base_title = lines[0].strip() if lines else content.strip()
        
        # Filter out "No content" variations
        no_content_variants = ["*no content*", "no content", "*no content", "no content*"]
        if base_title.lower() in no_content_variants:
            base_title = None
            logger.debug(f"Filtered out 'No content' variant: {base_title}")
        
        # If base title is empty, meaningless, or filtered out, use intelligent fallback
        if not base_title or len(base_title.strip()) < 3:
            # Try embed description as fallback
            if message.embeds:
                for embed in message.embeds:
                    if embed.description and embed.description.strip() and len(embed.description.strip()) > 10:
                        base_title = embed.description.strip()[:80]  # Limit length
                        logger.debug(f"Using embed description as fallback: {base_title[:50]}...")
                        break
            
            # If still no good title, use tags + channel context
            if not base_title or len(base_title.strip()) < 3:
                channel_name = getattr(message.channel, 'name', '').replace('-', ' ').title()
                if tags:
                    base_title = f"{tags[0]} Content from {channel_name}" if channel_name else f"{tags[0]} Content"
                else:
                    base_title = f"Starred Content from {channel_name}" if channel_name else "Starred Message"
                logger.debug(f"Using intelligent fallback title: {base_title}")

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
