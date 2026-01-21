"""
In-memory caching system for Discord bot
Reduces file I/O and improves performance
"""

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

# Cache storage
_stats_cache: Optional[Dict] = None
_stats_cache_file = "data/player_stats.json"
_stats_cache_modified = 0.0
_stats_save_task: Optional[asyncio.Task] = None

# Cache configuration
CACHE_SAVE_INTERVAL = 30  # Save to disk every 30 seconds
CACHE_MAX_AGE = 60  # Reload from disk if cache older than 60 seconds


def get_stats_cache() -> Dict:
    """Get stats cache, loading from disk if needed"""
    global _stats_cache, _stats_cache_modified

    # Ensure data directory exists
    os.makedirs(os.path.dirname(_stats_cache_file), exist_ok=True)

    # Check if cache needs refresh
    if _stats_cache is None:
        _load_stats_cache()
    else:
        # Check file modification time
        if os.path.exists(_stats_cache_file):
            file_mtime = os.path.getmtime(_stats_cache_file)
            if file_mtime > _stats_cache_modified:
                # File was modified externally, reload
                _load_stats_cache()

    # Ensure cache has proper structure
    if _stats_cache is None:
        _stats_cache = {"metadata": {}, "players": {}}
    if "metadata" not in _stats_cache:
        _stats_cache["metadata"] = {}
    if "players" not in _stats_cache:
        _stats_cache["players"] = {}

    return _stats_cache


def _load_stats_cache():
    """Load stats from disk into cache"""
    global _stats_cache, _stats_cache_modified

    if os.path.exists(_stats_cache_file):
        try:
            with open(_stats_cache_file, "r") as f:
                _stats_cache = json.load(f)
            _stats_cache_modified = time.time()
        except Exception as e:
            print(f"[Cache] Error loading stats: {e}")
            _stats_cache = {"metadata": {}, "players": {}}
    else:
        _stats_cache = {"metadata": {}, "players": {}}
        _stats_cache_modified = time.time()


def save_stats_cache():
    """Save stats cache to disk synchronously"""
    global _stats_cache

    if _stats_cache is None:
        return

    try:
        os.makedirs(os.path.dirname(_stats_cache_file), exist_ok=True)
        with open(_stats_cache_file, "w") as f:
            json.dump(_stats_cache, f, indent=2)
    except Exception as e:
        print(f"[Cache] Error saving stats: {e}")


async def save_stats_cache_async():
    """Save stats cache to disk asynchronously"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, save_stats_cache)


def schedule_stats_save():
    """Schedule periodic stats save (non-blocking)"""
    global _stats_save_task

    if _stats_save_task is None or _stats_save_task.done():
        _stats_save_task = asyncio.create_task(_periodic_save())


async def _periodic_save():
    """Periodically save stats cache"""
    while True:
        try:
            await asyncio.sleep(CACHE_SAVE_INTERVAL)
            save_stats_cache()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Cache] Error in periodic save: {e}")


def invalidate_stats_cache():
    """Force cache reload on next access"""
    global _stats_cache
    _stats_cache = None


def flush_stats_cache():
    """Immediately save cache to disk"""
    save_stats_cache()
