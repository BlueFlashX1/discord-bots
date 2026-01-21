"""GitHub API service."""

import aiohttp
from typing import Dict, List, Optional, Any
import os


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

    async def _request(
        self, method: str, endpoint: str, params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make a request to GitHub API."""
        url = f"{self.base_url}{endpoint}"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.request(
                    method, url, headers=self.headers, params=params
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 404:
                        return None
                    else:
                        print(f"GitHub API error: {response.status}")
                        return None
            except Exception as e:
                print(f"Request error: {e}")
                return None

    async def get_repo(self, owner: str, repo: str) -> Optional[Dict]:
        """Get repository information."""
        return await self._request("GET", f"/repos/{owner}/{repo}")

    async def get_latest_release(self, owner: str, repo: str) -> Optional[Dict]:
        """Get latest release for a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}/releases/latest")

    async def get_releases(self, owner: str, repo: str, per_page: int = 10) -> List[Dict]:
        """Get releases for a repository."""
        result = await self._request(
            "GET", f"/repos/{owner}/{repo}/releases", params={"per_page": per_page}
        )
        return result or []

    async def get_repo_events(self, owner: str, repo: str, per_page: int = 30) -> List[Dict]:
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
            "GET", f"/users/{username}/repos", params={"per_page": per_page, "sort": "updated"}
        )
        return result or []

    async def get_repo_commits(self, owner: str, repo: str, sha: Optional[str] = None, per_page: int = 30) -> List[Dict]:
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
        """Parse repository name into owner and repo."""
        parts = repo_input.strip().split("/")
        if len(parts) == 2:
            return parts[0], parts[1]
        return None, None
