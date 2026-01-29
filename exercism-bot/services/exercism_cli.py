"""Exercism CLI integration service."""

import asyncio
import glob
import json
import logging
import os
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class ExercismCLI:
    """Wrapper for Exercism CLI commands."""

    def __init__(self, workspace: Optional[str] = None):
        """
        Initialize Exercism CLI wrapper.

        Args:
            workspace: Exercism workspace path (defaults to CLI config)
        """
        self.workspace = workspace
        self.cli_path = self._find_cli()
        self._difficulty_cache: Dict[str, Dict] = (
            {}
        )  # track -> {exercises: {slug: difficulty}, cached_at: timestamp}

    def _find_cli(self) -> str:
        """Find Exercism CLI binary."""
        # Try common locations
        possible_paths = [
            "exercism",
            "/usr/local/bin/exercism",
            "/opt/homebrew/bin/exercism",
            os.path.expanduser("~/bin/exercism"),
        ]

        for path in possible_paths:
            try:
                result = subprocess.run(
                    [path, "version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    logger.info(f"Found Exercism CLI at: {path}")
                    return path
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue

        # Default to 'exercism' (assumes it's in PATH)
        logger.warning("Exercism CLI not found in common locations, using 'exercism'")
        return "exercism"

    async def _run_command(
        self, args: List[str], timeout: int = 30
    ) -> Tuple[int, str, str]:
        """
        Run an Exercism CLI command asynchronously.

        Args:
            args: Command arguments (without 'exercism')
            timeout: Command timeout in seconds

        Returns:
            Tuple of (returncode, stdout, stderr)
        """
        cmd = [self.cli_path] + args
        logger.debug(f"Running command: {' '.join(cmd)}")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace if self.workspace else None,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )

            return (
                process.returncode,
                stdout.decode("utf-8", errors="replace"),
                stderr.decode("utf-8", errors="replace"),
            )
        except asyncio.TimeoutError:
            logger.error(f"Command timed out: {' '.join(cmd)}")
            return (1, "", "Command timed out")
        except Exception as e:
            logger.error(f"Error running command: {e}")
            return (1, "", str(e))

    async def is_exercise_unlocked(self, exercise: str, track: str) -> bool:
        """
        Check if an exercise is unlocked for the user.

        Args:
            exercise: Exercise slug (e.g., 'hello-world')
            track: Track slug (e.g., 'python')

        Returns:
            True if exercise is unlocked, False otherwise
        """
        # Try to download - if it succeeds, exercise is unlocked
        # If it fails with "not unlocked" or similar, it's locked
        args = ["download", "--exercise", exercise, "--track", track]
        returncode, stdout, stderr = await self._run_command(args, timeout=10)

        if returncode == 0:
            return True

        error_msg = ((stderr or "") + "\n" + (stdout or "")).strip().lower()
        if "already exists" in error_msg:
            return True

        unlock_errors = [
            "not unlocked",
            "you have not unlocked",
            "have not unlocked",
            "haven't unlocked",
            "you haven't unlocked",
            "not available",
            "locked",
            "unlock",
            "complete",
            "prerequisite",
        ]

        if any(keyword in error_msg for keyword in unlock_errors):
            logger.debug(f"Exercise {exercise} ({track}) is locked: {error_msg[:100]}")
            return False

        logger.warning(
            f"Unclear unlock status for {exercise} ({track}), treating as locked: {error_msg[:100]}"
        )
        return False

    async def download_exercise(
        self, exercise: str, track: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Download an exercise from Exercism.

        Args:
            exercise: Exercise slug (e.g., 'hello-world')
            track: Track slug (e.g., 'python')

        Returns:
            Tuple of (success, message, exercise_path)
        """
        args = ["download", "--exercise", exercise, "--track", track]
        returncode, stdout, stderr = await self._run_command(args)

        if returncode == 0:
            # Extract path from output
            # Exercism CLI output format: "Downloaded to: /path/to/exercise"
            lines = stdout.strip().split("\n")
            exercise_path = None

            for line in lines:
                if "Downloaded to:" in line or "New:" in line:
                    # Try to extract path
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if part.startswith("/") or part.startswith("~"):
                            exercise_path = os.path.expanduser(part)
                            break

            if not exercise_path:
                # Try to find it in workspace
                workspace = await self.get_workspace()
                if workspace:
                    exercise_path = os.path.join(workspace, track, exercise)

            return True, f"Downloaded {exercise} ({track})", exercise_path
        else:
            error_msg = stderr or stdout or "Unknown error"
            return False, f"Failed to download: {error_msg}", None

    async def submit_solution(self, file_path: str) -> Tuple[bool, str]:
        """
        Submit a solution file.

        Args:
            file_path: Path to solution file

        Returns:
            Tuple of (success, message)
        """
        if not os.path.exists(file_path):
            return False, f"File not found: {file_path}"

        args = ["submit", file_path]
        returncode, stdout, stderr = await self._run_command(args)

        if returncode == 0:
            return True, f"Solution submitted successfully!\n{stdout}"
        else:
            error_msg = stderr or stdout or "Unknown error"
            return False, f"Submission failed: {error_msg}"

    async def get_workspace(self) -> Optional[str]:
        """Get Exercism workspace path."""
        returncode, stdout, stderr = await self._run_command(["workspace"])

        if returncode == 0:
            # Extract workspace from output
            lines = stdout.strip().split("\n")
            for line in lines:
                if line.strip() and not line.startswith("Your"):
                    return line.strip()
        return None

    async def get_user_info(self) -> Tuple[bool, Dict[str, str]]:
        """Get current user information by checking config."""
        # In Exercism CLI 3.x, there's no 'whoami' command
        # Instead, we check if token is configured
        config_path = os.path.expanduser("~/.config/exercism/user.json")
        if not os.path.exists(config_path):
            config_path = os.path.expanduser("~/.exercism/user.json")

        if os.path.exists(config_path):
            try:
                import json

                with open(config_path, "r") as f:
                    config = json.load(f)
                    if config.get("token"):
                        # Token exists - try to verify by checking workspace
                        workspace = await self.get_workspace()
                        if workspace:
                            return True, {
                                "authenticated": "true",
                                "workspace": workspace,
                            }
            except Exception as e:
                logger.debug(f"Error reading config: {e}")

        return False, {}

    async def list_tracks(self) -> List[str]:
        """List available tracks (comprehensive list of Exercism tracks)."""
        return [
            "python",
            "javascript",
            "typescript",
            "rust",
            "go",
            "java",
            "cpp",
            "csharp",
            "ruby",
            "php",
            "swift",
            "kotlin",
            "dart",
            "elixir",
            "clojure",
            "haskell",
            "scala",
            "fsharp",
            "c",
            "cobol",
            "common-lisp",
            "d",
            "erlang",
            "factor",
            "forth",
            "fortran",
            "groovy",
            "julia",
            "lua",
            "nim",
            "objective-c",
            "ocaml",
            "perl",
            "prolog",
            "purescript",
            "racket",
            "raku",
            "reasonml",
            "scheme",
            "shell",
            "tcl",
            "vbnet",
            "zig",
            "sqlite",
            "r",
        ]

    async def get_joined_tracks(self) -> List[str]:
        """Get list of tracks the user has joined (from workspace)."""
        workspace = await self.get_workspace()
        if not workspace or not os.path.exists(workspace):
            return []

        joined_tracks = []
        try:
            # Check workspace directory for track folders
            if os.path.isdir(workspace):
                for item in os.listdir(workspace):
                    track_path = os.path.join(workspace, item)
                    # Only include directories (tracks) that exist
                    # A track is considered "joined" if it has a directory in workspace
                    if os.path.isdir(track_path):
                        joined_tracks.append(item)
        except Exception as e:
            logger.debug(f"Error getting joined tracks: {e}")

        return sorted(joined_tracks)

    async def get_exercises_for_track(self, track: str) -> List[str]:
        """List exercise slugs for a track from workspace (downloaded exercises only)."""
        workspace = await self.get_workspace()
        if not workspace or not os.path.isdir(workspace):
            return []
        track_path = os.path.join(workspace, track.strip().lower())
        if not os.path.isdir(track_path):
            return []
        try:
            return sorted(
                item
                for item in os.listdir(track_path)
                if os.path.isdir(os.path.join(track_path, item))
            )
        except Exception as e:
            logger.debug(f"Error listing exercises for {track}: {e}")
            return []

    async def get_track_difficulties(
        self, track: str, use_cache: bool = True
    ) -> Dict[str, int]:
        """
        Get exercise difficulties for a track from Exercism's GitHub config.json.

        Returns:
            Dict mapping exercise slug to difficulty (1-9)
        """
        # Check cache (valid for 24 hours)
        if use_cache and track in self._difficulty_cache:
            cache_data = self._difficulty_cache[track]
            cached_at = datetime.fromisoformat(
                cache_data.get("cached_at", "2000-01-01")
            )
            if datetime.now() - cached_at < timedelta(hours=24):
                return cache_data.get("exercises", {})

        try:
            # Fetch config.json from GitHub
            import aiohttp

            url = f"https://raw.githubusercontent.com/exercism/{track}/main/config.json"

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        # Read as text first, then parse JSON (GitHub raw sometimes returns text/plain)
                        text = await response.text()
                        config_data = json.loads(text)

                        # Extract practice exercises with difficulties
                        # Note: Only practice exercises have difficulty ratings
                        # Concept exercises (learning) don't have difficulty - they're sequenced in syllabus
                        exercises = {}
                        practice_exercises = config_data.get("exercises", {}).get(
                            "practice", []
                        )

                        for exercise in practice_exercises:
                            slug = exercise.get("slug")
                            difficulty = exercise.get("difficulty")
                            if slug and difficulty:
                                exercises[slug] = difficulty

                        # Optionally include concept exercises (without difficulty)
                        # They're learning exercises that teach concepts in sequence
                        concept_exercises = config_data.get("exercises", {}).get(
                            "concept", []
                        )
                        # Concept exercises don't have difficulty, but we can include them
                        # as "beginner" level since they're introductory
                        for exercise in concept_exercises:
                            slug = exercise.get("slug")
                            if slug:
                                # Concept exercises are typically beginner-level (teaching concepts)
                                # Assign difficulty 1 (beginner) for filtering purposes
                                exercises[slug] = 1

                        # Cache the results
                        self._difficulty_cache[track] = {
                            "exercises": exercises,
                            "cached_at": datetime.now().isoformat(),
                        }

                        logger.info(
                            f"Fetched {len(exercises)} exercises with difficulties for {track}"
                        )
                        return exercises
                    else:
                        logger.warning(
                            f"Failed to fetch config.json for {track}: HTTP {response.status}"
                        )
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for {track}: {e}")
        except Exception as e:
            logger.error(f"Error fetching difficulties for {track}: {e}")

        # Return empty dict on failure
        return {}

    def map_difficulty_to_category(self, numeric_difficulty: int) -> str:
        """
        Map Exercism's numeric difficulty (1-9) to text category.

        Args:
            numeric_difficulty: Difficulty level 1-9

        Returns:
            "beginner", "intermediate", or "advanced"
        """
        if numeric_difficulty <= 3:
            return "beginner"
        elif numeric_difficulty <= 6:
            return "intermediate"
        else:
            return "advanced"

    async def get_exercises_by_difficulty(
        self, track: str, difficulty_category: str
    ) -> List[str]:
        """
        Get all exercises for a track filtered by difficulty category.

        Args:
            track: Track name (e.g., "python")
            difficulty_category: "beginner", "intermediate", or "advanced"

        Returns:
            List of exercise slugs matching the difficulty
        """
        difficulties = await self.get_track_difficulties(track)

        if not difficulties:
            logger.warning(
                f"No difficulty data for {track}, falling back to empty list"
            )
            return []

        # Filter exercises by difficulty category
        matching_exercises = []
        for slug, numeric_diff in difficulties.items():
            category = self.map_difficulty_to_category(numeric_diff)
            if category == difficulty_category:
                matching_exercises.append(slug)

        return sorted(matching_exercises)

    async def get_exercise_info(
        self, exercise: str, track: str
    ) -> Tuple[bool, Dict[str, str]]:
        """
        Get exercise information including README and starter files.

        Returns:
            Tuple of (success, info_dict) where info_dict contains:
            - path: Exercise directory path
            - readme: README.md content
            - starter_code: Starter code file content (if available)
            - test_file: Test file content (if available)
        """
        workspace = await self.get_workspace()
        if not workspace:
            return False, {}

        exercise_path = os.path.join(workspace, track, exercise)
        if not os.path.exists(exercise_path):
            return False, {}

        info = {"path": exercise_path}

        # Read README.md
        readme_path = os.path.join(exercise_path, "README.md")
        if os.path.exists(readme_path):
            try:
                with open(readme_path, "r", encoding="utf-8") as f:
                    readme_content = f.read()
                    # Extract description (usually first paragraph or section)
                    info["readme"] = readme_content
                    # Try to extract a short description (first meaningful paragraph)
                    lines = readme_content.split("\n")
                    description_lines = []
                    for line in lines:
                        line = line.strip()
                        if (
                            line
                            and not line.startswith("#")
                            and not line.startswith("<!--")
                        ):
                            description_lines.append(line)
                            if (
                                len(description_lines) >= 3
                            ):  # Get first few meaningful lines
                                break
                    info["description"] = (
                        "\n".join(description_lines[:500])
                        if description_lines
                        else readme_content[:500]
                    )
            except Exception as e:
                logger.error(f"Error reading README: {e}")

        # Try to find starter code file (common patterns)
        starter_patterns = {
            "python": ["*.py"],
            "javascript": ["*.js"],
            "typescript": ["*.ts"],
            "rust": ["*.rs"],
            "go": ["*.go"],
            "java": ["*.java"],
            "cpp": ["*.cpp", "*.h"],
            "csharp": ["*.cs"],
        }

        patterns = starter_patterns.get(track.lower(), ["*"])
        for pattern in patterns:
            files = glob.glob(os.path.join(exercise_path, pattern))
            # Exclude test files
            starter_files = [
                f
                for f in files
                if "test" not in os.path.basename(f).lower()
                and "spec" not in os.path.basename(f).lower()
            ]
            if starter_files:
                try:
                    with open(starter_files[0], "r", encoding="utf-8") as f:
                        info["starter_code"] = f.read()[:1000]  # First 1000 chars
                        info["starter_file"] = os.path.basename(starter_files[0])
                except Exception as e:
                    logger.debug(f"Error reading starter file: {e}")
                break

        # Try to find test file
        test_patterns = ["*test*", "*spec*", "*_test.*", "*_spec.*"]
        for pattern in test_patterns:
            files = glob.glob(os.path.join(exercise_path, pattern))
            if files:
                try:
                    with open(files[0], "r", encoding="utf-8") as f:
                        info["test_file"] = os.path.basename(files[0])
                        test_content = f.read()
                        # Extract test cases summary (first few test functions)
                        info["test_preview"] = test_content[:800]  # First 800 chars
                except Exception as e:
                    logger.debug(f"Error reading test file: {e}")
                break

        return True, info

    async def check_cli_installed(self) -> Tuple[bool, str]:
        """Check if Exercism CLI is installed and accessible."""
        returncode, stdout, stderr = await self._run_command(["version"])

        if returncode == 0:
            version = stdout.strip().split("\n")[0] if stdout else "Unknown"
            return True, version
        return (
            False,
            "Exercism CLI not found. Install from https://exercism.org/cli-walkthrough",
        )
