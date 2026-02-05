"""Tests for DailyScheduler subscription persistence."""

import tempfile
import pytest
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data_manager import DataManager


class TestSubscriptionPersistence:
    """Tests for subscription save/load functionality."""

    @pytest.fixture
    def temp_data_dir(self):
        """Create a temporary data directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    @pytest.fixture
    def data_manager(self, temp_data_dir):
        """Create a DataManager with temp directory."""
        return DataManager(data_dir=temp_data_dir)

    def test_subscribers_saved_as_json(self, data_manager):
        """Subscribers dict is correctly serialized to JSON."""
        subscribers = {
            123456789: {
                "tracks": ["python"],
                "all_tracks": False,
                "channel_id": None,
                "difficulty": "beginner",
                "track_index": 0,
                "last_sent": None,
            },
            987654321: {
                "tracks": None,
                "all_tracks": True,
                "channel_id": 111222333,
                "difficulty": "advanced",
                "track_index": 2,
                "last_sent": "2024-01-15T09:00:00",
            },
        }
        
        # Convert to string keys for JSON
        json_data = {str(k): v for k, v in subscribers.items()}
        data_manager.save_json("subscribers.json", json_data)
        
        # Load and convert back
        loaded = data_manager.load_json("subscribers.json", {})
        restored = {int(k): v for k, v in loaded.items()}
        
        assert restored == subscribers

    def test_empty_subscribers_handled(self, data_manager):
        """Empty subscribers dict loads correctly."""
        data_manager.save_json("subscribers.json", {})
        loaded = data_manager.load_json("subscribers.json", {})
        
        assert loaded == {}

    def test_missing_file_returns_empty(self, data_manager):
        """Missing subscribers file returns empty dict."""
        loaded = data_manager.load_json("subscribers.json", {})
        assert loaded == {}

    def test_subscriber_fields_preserved(self, data_manager):
        """All subscriber fields are preserved through save/load cycle."""
        subscriber = {
            "tracks": ["python", "rust", "go"],
            "all_tracks": True,
            "channel_id": 123456789012345678,
            "difficulty": "intermediate",
            "track_index": 5,
            "last_sent": "2024-06-15T14:30:00.123456",
        }
        
        data_manager.save_json("subscribers.json", {"12345": subscriber})
        loaded = data_manager.load_json("subscribers.json", {})
        
        assert loaded["12345"] == subscriber


class TestSchedulerIntegration:
    """Integration tests for DailyScheduler (requires mocking Discord)."""

    def test_scheduler_imports(self):
        """Verify scheduler module can be imported."""
        from services.daily_scheduler import DailyScheduler
        assert DailyScheduler is not None

    def test_scheduler_constants(self):
        """Verify scheduler has expected constants."""
        from services.daily_scheduler import DailyScheduler
        assert hasattr(DailyScheduler, 'SUBSCRIBERS_FILE')
        assert DailyScheduler.SUBSCRIBERS_FILE == "subscribers.json"
