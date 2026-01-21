"""Discord embed utilities for GitHub bot."""

import discord
from typing import Optional, Dict, List
from datetime import datetime


def create_repo_embed(
    repo_name: str,
    owner: str,
    description: Optional[str] = None,
    stars: int = 0,
    forks: int = 0,
    language: Optional[str] = None,
    url: Optional[str] = None,
) -> discord.Embed:
    """Create an embed for a GitHub repository."""
    embed = discord.Embed(
        title=f"{owner}/{repo_name}",
        description=description or "No description",
        color=discord.Color.blue(),
        url=url or f"https://github.com/{owner}/{repo_name}",
    )

    embed.add_field(name="⭐ Stars", value=str(stars), inline=True)
    embed.add_field(name="🍴 Forks", value=str(forks), inline=True)
    if language:
        embed.add_field(name="💻 Language", value=language, inline=True)

    embed.set_footer(text="GitHub")
    return embed


def create_release_embed(
    repo_name: str,
    release_name: str,
    tag: str,
    body: Optional[str] = None,
    author: Optional[str] = None,
    published_at: Optional[str] = None,
    url: Optional[str] = None,
) -> discord.Embed:
    """Create an embed for a GitHub release."""
    embed = discord.Embed(
        title=f"🚀 New Release: {release_name}",
        description=f"**{repo_name}** - `{tag}`",
        color=discord.Color.green(),
        url=url,
    )

    if body:
        # Truncate body if too long
        body_text = body[:500] + "..." if len(body) > 500 else body
        embed.add_field(name="📝 Release Notes", value=body_text, inline=False)

    if author:
        embed.add_field(name="👤 Author", value=author, inline=True)

    if published_at:
        try:
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            embed.add_field(
                name="📅 Published",
                value=f"<t:{int(dt.timestamp())}:R>",
                inline=True,
            )
        except:
            embed.add_field(name="📅 Published", value=published_at, inline=True)

    embed.set_footer(text="GitHub Release")
    return embed


def create_contribution_stats_embed(
    username: str,
    stats: Dict[str, int],
    streak: Optional[int] = None,
) -> discord.Embed:
    """Create an embed for contribution statistics."""
    embed = discord.Embed(
        title=f"📊 GitHub Stats: {username}",
        description=f"Contributions overview",
        color=discord.Color.orange(),
    )

    if "total_contributions" in stats:
        embed.add_field(
            name="📈 Total Contributions",
            value=str(stats["total_contributions"]),
            inline=True,
        )

    if "commits" in stats:
        embed.add_field(name="💾 Commits", value=str(stats["commits"]), inline=True)

    if "pull_requests" in stats:
        embed.add_field(
            name="🔀 Pull Requests", value=str(stats["pull_requests"]), inline=True
        )

    if "issues" in stats:
        embed.add_field(name="🐛 Issues", value=str(stats["issues"]), inline=True)

    if "repositories" in stats:
        embed.add_field(
            name="📦 Repositories", value=str(stats["repositories"]), inline=True
        )

    if streak is not None:
        embed.add_field(name="🔥 Streak", value=f"{streak} days", inline=True)

    embed.set_footer(text="GitHub Contributions")
    return embed


def create_activity_embed(
    username: str,
    activities: List[Dict[str, any]],
    limit: int = 10,
) -> discord.Embed:
    """Create an embed for recent GitHub activity."""
    embed = discord.Embed(
        title=f"⚡ Recent Activity: {username}",
        description=f"Latest {limit} activities",
        color=discord.Color.purple(),
    )

    if not activities:
        embed.description = "No recent activity"
        return embed

    for i, activity in enumerate(activities[:limit], 1):
        activity_type = activity.get("type", "Unknown")
        repo = activity.get("repo", {}).get("name", "Unknown")
        title = activity.get("payload", {}).get("action", "")

        value = f"**{activity_type}**"
        if title:
            value += f": {title}"
        value += f"\n📦 {repo}"

        embed.add_field(
            name=f"{i}. {activity_type}",
            value=value,
            inline=False,
        )

    embed.set_footer(text="GitHub Activity")
    return embed


def create_tracked_repos_embed(repos: Dict[str, Dict]) -> discord.Embed:
    """Create an embed listing tracked repositories."""
    embed = discord.Embed(
        title="📋 Tracked Repositories",
        description=f"Currently tracking {len(repos)} repositories",
        color=discord.Color.blue(),
    )

    if not repos:
        embed.description = "No repositories being tracked"
        return embed

    for repo, config in list(repos.items())[:20]:
        events = ", ".join(config.get("events", []))
        embed.add_field(
            name=f"📦 {repo}",
            value=f"Events: {events or 'All'}",
            inline=False,
        )

    if len(repos) > 20:
        embed.set_footer(text=f"Showing 20 of {len(repos)} repositories")

    return embed


def create_error_embed(message: str) -> discord.Embed:
    """Create an error embed."""
    return discord.Embed(
        title="❌ Error",
        description=message,
        color=discord.Color.red(),
    )


def create_success_embed(message: str) -> discord.Embed:
    """Create a success embed."""
    return discord.Embed(
        title="✅ Success",
        description=message,
        color=discord.Color.green(),
    )
