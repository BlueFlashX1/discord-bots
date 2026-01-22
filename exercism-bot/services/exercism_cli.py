"""Exercism CLI integration service."""

import asyncio
import glob
import logging
import os
import subprocess
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
        """Get current user information."""
        returncode, stdout, stderr = await self._run_command(["whoami"])

        if returncode == 0:
            info = {}
            for line in stdout.strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    info[key.strip().lower()] = value.strip()
            return True, info
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
        ]

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
