"""Data manager for Starboard bot."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class DataManager:
    """Manages data storage for the Starboard bot."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        logger.debug(f"DataManager initialized with data directory: {self.data_dir}")

        # File paths
        self.starboard_file = self.data_dir / "starboard.json"
        self.config_file = self.data_dir / "config.json"

        # In-memory cache for performance (avoid repeated file reads)
        self._starboard_cache: Optional[Dict[str, Dict]] = None
        self._config_cache: Optional[Dict[str, Any]] = None
        self._cache_dirty = {"starboard": False, "config": False}

        # Log file status
        logger.debug(
            f"Data files - Starboard: {self.starboard_file.exists()}, "
            f"Config: {self.config_file.exists()}"
        )

    def _load_json(self, file_path: Path, default: Any = None) -> Any:
        """Load JSON file."""
        try:
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    logger.debug(f"Loaded {len(data) if isinstance(data, dict) else 'data'} from {file_path.name}")
                    return data
            else:
                logger.debug(f"File {file_path.name} does not exist, using default")
                return default or {}
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in {file_path.name}: {e}", exc_info=True)
            return default or {}
        except IOError as e:
            logger.error(f"IO error reading {file_path.name}: {e}", exc_info=True)
            return default or {}

    def _save_json(self, file_path: Path, data: Any):
        """Save JSON file."""
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.debug(f"Saved data to {file_path.name}")
        except IOError as e:
            logger.error(f"IO error writing {file_path.name}: {e}", exc_info=True)
            raise

    # Starboard entries
    def get_starboard_entries(self) -> Dict[str, Dict]:
        """Get all starboard entries (cached for performance)."""
        # Use cache if available and not dirty
        if self._starboard_cache is not None and not self._cache_dirty["starboard"]:
            return self._starboard_cache
        
        # Load from file and cache
        entries = self._load_json(self.starboard_file, {})
        self._starboard_cache = entries
        self._cache_dirty["starboard"] = False
        logger.debug(f"Retrieved {len(entries)} starboard entries (cached)")
        return entries

    def is_message_starboarded(self, message_id: int) -> bool:
        """Check if message has already been posted to starboard."""
        entries = self.get_starboard_entries()
        is_starboarded = str(message_id) in entries
        logger.debug(f"Message {message_id} starboarded: {is_starboarded}")
        return is_starboarded

    def get_starboard_entry(self, message_id: int) -> Optional[Dict]:
        """Get starboard entry for a message."""
        entries = self.get_starboard_entries()
        entry = entries.get(str(message_id))
        if entry:
            logger.debug(f"Found starboard entry for message {message_id}: thread {entry.get('thread_id')}")
        else:
            logger.debug(f"No starboard entry found for message {message_id}")
        return entry

    def add_starboard_entry(
        self,
        message_id: int,
        thread_id: int,
        channel_id: int,
        guild_id: int,
        tags: List[str],
    ):
        """Add a starboard entry."""
        logger.info(
            f"Adding starboard entry: message {message_id} -> thread {thread_id} "
            f"(guild: {guild_id}, tags: {tags})"
        )
        entries = self.get_starboard_entries()

        entries[str(message_id)] = {
            "message_id": message_id,
            "thread_id": thread_id,
            "channel_id": channel_id,
            "guild_id": guild_id,
            "tags": tags,
        }

        # Update cache immediately
        self._starboard_cache = entries
        self._cache_dirty["starboard"] = True
        
        self._save_json(self.starboard_file, entries)
        self._cache_dirty["starboard"] = False  # Cache is now in sync
        logger.debug(f"Starboard entry saved. Total entries: {len(entries)}")

    # Guild configuration
    def get_config(self) -> Dict[str, Any]:
        """Get all guild configurations (cached for performance)."""
        # Use cache if available and not dirty
        if self._config_cache is not None and not self._cache_dirty["config"]:
            return self._config_cache
        
        # Load from file and cache
        config = self._load_json(self.config_file, {})
        self._config_cache = config
        self._cache_dirty["config"] = False
        logger.debug(f"Retrieved config for {len(config)} guilds (cached)")
        return config

    def get_guild_config(self, guild_id: int) -> Optional[Dict]:
        """Get configuration for a specific guild."""
        config = self.get_config()
        guild_config = config.get(str(guild_id))
        if guild_config:
            logger.debug(f"Found config for guild {guild_id}")
        else:
            logger.debug(f"No config found for guild {guild_id}")
        return guild_config

    def set_guild_config(
        self,
        guild_id: int,
        forum_channel_id: Optional[int] = None,
        star_threshold: Optional[int] = None,
    ):
        """Set configuration for a guild."""
        logger.info(
            f"Setting config for guild {guild_id}: "
            f"forum={forum_channel_id}, threshold={star_threshold}"
        )
        config = self.get_config()
        guild_key = str(guild_id)

        if guild_key not in config:
            config[guild_key] = {}
            logger.debug(f"Created new config entry for guild {guild_id}")

        if forum_channel_id is not None:
            config[guild_key]["forum_channel_id"] = forum_channel_id
            logger.debug(f"Set forum channel to {forum_channel_id}")

        if star_threshold is not None:
            config[guild_key]["star_threshold"] = star_threshold
            logger.debug(f"Set star threshold to {star_threshold}")

        # Update cache immediately
        self._config_cache = config
        self._cache_dirty["config"] = True
        
        self._save_json(self.config_file, config)
        self._cache_dirty["config"] = False  # Cache is now in sync
        logger.info(f"Config saved for guild {guild_id}")

    def get_forum_channel(self, guild_id: int) -> Optional[int]:
        """Get forum channel ID for a guild."""
        guild_config = self.get_guild_config(guild_id)
        if guild_config:
            channel_id = guild_config.get("forum_channel_id")
            logger.debug(f"Forum channel for guild {guild_id}: {channel_id}")
            return channel_id
        logger.debug(f"No forum channel configured for guild {guild_id}")
        return None

    def set_forum_channel(self, guild_id: int, channel_id: int):
        """Set forum channel for a guild."""
        logger.info(f"Setting forum channel for guild {guild_id} to {channel_id}")
        self.set_guild_config(guild_id, forum_channel_id=channel_id)

    def get_star_threshold(self, guild_id: int) -> int:
        """Get star threshold for a guild (default: 1)."""
        guild_config = self.get_guild_config(guild_id)
        if guild_config:
            threshold = guild_config.get("star_threshold", 1)
            logger.debug(f"Star threshold for guild {guild_id}: {threshold}")
            return threshold
        logger.debug(f"Using default star threshold (1) for guild {guild_id}")
        return 1

    def set_star_threshold(self, guild_id: int, threshold: int):
        """Set star threshold for a guild."""
        logger.info(f"Setting star threshold for guild {guild_id} to {threshold}")
        self.set_guild_config(guild_id, star_threshold=threshold)
