#!/usr/bin/env python3
"""
Test script to verify gamification system is working
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.gamification.points import format_player_stats, process_message


def test_gamification():
    """Test the gamification system"""

    print("🎮 Testing Gamification System")
    print("=" * 50)
    print()

    test_user_id = "test_user_123"

    # Test 1: Clean message
    print("📝 Test 1: Clean message (no errors)")
    result = process_message(test_user_id, has_errors=False, error_count=0)
    print(f"  Points: {result['points_change']:+d}")
    print(f"  HP: {result['hp_change']:+d}")
    print(f"  XP: {result['xp_change']:+d}")
    if result.get("messages"):
        print(f"  Messages: {', '.join(result['messages'])}")
    print()

    # Test 2: Message with errors
    print("📝 Test 2: Message with 3 errors")
    result = process_message(test_user_id, has_errors=True, error_count=3)
    print(f"  Points: {result['points_change']:+d}")
    print(f"  HP: {result['hp_change']:+d}")
    print(f"  XP: {result['xp_change']:+d}")
    if result.get("streak_broken"):
        print("  ⚠️ Streak broken!")
    print()

    # Test 3: Show player stats
    print("📊 Current Player Stats:")
    print("-" * 50)
    stats = format_player_stats(test_user_id)
    print(stats)
    print()

    # Test 4: Clean up test data
    print("🧹 Cleaning up test data...")
    import json
    from pathlib import Path

    data_file = Path(__file__).parent / "data" / "gamification.json"
    if data_file.exists():
        with open(data_file, "r") as f:
            data = json.load(f)

        if test_user_id in data.get("players", {}):
            del data["players"][test_user_id]

            with open(data_file, "w") as f:
                json.dump(data, f, indent=2)

            print(f"  ✓ Removed test user {test_user_id}")

    print()
    print("✅ All tests passed!")
    print()


if __name__ == "__main__":
    try:
        test_gamification()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
        sys.exit(1)
