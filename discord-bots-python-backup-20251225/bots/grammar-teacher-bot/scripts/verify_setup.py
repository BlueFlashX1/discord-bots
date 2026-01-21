#!/usr/bin/env python3
"""
Verify Grammar Bot Setup
This script checks if all dependencies and configurations are correct.
"""

import os
import sys

print("=" * 70)
print("GRAMMAR BOT SETUP VERIFICATION")
print("=" * 70)
print()

# Check Python version
print(f"1. Python Version: {sys.version}")
print(f"   Executable: {sys.executable}")
print()

# Check sys.path
print("2. Python sys.path (first 3 entries):")
for i, path in enumerate(sys.path[:3], 1):
    print(f"   {i}. {path}")
print()

# Check required packages
print("3. Checking Required Packages:")
packages_to_check = [
    ("discord", "discord.py"),
    ("dotenv", "python-dotenv"),
    ("language_tool_python", "language-tool-python"),
    ("textstat", "textstat"),
    ("nltk", "nltk"),
]

all_installed = True
for module_name, package_name in packages_to_check:
    try:
        module = __import__(module_name)
        version = getattr(module, "__version__", "unknown")
        print(f"   [OK] {package_name}: {version}")
    except ImportError:
        print(f"   [MISSING] {package_name}")
        all_installed = False

print()

# Check .env file
print("4. Checking .env File:")
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    print(f"   [OK] .env file found at: {env_path}")

    # Check if token is set
    from dotenv import load_dotenv

    load_dotenv()
    token = os.getenv("BOT_TOKEN_GRAMMAR")

    if token and token != "YOUR_TOKEN_HERE":
        print(f"   [OK] Bot token is configured (length: {len(token)} chars)")
    else:
        print("   [WARNING] Bot token not set or using placeholder")
else:
    print(f"   [MISSING] .env file not found at: {env_path}")

print()

# Check data directory
print("5. Checking Data Directory:")
data_dir = os.path.join(os.path.dirname(__file__), "data")
if os.path.exists(data_dir):
    print(f"   [OK] Data directory exists: {data_dir}")
else:
    print(f"   [INFO] Data directory will be created: {data_dir}")

print()

# Summary
print("=" * 70)
if all_installed:
    print("STATUS: All packages installed!")
    print()
    print("You can run the bot with:")
    print(f"  {sys.executable} bot_auto_detect.py")
else:
    print("STATUS: Some packages are missing")
    print()
    print("Install missing packages with:")
    print(f"  {sys.executable} -m pip install discord.py python-dotenv")
    print(f"  {sys.executable} -m pip install language-tool-python textstat nltk")

print("=" * 70)
