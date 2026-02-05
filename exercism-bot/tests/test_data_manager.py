"""Tests for DataManager with atomic writes."""

import json
import os
import tempfile
import pytest
from pathlib import Path

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data_manager import DataManager


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def data_manager(temp_data_dir):
    """Create a DataManager with temp directory."""
    return DataManager(data_dir=temp_data_dir)


class TestDataManager:
    """Tests for DataManager class."""

    def test_load_json_nonexistent_file(self, data_manager):
        """Loading a nonexistent file returns default."""
        result = data_manager.load_json("nonexistent.json", {"default": True})
        assert result == {"default": True}

    def test_load_json_empty_default(self, data_manager):
        """Loading nonexistent file with no default returns empty dict."""
        result = data_manager.load_json("missing.json")
        assert result == {}

    def test_save_and_load_json(self, data_manager):
        """Saving and loading JSON round-trips correctly."""
        test_data = {"users": [1, 2, 3], "config": {"enabled": True}}
        
        assert data_manager.save_json("test.json", test_data) is True
        loaded = data_manager.load_json("test.json")
        
        assert loaded == test_data

    def test_atomic_write_creates_file(self, data_manager, temp_data_dir):
        """Atomic write creates the final file."""
        data_manager.save_json("atomic_test.json", {"key": "value"})
        
        file_path = Path(temp_data_dir) / "atomic_test.json"
        assert file_path.exists()
        
        # Verify no temp files left behind
        temp_files = list(Path(temp_data_dir).glob(".atomic_test.*"))
        assert len(temp_files) == 0

    def test_atomic_write_overwrites(self, data_manager):
        """Atomic write correctly overwrites existing file."""
        data_manager.save_json("overwrite.json", {"version": 1})
        data_manager.save_json("overwrite.json", {"version": 2})
        
        loaded = data_manager.load_json("overwrite.json")
        assert loaded == {"version": 2}

    def test_add_exercise(self, data_manager):
        """Adding exercises tracks them correctly."""
        data_manager.add_exercise(123, "hello-world", "python")
        data_manager.add_exercise(123, "two-fer", "python")
        data_manager.add_exercise(456, "hello-world", "rust")
        
        user_123 = data_manager.get_user_exercises(123)
        user_456 = data_manager.get_user_exercises(456)
        
        assert len(user_123) == 2
        assert {"exercise": "hello-world", "track": "python"} in user_123
        assert len(user_456) == 1

    def test_add_exercise_no_duplicates(self, data_manager):
        """Adding same exercise twice doesn't duplicate."""
        data_manager.add_exercise(123, "hello-world", "python")
        data_manager.add_exercise(123, "hello-world", "python")
        
        exercises = data_manager.get_user_exercises(123)
        assert len(exercises) == 1

    def test_progress_tracking(self, data_manager):
        """Progress tracking works for multiple tracks."""
        data_manager.update_progress(123, "python", {"completed": 5, "total": 100})
        data_manager.update_progress(123, "rust", {"completed": 2, "total": 80})
        
        python_progress = data_manager.get_progress(123, "python")
        all_progress = data_manager.get_progress(123)
        
        assert python_progress == {"completed": 5, "total": 100}
        assert "python" in all_progress
        assert "rust" in all_progress

    def test_get_progress_missing_user(self, data_manager):
        """Getting progress for unknown user returns empty dict."""
        progress = data_manager.get_progress(999)
        assert progress == {}

    def test_unicode_handling(self, data_manager):
        """Unicode content is preserved."""
        test_data = {"emoji": "🎉", "japanese": "日本語", "math": "∑∏∫"}
        
        data_manager.save_json("unicode.json", test_data)
        loaded = data_manager.load_json("unicode.json")
        
        assert loaded == test_data
