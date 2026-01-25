"""Retry utility with exponential backoff for Discord API calls."""

import asyncio
import logging
from typing import Callable, TypeVar, Optional
import discord

logger = logging.getLogger(__name__)

T = TypeVar('T')


async def retry_discord_api(
    func: Callable,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    operation_name: str = "Discord API call"
) -> Optional[T]:
    """
    Retry a Discord API call with exponential backoff.
    Handles rate limits (429) and temporary errors.
    
    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        backoff_factor: Multiplier for delay after each retry
        operation_name: Name of operation for logging
    
    Returns:
        Result of function call or None if all retries fail
    """
    delay = initial_delay
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except discord.HTTPException as e:
            # Handle rate limits
            if e.status == 429:
                retry_after = e.retry_after if hasattr(e, 'retry_after') else delay
                if attempt < max_retries:
                    logger.warning(f"{operation_name} rate limited. Retrying after {retry_after:.1f}s...")
                    await asyncio.sleep(retry_after)
                    delay = min(delay * backoff_factor, max_delay)
                    continue
            
            # Handle other HTTP errors
            if e.status >= 500 and attempt < max_retries:
                logger.warning(f"{operation_name} server error {e.status} (attempt {attempt + 1}/{max_retries + 1}). Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
                delay = min(delay * backoff_factor, max_delay)
                continue
            
            # Client errors (4xx) shouldn't be retried
            logger.error(f"{operation_name} failed with HTTP {e.status}: {e}")
            return None
            
        except (discord.ConnectionClosed, asyncio.TimeoutError) as e:
            # Network errors - retry
            if attempt < max_retries:
                logger.warning(f"{operation_name} connection error (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
                delay = min(delay * backoff_factor, max_delay)
                continue
            logger.error(f"{operation_name} failed after {max_retries + 1} attempts: {e}")
            return None
            
        except Exception as e:
            # Unexpected errors
            if attempt == max_retries:
                logger.error(f"{operation_name} failed after {max_retries + 1} attempts: {e}")
                return None
            logger.warning(f"{operation_name} error (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {delay:.1f}s...")
            await asyncio.sleep(delay)
            delay = min(delay * backoff_factor, max_delay)
    
    return None
