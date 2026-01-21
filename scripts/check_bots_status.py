#!/usr/bin/env python3
"""
Check status of all Discord bots
Verifies if bots are running by checking PID files and process status
"""

import os
import subprocess
from pathlib import Path

BOTS_DIR = Path(__file__).parent
LOGS_DIR = BOTS_DIR / "logs"

# Bot configurations
BOTS = [
    {
        "name": "Hangman Bot",
        "dir": BOTS_DIR / "hangman-bot",
        "pid_file": LOGS_DIR / "hangman-bot.pid",
        "log_file": LOGS_DIR / "hangman-bot.log",
        "process_pattern": "hangman-bot.*index.js",
    },
    {
        "name": "Grammar Bot",
        "dir": BOTS_DIR / "grammar-bot",
        "pid_file": LOGS_DIR / "grammar-bot.pid",
        "log_file": LOGS_DIR / "grammar-bot.log",
        "process_pattern": "grammar-bot.*index.js",
    },
    {
        "name": "Exercism Bot",
        "dir": BOTS_DIR / "exercism-bot",
        "pid_file": LOGS_DIR / "exercism-bot.pid",
        "log_file": LOGS_DIR / "exercism-bot.log",
        "process_pattern": "exercism-bot.*bot.py",
    },
]


def check_process_running(pid):
    """Check if a process with given PID is running"""
    try:
        # Check if process exists
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError):
        return False


def get_process_start_time(pid):
    """Get process start time"""
    try:
        result = subprocess.run(
            ["ps", "-o", "lstart=", "-p", str(pid)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def get_last_log_line(log_file):
    """Get last line from log file"""
    try:
        if log_file.exists():
            with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                if lines:
                    return lines[-1].strip()[:80]
    except Exception:
        pass
    return None


def check_bot_status(bot):
    """Check status of a single bot"""
    name = bot["name"]
    pid_file = bot["pid_file"]
    log_file = bot["log_file"]

    print(f"\n🤖 {name}")
    print("   " + "-" * 60)

    # Check if PID file exists
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())

            # Check if process is running
            if check_process_running(pid):
                print(f"   ✅ RUNNING (PID: {pid})")

                # Get start time
                start_time = get_process_start_time(pid)
                if start_time:
                    print(f"   Started: {start_time}")

                # Get last log line
                last_log = get_last_log_line(log_file)
                if last_log:
                    print(f"   Last log: {last_log}")

                return True
            else:
                print("   ❌ NOT RUNNING (PID file exists but process not found)")
                return False
        except (ValueError, FileNotFoundError):
            print("   ❌ PID file invalid")
            return False
    else:
        print("   ⚠️  NOT STARTED (no PID file)")
        return False


def main():
    """Main function"""
    # Create logs directory if it doesn't exist
    LOGS_DIR.mkdir(exist_ok=True)

    print("\n🔍 Discord Bots Status Check")
    print("=" * 70)

    all_running = True
    for bot in BOTS:
        if not check_bot_status(bot):
            all_running = False

    print("\n" + "=" * 70)

    if all_running:
        print("\n🟢 ALL BOTS RUNNING ✅\n")
    else:
        print("\n🔴 SOME BOTS NOT RUNNING ⚠️\n")
        print("💡 To start: ./start-all-bots.sh")

    print("💡 Commands:")
    print("   Start all:  ./start-all-bots.sh")
    print("   Stop all:   ./stop-all-bots.sh")
    print("   View logs:  tail -f logs/hangman-bot.log")
    print("               tail -f logs/grammar-bot.log")
    print("               tail -f logs/exercism-bot.log")
    print()


if __name__ == "__main__":
    main()
