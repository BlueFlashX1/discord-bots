"""Tests for ExercismAPI client."""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.exercism_api import ExercismAPI


class TestExercismAPIInit:
    """Tests for ExercismAPI initialization."""

    def test_init_with_token(self):
        """API initializes with provided token."""
        api = ExercismAPI(token="test-token-123")
        assert api.token == "test-token-123"

    def test_init_from_env(self):
        """API loads token from environment variable."""
        with patch.dict('os.environ', {'EXERCISM_TOKEN': 'env-token'}):
            api = ExercismAPI()
            assert api.token == 'env-token'

    def test_cache_duration_default(self):
        """Cache duration is set correctly."""
        api = ExercismAPI(token="test")
        assert api.CACHE_DURATION == timedelta(hours=1)


class TestExercismAPICaching:
    """Tests for API caching behavior."""

    @pytest.fixture
    def api(self):
        """Create API instance for testing."""
        return ExercismAPI(token="test-token")

    def test_cache_initially_empty(self, api):
        """Cache starts empty."""
        assert api._cache == {}

    def test_clear_cache_single_track(self, api):
        """Clearing cache for single track works."""
        api._cache["python"] = {"exercises": set(), "fetched_at": datetime.now()}
        api._cache["rust"] = {"exercises": set(), "fetched_at": datetime.now()}
        
        api.clear_cache("python")
        
        assert "python" not in api._cache
        assert "rust" in api._cache

    def test_clear_cache_all(self, api):
        """Clearing all cache works."""
        api._cache["python"] = {"exercises": set(), "fetched_at": datetime.now()}
        api._cache["rust"] = {"exercises": set(), "fetched_at": datetime.now()}
        
        api.clear_cache()
        
        assert api._cache == {}


class TestDifficultyMapping:
    """Tests for difficulty category mapping."""

    @pytest.fixture
    def api(self):
        return ExercismAPI(token="test")

    @pytest.mark.asyncio
    async def test_get_unlocked_exercises_by_difficulty_mapping(self, api):
        """Difficulty mapping works correctly."""
        # Mock the API response
        mock_exercises = [
            {"slug": "easy-one", "difficulty": "easy", "is_unlocked": True},
            {"slug": "medium-one", "difficulty": "medium", "is_unlocked": True},
            {"slug": "hard-one", "difficulty": "hard", "is_unlocked": True},
            {"slug": "locked-one", "difficulty": "easy", "is_unlocked": False},
        ]
        
        with patch.object(api, 'get_track_exercises', new_callable=AsyncMock) as mock:
            mock.return_value = (True, mock_exercises)
            
            beginner = await api.get_unlocked_exercises_by_difficulty("python", "beginner")
            intermediate = await api.get_unlocked_exercises_by_difficulty("python", "intermediate")
            advanced = await api.get_unlocked_exercises_by_difficulty("python", "advanced")
            
        assert "easy-one" in beginner
        assert "medium-one" in intermediate
        assert "hard-one" in advanced
        assert "locked-one" not in beginner  # Not unlocked


class TestAPISession:
    """Tests for aiohttp session management."""

    def test_session_initially_none(self):
        """Session is None initially."""
        api = ExercismAPI(token="test")
        assert api._session is None

    @pytest.mark.asyncio
    async def test_close_handles_no_session(self):
        """Closing API with no session doesn't error."""
        api = ExercismAPI(token="test")
        await api.close()  # Should not raise

    @pytest.mark.asyncio
    async def test_close_closes_session(self):
        """Closing API closes the session."""
        api = ExercismAPI(token="test")
        
        # Create a mock session
        mock_session = MagicMock()
        mock_session.closed = False
        mock_session.close = AsyncMock()
        api._session = mock_session
        
        await api.close()
        
        mock_session.close.assert_called_once()
