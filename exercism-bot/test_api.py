#!/usr/bin/env python3
"""Test script for Exercism API integration.

Run this to verify the API is working correctly with your token.
"""

import asyncio
import logging
import sys

from dotenv import load_dotenv

# Load .env file BEFORE importing services
load_dotenv()

logging.basicConfig(level=logging.INFO)


async def main():
    from services.exercism_api import ExercismAPI
    
    api = ExercismAPI()
    
    if not api.token:
        print("ERROR: No Exercism token found.")
        print("Add EXERCISM_TOKEN to your .env file:")
        print("  EXERCISM_TOKEN=your_token_here")
        print()
        print("Get your token from: https://exercism.org/settings/api_cli")
        sys.exit(1)
    
    print(f"Token found: {api.token[:8]}...{api.token[-4:]}")
    print()
    
    # Test getting user tracks
    print("=== Getting User Tracks ===")
    tracks = await api.get_user_tracks()
    if tracks:
        print(f"Found {len(tracks)} joined tracks:")
        for t in tracks[:5]:
            print(f"  - {t.get('slug', 'unknown')}: {t.get('num_completed_exercises', 0)} completed")
    else:
        print("No tracks found or API error")
    print()
    
    # Test a specific track
    test_track = "typescript"  # Change this to test different tracks
    
    print(f"=== Testing Track: {test_track} ===")
    
    # Get unlocked exercises
    unlocked = await api.get_unlocked_exercises(test_track)
    print(f"Unlocked exercises: {len(unlocked)}")
    if unlocked:
        sample = list(unlocked)[:5]
        print(f"  Sample: {', '.join(sample)}")
    
    # Get unlocked by difficulty
    for difficulty in ["beginner", "intermediate", "advanced"]:
        exercises = await api.get_unlocked_exercises_by_difficulty(test_track, difficulty)
        print(f"  {difficulty}: {len(exercises)} unlocked")
    
    # Get track info
    success, track_info = await api.get_track_info(test_track)
    if success:
        print(f"Track info: {track_info.get('title', 'Unknown')}")
        print(f"  - Concepts: {track_info.get('num_concepts', 0)}")
        print(f"  - Exercises: {track_info.get('num_exercises', 0)}")
    
    await api.close()
    print()
    print("=== API Test Complete ===")


if __name__ == "__main__":
    asyncio.run(main())
