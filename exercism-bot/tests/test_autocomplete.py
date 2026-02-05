"""Tests for shared autocomplete utilities."""

import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.autocomplete import (
    track_autocomplete,
    track_autocomplete_with_all,
    get_cli,
)


class TestGetCLI:
    """Tests for CLI singleton."""

    def test_get_cli_returns_instance(self):
        """get_cli returns an ExercismCLI instance."""
        cli = get_cli()
        assert cli is not None
        
    def test_get_cli_singleton(self):
        """get_cli returns same instance."""
        cli1 = get_cli()
        cli2 = get_cli()
        assert cli1 is cli2


class TestTrackAutocomplete:
    """Tests for track_autocomplete function."""

    @pytest.fixture
    def mock_interaction(self):
        """Create mock Discord interaction."""
        return MagicMock()

    @pytest.mark.asyncio
    async def test_empty_tracks_returns_empty(self, mock_interaction):
        """When no tracks joined, returns empty list."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            mock_cli.get_joined_tracks = AsyncMock(return_value=[])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete(mock_interaction, "py")
            
            assert result == []

    @pytest.mark.asyncio
    async def test_filters_by_current_input(self, mock_interaction):
        """Tracks are filtered by current input."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            mock_cli.get_joined_tracks = AsyncMock(return_value=[
                "python", "javascript", "typescript", "rust"
            ])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete(mock_interaction, "script")
            
            # Should match javascript and typescript
            names = [choice.name for choice in result]
            assert "Javascript" in names
            assert "Typescript" in names
            assert "Python" not in names

    @pytest.mark.asyncio
    async def test_max_25_results(self, mock_interaction):
        """Returns max 25 results (Discord limit)."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            # Create 30 fake tracks
            mock_cli.get_joined_tracks = AsyncMock(return_value=[
                f"track{i}" for i in range(30)
            ])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete(mock_interaction, "track")
            
            assert len(result) <= 25


class TestTrackAutocompleteWithAll:
    """Tests for track_autocomplete_with_all function."""

    @pytest.fixture
    def mock_interaction(self):
        return MagicMock()

    @pytest.mark.asyncio
    async def test_includes_all_option(self, mock_interaction):
        """'All Tracks' option is included when typing 'all'."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            mock_cli.get_joined_tracks = AsyncMock(return_value=["python"])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete_with_all(mock_interaction, "all")
            
            names = [choice.name for choice in result]
            assert "All Tracks (Rotate Daily)" in names

    @pytest.mark.asyncio
    async def test_all_option_on_empty_input(self, mock_interaction):
        """'All Tracks' option shows on empty input."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            mock_cli.get_joined_tracks = AsyncMock(return_value=["python"])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete_with_all(mock_interaction, "")
            
            names = [choice.name for choice in result]
            assert "All Tracks (Rotate Daily)" in names

    @pytest.mark.asyncio
    async def test_all_value_is_all(self, mock_interaction):
        """'All Tracks' choice has value 'all'."""
        with patch('utils.autocomplete.get_cli') as mock_get_cli:
            mock_cli = MagicMock()
            mock_cli.get_joined_tracks = AsyncMock(return_value=[])
            mock_get_cli.return_value = mock_cli
            
            result = await track_autocomplete_with_all(mock_interaction, "a")
            
            all_choice = next((c for c in result if "All" in c.name), None)
            assert all_choice is not None
            assert all_choice.value == "all"
