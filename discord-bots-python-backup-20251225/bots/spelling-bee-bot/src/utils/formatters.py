"""Formatting utilities for Discord embeds and display"""

from typing import Dict, List, Optional, Tuple

import discord


class LeaderboardFormatter:
    """Format game results for Discord display with proper field limits"""

    # Discord embed field limit
    MAX_FIELD_LENGTH = 1024
    MAX_EMBED_DESCRIPTION = 4096

    @staticmethod
    def truncate_with_ellipsis(text: str, max_length: int = 100) -> str:
        """
        Safely truncate text and add ellipsis if needed.

        Args:
            text: Text to truncate
            max_length: Maximum length before truncation

        Returns:
            Truncated text with ellipsis if needed
        """
        if len(text) <= max_length:
            return text
        return text[: max_length - 3] + "..."

    @staticmethod
    def format_game_results(
        leaderboard: List[Tuple[int, str, int, int]],
        include_word_count: bool = True,
    ) -> str:
        """
        Format game leaderboard for embed field.

        Handles long content by truncating if needed.

        Args:
            leaderboard: List of (player_id, player_name, points, word_count)
            include_word_count: Whether to include word count in output

        Returns:
            Formatted leaderboard string
        """
        lines = []

        for rank, (player_id, name, points, word_count) in enumerate(leaderboard, 1):
            # Format based on rank
            if rank == 1:
                medal = "🥇"
            elif rank == 2:
                medal = "🥈"
            elif rank == 3:
                medal = "🥉"
            else:
                medal = f"{rank}️⃣"

            if include_word_count:
                line = f"{medal} {name}: {points} pts ({word_count} words)"
            else:
                line = f"{medal} {name}: {points} pts"

            lines.append(line)

        result = "\n".join(lines)

        # Truncate if too long for Discord field
        if len(result) > LeaderboardFormatter.MAX_FIELD_LENGTH:
            result = LeaderboardFormatter.truncate_with_ellipsis(
                result, LeaderboardFormatter.MAX_FIELD_LENGTH
            )

        return result

    @staticmethod
    def format_player_words_and_definitions(
        player_name: str,
        words_with_definitions: List[Tuple[str, int, str]],
    ) -> str:
        """
        Format a player's words and definitions for embed field.

        Handles long definitions by truncating.

        Args:
            player_name: Name of the player
            words_with_definitions: List of (word, points, definition)

        Returns:
            Formatted string for embed field
        """
        if not words_with_definitions:
            return f"**{player_name}**: No words found"

        lines = [f"**{player_name}** ({len(words_with_definitions)} words):"]

        for word, points, definition in words_with_definitions:
            # Truncate long definitions
            short_def = LeaderboardFormatter.truncate_with_ellipsis(definition, 60)
            line = f"• **{word}** ({points}pts): {short_def}"
            lines.append(line)

        result = "\n".join(lines)

        # Truncate if too long for Discord field
        if len(result) > LeaderboardFormatter.MAX_FIELD_LENGTH:
            # Keep first few words and truncate
            result = LeaderboardFormatter.truncate_with_ellipsis(
                result, LeaderboardFormatter.MAX_FIELD_LENGTH
            )

        return result

    @staticmethod
    def create_leaderboard_embed(
        game_id: str,
        letters: str,
        leaderboard: List[Tuple[int, str, int, int]],
        player_details: Optional[Dict] = None,
        color: int = 0x3498DB,
    ) -> discord.Embed:
        """
        Create a complete leaderboard embed for game results.

        Args:
            game_id: The game ID
            letters: The letters used in the game
            leaderboard: Main leaderboard data
            player_details: Optional dict mapping player names to words
            color: Embed color

        Returns:
            Formatted Discord embed
        """
        embed = discord.Embed(
            title="🏆 Spelling Bee Results",
            description=f"Game ID: `{game_id}`",
            color=color,
        )

        embed.add_field(
            name="📝 Letters",
            value=f"`{letters}`",
            inline=False,
        )

        # Add main leaderboard
        leaderboard_text = LeaderboardFormatter.format_game_results(leaderboard)
        embed.add_field(
            name="🏅 Leaderboard",
            value=leaderboard_text,
            inline=False,
        )

        # Add player details if provided
        if player_details:
            for player_name, words_data in player_details.items():
                details_text = LeaderboardFormatter.format_player_words_and_definitions(
                    player_name, words_data
                )
                embed.add_field(
                    name="📚 Words Found",
                    value=details_text,
                    inline=False,
                )

        return embed

    @staticmethod
    def format_stats_leaderboard(
        player_stats: List[Tuple[str, int, int, float]],
        limit: int = 10,
    ) -> str:
        """
        Format player statistics leaderboard.

        Args:
            player_stats: List of (player_name, total_pts, games, avg)
            limit: Maximum number of entries to show

        Returns:
            Formatted leaderboard string
        """
        lines = []
        limited_stats = player_stats[:limit]

        for rank, (name, total_points, games, avg_score) in enumerate(limited_stats, 1):
            if rank == 1:
                medal = "🥇"
            elif rank == 2:
                medal = "🥈"
            elif rank == 3:
                medal = "🥉"
            else:
                medal = f"{rank}️⃣"

            line = (
                f"{medal} {name}: {total_points} pts "
                f"({games} games, avg: {avg_score:.1f})"
            )
            lines.append(line)

        result = "\n".join(lines)

        # Truncate if needed
        if len(result) > LeaderboardFormatter.MAX_FIELD_LENGTH:
            result = LeaderboardFormatter.truncate_with_ellipsis(
                result, LeaderboardFormatter.MAX_FIELD_LENGTH
            )

        return result
