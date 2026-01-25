"""Tag classifier for auto-tagging starboard messages."""

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class TagClassifier:
    """Classifies messages using keyword-based matching with word boundaries."""

    def __init__(self, tags_file: str = "config/tags.json"):
        self.tags_file = Path(tags_file)
        self.tag_keywords = {}
        self.tag_patterns = {}
        self._load_tags()
        logger.info(f"TagClassifier initialized with {len(self.tag_keywords)} tags")

    def _load_tags(self):
        """Load tag keywords from config file and compile patterns."""
        if not self.tags_file.exists():
            logger.warning(f"Tags file not found: {self.tags_file}, using empty tags")
            self.tag_keywords = {}
            self.tag_patterns = {}
            return

        try:
            with open(self.tags_file, "r", encoding="utf-8") as f:
                tags_data = json.load(f)
                # Extract keywords for each tag
                self.tag_keywords = {}
                self.tag_patterns = {}
                
                for tag_name, tag_info in tags_data.items():
                    keywords = tag_info.get("keywords", [])
                    # Convert to lowercase for case-insensitive matching
                    self.tag_keywords[tag_name] = [kw.lower() for kw in keywords]
                    
                    # Compile regex patterns with word boundaries for better matching
                    patterns = []
                    for keyword in keywords:
                        keyword_lower = keyword.lower()
                        # Escape special regex characters
                        escaped = re.escape(keyword_lower)
                        # Use word boundaries for single words, or exact phrase matching
                        if " " in keyword_lower:
                            # Multi-word phrase - match as phrase
                            pattern = rf"\b{escaped}\b"
                        else:
                            # Single word - use word boundaries
                            pattern = rf"\b{escaped}\b"
                        patterns.append(re.compile(pattern, re.IGNORECASE))
                    
                    self.tag_patterns[tag_name] = patterns
                    
                logger.debug(f"Loaded {len(self.tag_keywords)} tags with patterns")
        except (json.JSONDecodeError, KeyError, IOError) as e:
            logger.error(f"Error loading tags file: {e}", exc_info=True)
            self.tag_keywords = {}
            self.tag_patterns = {}

    def classify(self, content: str) -> List[str]:
        """
        Classify message content and return list of applicable tags.
        Uses word boundary matching to avoid false positives.
        
        Args:
            content: Message content to classify
            
        Returns:
            List of tag names that match the content, sorted by relevance
        """
        if not content or not isinstance(content, str):
            logger.debug("Empty or invalid content provided for classification")
            return []

        content_lower = content.lower()
        matched_tags = []
        tag_scores = {}  # Track match counts for scoring

        logger.debug(f"Classifying content (length: {len(content)} chars)")

        for tag_name, patterns in self.tag_patterns.items():
            match_count = 0
            for pattern in patterns:
                matches = pattern.findall(content_lower)
                if matches:
                    match_count += len(matches)
                    logger.debug(
                        f"Tag '{tag_name}' matched pattern '{pattern.pattern}' "
                        f"({len(matches)} times)"
                    )
            
            if match_count > 0:
                matched_tags.append(tag_name)
                tag_scores[tag_name] = match_count

        # Sort by match count (most matches first), then alphabetically
        matched_tags = sorted(
            matched_tags,
            key=lambda t: (tag_scores.get(t, 0), t),
            reverse=True
        )

        logger.info(
            f"Classified content: {len(matched_tags)} tags matched - {matched_tags}"
        )
        return matched_tags

    def get_available_tags(self) -> List[str]:
        """Get list of all available tag names."""
        return sorted(self.tag_keywords.keys())

    def reload_tags(self):
        """Reload tags from config file (useful for hot-reloading)."""
        logger.info("Reloading tags from config file")
        old_count = len(self.tag_keywords)
        self._load_tags()
        new_count = len(self.tag_keywords)
        logger.info(
            f"Tags reloaded: {old_count} -> {new_count} tags available"
        )
