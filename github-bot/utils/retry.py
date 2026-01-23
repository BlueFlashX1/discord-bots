"""Retry utility with exponential backoff for API calls."""

import asyncio
import logging
from typing import Callable, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,),
    operation_name: str = "operation",
) -> Optional[T]:
    """
    Retry a function with exponential backoff.

    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        backoff_factor: Multiplier for delay after each retry
        exceptions: Tuple of exceptions to catch and retry
        operation_name: Name of operation for logging

    Returns:
        Result of function call or None if all retries fail
    """
    delay = initial_delay

    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            # WORKAROUND: Check exception type by name, NEVER use isinstance with exceptions tuple
            # This completely avoids any asyncio NameError issues
            exc_type = type(e)
            exc_type_name = exc_type.__name__
            exc_module = getattr(exc_type, "__module__", "")

            # Check if it's a retryable exception by type name and module
            # Never reference asyncio or use isinstance with the exceptions tuple
            should_retry = (
                exc_type_name
                in (
                    "TimeoutError",
                    "ClientError",
                    "ClientResponseError",
                    "ClientConnectionError",
                    "ClientConnectorError",
                )
                or "aiohttp" in exc_module
                or exc_type_name.endswith(
                    "TimeoutError"
                )  # Catches asyncio.TimeoutError by name
            )

            if should_retry:
                if attempt == max_retries:
                    logger.error(
                        f"{operation_name} failed after {max_retries + 1} attempts: {e}"
                    )
                    return None

                logger.warning(
                    f"{operation_name} failed (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
                delay = min(delay * backoff_factor, max_delay)
            else:
                # Not a retryable exception, re-raise
                raise

    return None
