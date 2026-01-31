"""GitHub API service."""

import logging
import os
from typing import Dict, List, Optional
from urllib.parse import urlparse

import aiohttp
from utils.retry import retry_with_backoff

logger = logging.getLogger(__name__)

# WORKAROUND: No longer using RETRY_EXCEPTIONS tuple
# retry_with_backoff now uses string-based exception checking to avoid asyncio NameError
# This tuple is kept for reference but not used
# RETRY_EXCEPTIONS = (aiohttp.ClientError, TimeoutError)  # Not used anymore


class GitHubService:
    """Service for interacting with GitHub API."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Discord-GitHub-Bot",
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create a persistent aiohttp session."""
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
            self._session = aiohttp.ClientSession(
                connector=connector, headers=self.headers
            )
        return self._session

    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            try:
                await self._session.close()
                logger.debug("GitHub service session closed")
            except Exception as e:
                logger.error(f"Error closing aiohttp session: {e}")
            finally:
                self._session = None

    async def _request(
        self, method: str, endpoint: str, params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make a request to GitHub API with retry logic."""
        url = f"{self.base_url}{endpoint}"

        async def _make_request():
            session = await self._get_session()
            async with session.request(
                method, url, headers=self.headers, params=params
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    logger.debug(f"GitHub API 404: {endpoint}")
                    return None
                elif response.status == 429:
                    # Rate limited - will be retried by retry_with_backoff
                    retry_after = response.headers.get("Retry-After", "60")
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=429,
                        message=f"Rate limited. Retry after {retry_after}s",
                    )
                elif response.status >= 500:
                    # Server error - will be retried
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"Server error: {response.status}",
                    )
                else:
                    logger.warning(f"GitHub API error {response.status}: {endpoint}")
                    return None

        try:
            # WORKAROUND: Don't pass exceptions tuple - retry_with_backoff now uses string-based checking
            # This avoids any NameError when Python evaluates the exceptions tuple
            return await retry_with_backoff(
                _make_request,
                max_retries=3,
                initial_delay=1.0,
                max_delay=60.0,
                backoff_factor=2.0,
                exceptions=(),  # Empty tuple - not used anymore, string-based checking instead
                operation_name=f"GitHub API {method} {endpoint}",
            )
        except NameError as e:
            error_msg = str(e)
            logger.error(f"NameError in _request: {error_msg}")
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error in _request: {error_msg}")
            raise

    async def get_repo(self, owner: str, repo: str) -> Optional[Dict]:
        """Get repository information."""
        return await self._request("GET", f"/repos/{owner}/{repo}")

    async def get_latest_release(self, owner: str, repo: str) -> Optional[Dict]:
        """Get latest release for a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}/releases/latest")

    async def get_releases(
        self, owner: str, repo: str, per_page: int = 10
    ) -> List[Dict]:
        """Get releases for a repository."""
        result = await self._request(
            "GET", f"/repos/{owner}/{repo}/releases", params={"per_page": per_page}
        )
        return result or []

    async def get_repo_events(
        self, owner: str, repo: str, per_page: int = 30
    ) -> List[Dict]:
        """Get repository events (pushes, releases, etc.)."""
        result = await self._request(
            "GET", f"/repos/{owner}/{repo}/events", params={"per_page": per_page}
        )
        return result or []

    async def get_user(self, username: str) -> Optional[Dict]:
        """Get user information."""
        return await self._request("GET", f"/users/{username}")

    async def get_user_events(self, username: str, per_page: int = 30) -> List[Dict]:
        """Get user's public events."""
        result = await self._request(
            "GET", f"/users/{username}/events/public", params={"per_page": per_page}
        )
        return result or []

    async def get_user_repos(self, username: str, per_page: int = 30) -> List[Dict]:
        """Get user's repositories."""
        result = await self._request(
            "GET",
            f"/users/{username}/repos",
            params={"per_page": per_page, "sort": "updated"},
        )
        return result or []

    async def get_repo_commits(
        self, owner: str, repo: str, sha: Optional[str] = None, per_page: int = 30
    ) -> List[Dict]:
        """Get repository commits."""
        endpoint = f"/repos/{owner}/{repo}/commits"
        params = {"per_page": per_page}
        if sha:
            params["sha"] = sha
        result = await self._request("GET", endpoint, params=params)
        return result or []

    async def check_repo_exists(self, owner: str, repo: str) -> bool:
        """Check if repository exists."""
        result = await self.get_repo(owner, repo)
        return result is not None

    def parse_repo_name(self, repo_input: str) -> tuple[Optional[str], Optional[str]]:
        """
        Parse repository name or URL into owner and repo.

        Supports:
        - owner/repo (e.g., discord/discord.py)
        - https://github.com/owner/repo
        - http://github.com/owner/repo
        - github.com/owner/repo
        - www.github.com/owner/repo

        Uses URL parsing to prevent hostname bypass (e.g. evil.github.com).
        """
        repo_input = repo_input.strip()

        if "/" in repo_input and (
            repo_input.startswith(("http://", "https://"))
            or repo_input.startswith(("github.com", "www.github.com"))
        ):
            if not repo_input.startswith(("http://", "https://")):
                repo_input = "https://" + repo_input
            try:
                parsed = urlparse(repo_input)
                host = (parsed.hostname or "").lower()
                if host not in ("github.com", "www.github.com"):
                    return None, None
                path = parsed.path.strip("/")
                if path.endswith(".git"):
                    path = path[:-4]
                parts = path.split("/")
                if len(parts) >= 2:
                    owner = parts[0].strip()
                    repo = parts[1].strip()
                    if "?" in repo:
                        repo = repo.split("?")[0]
                    if "#" in repo:
                        repo = repo.split("#")[0]
                    if owner and repo:
                        return owner, repo
            except (ValueError, AttributeError):
                pass
            return None, None

        parts = repo_input.split("/")
        if len(parts) == 2:
            owner = parts[0].strip()
            repo = parts[1].strip()
            if "?" in repo:
                repo = repo.split("?")[0]
            if "#" in repo:
                repo = repo.split("#")[0]
            if owner and repo:
                return owner, repo

        return None, None
