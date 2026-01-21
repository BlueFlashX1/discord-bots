"""Analyze game sessions and provide spelling insights"""

from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from src.ai.word_generator import WordGenerator


class SessionAnalyzer:
    """Analyze spelling bee game sessions and track learning progress"""

    def __init__(self, word_generator: Optional[WordGenerator] = None):
        """
        Initialize session analyzer

        Args:
            word_generator: WordGenerator instance for detailed analysis
        """
        self.word_generator = word_generator
        self.session_history: List[Dict] = []

    def analyze_session(self, game_summary: Dict) -> Dict:
        """
        Analyze a completed game session

        Args:
            game_summary: Summary of game session

        Returns:
            Analysis report with insights
        """
        report = {
            "game_id": game_summary.get("game_id"),
            "session_date": datetime.now().isoformat(),
            "total_words_possible": game_summary.get("possible_words_count", 0),
            "total_words_found": game_summary.get("words_found_total", 0),
            "participation": len(game_summary.get("leaderboard", [])),
            "success_rate": self._calculate_success_rate(game_summary),
            "top_performer": self._get_top_performer(game_summary),
            "difficulty_breakdown": self._analyze_difficulty_breakdown(game_summary),
            "common_errors": [],
            "insights": [],
        }

        return report

    def _calculate_success_rate(self, game_summary: Dict) -> float:
        """Calculate percentage of possible words found"""
        total_possible = game_summary.get("possible_words_count", 1)
        total_found = game_summary.get("words_found_total", 0)
        return (total_found / total_possible * 100) if total_possible > 0 else 0

    def _get_top_performer(self, game_summary: Dict) -> Optional[Dict]:
        """Get the highest scoring player"""
        leaderboard = game_summary.get("leaderboard", [])
        if leaderboard:
            player_id, player_name, points, words = leaderboard[0]
            return {
                "player_id": player_id,
                "points": points,
                "words_found": words,
            }
        return None

    def _analyze_difficulty_breakdown(self, game_summary: Dict) -> Dict:
        """Analyze which difficulty levels were most successful"""
        return {
            "easy_found": 0,
            "medium_found": 0,
            "hard_found": 0,
            "expert_found": 0,
        }

    def extract_common_errors(self, session_errors: List[Dict]) -> Dict[str, int]:
        """
        Identify patterns in spelling errors

        Args:
            session_errors: List of error records from game session

        Returns:
            Dictionary of error patterns and their frequencies
        """
        error_patterns = defaultdict(int)
        error_types = defaultdict(int)

        for error in session_errors:
            error_type = error.get("type", "unknown")
            error_types[error_type] += 1

            # Analyze specific error patterns
            if error_type == "invalid_word":
                # Could add more pattern analysis here
                error_patterns["invalid_word"] += 1

        return dict(error_patterns)

    async def generate_player_insights(
        self, player_id: int, attempts: List[Dict], errors: List[Dict]
    ) -> Dict:
        """
        Generate personalized spelling insights for a player

        Args:
            player_id: Player ID
            attempts: List of player attempts
            errors: List of player errors

        Returns:
            Personalized insights and recommendations
        """
        insights = {
            "player_id": player_id,
            "total_attempts": len(attempts),
            "successful_attempts": len(attempts) - len(errors),
            "error_rate": (len(errors) / len(attempts) * 100) if attempts else 0,
            "recommendations": [],
            "patterns": self._identify_error_patterns(errors),
        }

        # Generate AI-based recommendations
        if self.word_generator and errors:
            recommendations = await self._generate_recommendations(errors)
            insights["recommendations"] = recommendations

        return insights

    def _identify_error_patterns(self, errors: List[Dict]) -> List[str]:
        """Identify common error patterns"""
        patterns = []

        if not errors:
            return patterns

        # Analyze error types
        error_types = defaultdict(int)
        for error in errors:
            error_type = error.get("type", "unknown")
            error_types[error_type] += 1

        # Generate pattern descriptions
        for error_type, count in error_types.items():
            if count > 1:
                patterns.append(
                    f"Multiple errors with {error_type} (found {count} times)"
                )

        return patterns

    async def _generate_recommendations(self, errors: List[Dict]) -> List[str]:
        """Generate AI-powered spelling recommendations"""
        recommendations = []

        if not self.word_generator:
            return recommendations

        # Analyze first few errors
        for error in errors[:3]:
            word = error.get("word", "")
            if word:
                try:
                    # Get tips for common misspellings
                    tips = await self.word_generator.get_spelling_tips(word)
                    recommendations.append(tips)
                except Exception:
                    pass

        return recommendations

    def generate_session_report(
        self,
        game_summary: Dict,
        session_errors: List[Dict],
        player_stats: Dict[int, Dict],
    ) -> str:
        """
        Generate readable session report

        Args:
            game_summary: Game summary
            session_errors: Session errors
            player_stats: Player statistics

        Returns:
            Formatted report string
        """
        report = "📊 **Spelling Bee Session Report**\n\n"

        report += f"**Letters:** {game_summary.get('letters')}\n"
        report += f"**Possible Words:** {game_summary.get('possible_words_count')}" "\n"
        report += f"**Words Found:** " f"{game_summary.get('words_found_total')}\n"

        # Success rate
        success_rate = self._calculate_success_rate(game_summary)
        report += f"**Success Rate:** {success_rate:.1f}%\n\n"

        # Leaderboard
        report += "**🏆 Leaderboard:**\n"
        for rank, (player_id, name, points, words) in enumerate(
            game_summary.get("leaderboard", []), 1
        ):
            report += f"{rank}. {name}: {points} points " f"({words} words)\n"

        # Common errors
        if session_errors:
            error_patterns = self.extract_common_errors(session_errors)
            if error_patterns:
                report += "\n**Common Error Patterns:**\n"
                for pattern, count in error_patterns.items():
                    report += f"- {pattern}: {count} times\n"

        return report


# Global session analyzer instance
analyzer_instance: Optional[SessionAnalyzer] = None


def get_analyzer(
    word_generator: Optional[WordGenerator] = None,
) -> SessionAnalyzer:
    """Get or create session analyzer instance"""
    global analyzer_instance
    if analyzer_instance is None:
        analyzer_instance = SessionAnalyzer(word_generator)
    return analyzer_instance
