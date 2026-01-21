"""
Gamification System - Points, HP, Levels, and Rewards
======================================================

Makes grammar improvement fun with RPG-like mechanics:
- Earn points for error-free messages
- Lose HP for grammar mistakes
- Level up and unlock achievements
- Shop system for rewards and boosts
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple

# Gamification constants - REBALANCED FOR FUN!
BASE_HP = 100
MAX_HP = 100
HP_PER_ERROR = -3  # Reduced from -5 to be less punishing
HP_REGEN_PER_HOUR = 15  # Increased from 10 for faster recovery
POINTS_PER_CLEAN_MESSAGE = 15  # Increased from 10 for more rewards
POINTS_PER_ERROR = -2  # Reduced from -3 to be less harsh
STREAK_BONUS_MULTIPLIER = 1.5
XP_PER_MESSAGE = 8  # Increased from 5
XP_PER_CLEAN_MESSAGE = 20  # Increased from 15
MAX_LEVEL = 100  # Level cap


# Generate level thresholds up to level 100 with smooth scaling
# Formula: XP needed = 100 * (level ^ 1.5)
def _generate_level_thresholds():
    thresholds = [0]  # Level 1 starts at 0
    for level in range(2, MAX_LEVEL + 1):
        # Smooth exponential growth
        xp_needed = int(100 * (level**1.5))
        thresholds.append(xp_needed)
    return thresholds


LEVEL_THRESHOLDS = _generate_level_thresholds()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
GAME_DATA_FILE = DATA_DIR / "gamification.json"


# ============================================================================
# SOLO LEVELING-INSPIRED FEATURES
# ============================================================================

# Daily Quests (reset every 24 hours)
DAILY_QUESTS = {
    "grammar_warrior": {
        "name": "📝 Grammar Warrior",
        "description": "Write 10 messages with perfect grammar",
        "requirement": {"type": "clean_messages", "count": 10},
        "rewards": {"points": 100, "xp": 50, "stat_points": 1},
    },
    "error_hunter": {
        "name": "🎯 Error Hunter",
        "description": "Get 5 grammar corrections via /correct command",
        "requirement": {"type": "errors_found", "count": 5},
        "rewards": {"points": 75, "xp": 40},
    },
    "streak_master": {
        "name": "🔥 Streak Master",
        "description": "Achieve a 5 message clean streak",
        "requirement": {"type": "streak", "count": 5},
        "rewards": {"points": 150, "xp": 60},
    },
    "pvp_challenger": {
        "name": "⚔️ PvP Challenger",
        "description": "Win 3 PvP battles",
        "requirement": {"type": "pvp_wins", "count": 3},
        "rewards": {"points": 200, "xp": 100, "stat_points": 1},
    },
}

# Attack Skills - Unlocked at specific levels!
ATTACK_SKILLS = {
    "basic_strike": {
        "name": "⚔️ Lexicon Slash",
        "unlock_level": 1,
        "damage_multiplier": 1.0,
        "stamina_cost": 10,
        "cooldown": 0,
        "description": "Basic attack available to all players",
    },
    "spelling_slam": {
        "name": "✏️ Typo Crusher",
        "unlock_level": 5,
        "damage_multiplier": 1.3,
        "stamina_cost": 15,
        "cooldown": 0,
        "description": "Unlocked at Lv.5 - Stronger attack with higher damage",
        "special": "20% chance to deal double damage",
    },
    "punctuation_barrage": {
        "name": "📌 Comma Storm",
        "unlock_level": 10,
        "damage_multiplier": 1.5,
        "stamina_cost": 20,
        "cooldown": 0,
        "description": "Unlocked at Lv.10 - Multi-hit attack",
        "special": "Hits 2-3 times for massive damage",
    },
    "syntax_surge": {
        "name": "⚡ Sentence Slicer",
        "unlock_level": 20,
        "damage_multiplier": 1.8,
        "stamina_cost": 25,
        "cooldown": 0,
        "description": "Unlocked at Lv.20 - Lightning-fast attack",
        "special": "Ignores 50% of opponent's defense",
    },
    "vocabulary_vortex": {
        "name": "🌀 Word Cyclone",
        "unlock_level": 35,
        "damage_multiplier": 2.0,
        "stamina_cost": 30,
        "cooldown": 0,
        "description": "Unlocked at Lv.35 - Devastating word storm",
        "special": "30% chance to stun opponent (skip their next turn)",
    },
    "grammar_godstrike": {
        "name": "✨ Syntax Obliteration",
        "unlock_level": 50,
        "damage_multiplier": 2.5,
        "stamina_cost": 40,
        "cooldown": 0,
        "description": "Unlocked at Lv.50 - Ultimate attack",
        "special": "Always critical hit + heals you for 25% of damage dealt",
    },
    "perfect_composition": {
        "name": "🌟 Eloquence Ascension",
        "unlock_level": 75,
        "damage_multiplier": 3.0,
        "stamina_cost": 50,
        "cooldown": 0,
        "description": "Unlocked at Lv.75 - Legendary technique",
        "special": "Massive damage + restores 20 HP + grants temporary shield",
    },
    "omniscient_correction": {
        "name": "👑 Absolute Perfection",
        "unlock_level": 100,
        "damage_multiplier": 4.0,
        "stamina_cost": 60,
        "cooldown": 0,
        "description": "Unlocked at MAX LEVEL - Supreme attack",
        "special": "Cannot be dodged, ignores all defense, heals 50 HP",
    },
}

# Progressive Buffs - Unlock special bonuses as you level up
PROGRESSIVE_BUFFS = {
    "level_milestones": {
        5: {"name": "Novice Mastery", "effect": "+5% all rewards"},
        10: {"name": "Intermediate Prowess", "effect": "+10% HP regen"},
        15: {"name": "Advanced Technique", "effect": "+2 stat points"},
        20: {"name": "Expert's Insight", "effect": "+15% XP gain"},
        25: {"name": "Master's Touch", "effect": "Unlock special shop items"},
        30: {"name": "Veteran's Wisdom", "effect": "+50 Max HP"},
        35: {"name": "Elite Status", "effect": "+20% points"},
        40: {"name": "Champion's Aura", "effect": "+10% crit chance"},
        50: {"name": "Legendary Awakening", "effect": "+100 Max HP, +3 stat points"},
        60: {"name": "Mythic Ascension", "effect": "+25% all combat stats"},
        70: {"name": "Divine Grace", "effect": "HP regen doubled"},
        80: {"name": "Transcendent Being", "effect": "+5 stat points"},
        90: {"name": "Near Perfection", "effect": "+50% rewards"},
        100: {
            "name": "Grammar Deity",
            "effect": "ALL BUFFS MAXED - You are unstoppable!",
        },
    }
}

# Writing Quality Tracking - Silent rewards for excellence
# BALANCED: Rewards actual quality, not formality or style
# "yea idk" vs "Yeah, I don't know" = SAME (no style policing)
# Only bonuses for: no typos, readable, coherent, thoughtful
QUALITY_BONUSES = {
    "perfect_spelling": {
        "name": "No Typos",
        "bonus_xp": 3,
        "bonus_points": 5,
        "description": "No spelling mistakes (casual words like 'idk' are OK)",
    },
    "perfect_grammar": {
        "name": "Grammatically Sound",
        "bonus_xp": 3,
        "bonus_points": 5,
        "description": "No grammar errors (casual phrasing is acceptable)",
    },
    "perfect_punctuation": {
        "name": "Basic Punctuation",
        "bonus_xp": 1,
        "bonus_points": 2,
        "description": "Uses some punctuation for clarity (8+ words)",
    },
    "varied_vocabulary": {
        "name": "Word Variety",
        "bonus_xp": 2,
        "bonus_points": 3,
        "description": "Not overly repetitive (15+ words, 65%+ unique)",
    },
    "long_quality_message": {
        "name": "Thoughtful Response",
        "bonus_xp": 3,
        "bonus_points": 5,
        "description": "Substantial message with no errors (50+ chars)",
    },
    # DEPRECATED - Too strict/style-focused (kept for backwards compatibility)
    "good_capitalization": {
        "name": "Good Capitalization",
        "bonus_xp": 0,
        "bonus_points": 0,
        "description": "[REMOVED] Casual caps are fine",
    },
    "clear_communication": {
        "name": "Clear Communication",
        "bonus_xp": 0,
        "bonus_points": 0,
        "description": "[REMOVED] Too subjective",
    },
    "proper_sentence_structure": {
        "name": "Proper Sentence Structure",
        "bonus_xp": 0,
        "bonus_points": 0,
        "description": "[REMOVED] Discord is casual",
    },
    "consistent_tense": {
        "name": "Consistent Tense",
        "bonus_xp": 0,
        "bonus_points": 0,
        "description": "[REMOVED] Too strict",
    },
}

# Title Buffs (passive bonuses from achievements/progression)
TITLE_BUFFS = {
    "grammar_novice": {
        "name": "Grammar Novice",
        "unlock": {"level": 1},
        "buffs": {},  # No buffs for starting title
    },
    "wordsmith": {
        "name": "Wordsmith",
        "unlock": {"level": 5},
        "buffs": {"points_mult": 1.1, "xp_mult": 1.05},
        "description": "+10% points, +5% XP",
    },
    "grammar_knight": {
        "name": "Grammar Knight",
        "unlock": {"level": 10},
        "buffs": {"points_mult": 1.2, "xp_mult": 1.1, "max_hp_bonus": 50},
        "description": "+20% points, +10% XP, +50 max HP",
    },
    "error_slayer": {
        "name": "Error Slayer",
        "unlock": {"clean_messages": 100},
        "buffs": {"xp_mult": 1.15, "hp_regen_mult": 1.5},
        "description": "+15% XP, +50% HP regen",
    },
    "pvp_champion": {
        "name": "PvP Champion",
        "unlock": {"pvp_wins": 25},
        "buffs": {"attack_mult": 1.1, "defense_mult": 0.95},
        "description": "+10% attack damage, -5% damage taken",
    },
    "the_awakened": {
        "name": "The Awakened",
        "unlock": {"level": 10, "pvp_wins": 50, "clean_messages": 500},
        "buffs": {
            "points_mult": 1.3,
            "xp_mult": 1.2,
            "max_hp_bonus": 100,
            "attack_mult": 1.15,
            "defense_mult": 0.9,
        },
        "description": "🌟 LEGENDARY: +30% points, +20% XP, +100 HP, +15% attack, -10% damage taken",
    },
}


def load_game_data() -> Dict:
    """Load gamification data from JSON file"""
    if not GAME_DATA_FILE.exists():
        return {}

    try:
        with open(GAME_DATA_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading game data: {e}")
        return {}


def save_game_data(data: Dict) -> None:
    """Save gamification data to JSON file"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(GAME_DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving game data: {e}")


def get_player_data(user_id: str) -> Dict:
    """Get player's gamification data"""
    data = load_game_data()

    if user_id not in data:
        # Initialize new player
        data[user_id] = {
            "points": 0,
            "hp": BASE_HP,
            "max_hp": MAX_HP,
            "xp": 0,
            "level": 1,
            "streak": 0,
            "best_streak": 0,
            "total_messages": 0,
            "clean_messages": 0,
            "total_errors": 0,
            "last_message_time": None,
            "last_hp_regen": datetime.now().isoformat(),
            "achievements": [],
            "shop_items": [],
            "title": "Grammar Novice",
            # Stat allocation system
            "stat_points": 0,  # Unallocated stat points
            "stats": {
                "durability": 0,  # +10 max HP per point
                "efficiency": 0,  # +5% points earned per point
                "learning": 0,  # +5% XP earned per point
                "resilience": 0,  # -5% HP loss per point
                "fortune": 0,  # Shop discount + rare bonuses
            },
            # PvP combat stats
            "pvp_wins": 0,
            "pvp_losses": 0,
            "pvp_damage_dealt": 0,
            "pvp_damage_taken": 0,
            # Solo Leveling-inspired features
            "daily_quests": {},
            "last_daily_reset": None,
            "completed_quests_today": [],
            "title_buffs": [],  # Active title buffs
            "hidden_achievements": [],  # Special secret achievements
            # Daily quality tracking
            "daily_stats": {
                "date": datetime.now().date().isoformat(),
                "total_points_earned": 0,
                "total_xp_earned": 0,
                "quality_breakdown": {},  # Track each quality aspect
                "messages_today": 0,
                "perfect_messages_today": 0,
            },
            "quality_history": [],  # Keep last 7 days
        }
        save_game_data(data)

    return data[user_id]


def regenerate_hp(player_data: Dict) -> Dict:
    """
    Regenerate HP based on time passed, stats, and progressive level buffs

    SCALING SYSTEM - Noticeable improvements at each milestone:
    Base: 15 HP/hour

    Level Buffs (STACKING - each adds to total):
    - Level 1-9:   15 HP/hour (base)
    - Level 10:    +25% regen → 18.75 HP/hour
    - Level 20:    +15% more → 21.6 HP/hour
    - Level 30:    +20% more → 25.9 HP/hour
    - Level 40:    +25% more → 32.4 HP/hour
    - Level 50:    +30% more → 42.1 HP/hour
    - Level 60:    +35% more → 56.8 HP/hour
    - Level 70:    +50% more → 85.3 HP/hour
    - Level 80:    +60% more → 136.4 HP/hour
    - Level 90:    +75% more → 238.7 HP/hour
    - Level 100:   +100% more → 477.5 HP/hour (MAXED!)

    Plus: Vitality stat adds +3 HP/hour per point
    Plus: Quest buffs can add another +50%

    High-level players recover MUCH faster!
    """
    if player_data["hp"] >= player_data["max_hp"]:
        return player_data

    last_regen = datetime.fromisoformat(player_data["last_hp_regen"])
    now = datetime.now()
    hours_passed = (now - last_regen).total_seconds() / 3600

    if hours_passed >= 1:
        # Base regen rate
        base_regen = HP_REGEN_PER_HOUR

        # Bonus from Vitality stat (3 HP/hour per point - buffed from 2)
        vitality_bonus = player_data.get("vitality", 0) * 3

        # Calculate base HP per hour before multipliers
        hp_per_hour = base_regen + vitality_bonus

        # Progressive level-based multipliers (STACKING!)
        level = player_data["level"]
        regen_multiplier = 1.0

        # Each milestone adds a NOTICEABLE boost
        if level >= 10:
            regen_multiplier += 0.25  # +25%
        if level >= 20:
            regen_multiplier += 0.15  # +15% more
        if level >= 30:
            regen_multiplier += 0.20  # +20% more
        if level >= 40:
            regen_multiplier += 0.25  # +25% more
        if level >= 50:
            regen_multiplier += 0.30  # +30% more
        if level >= 60:
            regen_multiplier += 0.35  # +35% more
        if level >= 70:
            regen_multiplier += 0.50  # +50% more (HUGE boost!)
        if level >= 80:
            regen_multiplier += 0.60  # +60% more
        if level >= 90:
            regen_multiplier += 0.75  # +75% more
        if level >= 100:
            regen_multiplier += 1.00  # +100% more (DOUBLED again!)

        # Quest buff: +50% on top of everything else
        if "active_buffs" in player_data:
            for buff_id, buff_data in player_data["active_buffs"].items():
                if "hp_regen_mult" in buff_data.get("buffs", {}):
                    quest_mult = buff_data["buffs"]["hp_regen_mult"]
                    regen_multiplier *= quest_mult

        # Calculate final regen
        hp_to_regen = int(hours_passed * hp_per_hour * regen_multiplier)

        # Apply and cap at max HP
        player_data["hp"] = min(player_data["max_hp"], player_data["hp"] + hp_to_regen)
        player_data["last_hp_regen"] = now.isoformat()

    return player_data


def calculate_level(xp: int) -> int:
    """Calculate level based on XP (capped at 100)"""
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
        else:
            break
    return min(level, MAX_LEVEL)  # Cap at max level


def xp_to_next_level(current_xp: int, current_level: int) -> Tuple[int, int]:
    """Calculate XP needed for next level"""
    if current_level >= MAX_LEVEL:
        return 0, 0  # Max level reached!

    next_threshold = LEVEL_THRESHOLDS[current_level]
    xp_needed = next_threshold - current_xp

    return xp_needed, next_threshold


def get_unlocked_skills(player_level: int) -> list:
    """Get list of attack skills unlocked at current level"""
    unlocked = []
    print(f"[DEBUG get_unlocked_skills] Level: {player_level}")
    print(
        f"[DEBUG get_unlocked_skills] ATTACK_SKILLS keys: {list(ATTACK_SKILLS.keys())}"
    )
    print(f"[DEBUG get_unlocked_skills] ATTACK_SKILLS count: {len(ATTACK_SKILLS)}")

    for skill_id, skill_data in ATTACK_SKILLS.items():
        unlock_lv = skill_data.get("unlock_level", 999)
        print(
            f"[DEBUG] Checking {skill_id}: unlock_level={unlock_lv}, player_level={player_level}, unlocked={player_level >= unlock_lv}"
        )
        if player_level >= unlock_lv:
            unlocked.append({"id": skill_id, **skill_data})

    print(f"[DEBUG get_unlocked_skills] Found {len(unlocked)} unlocked skills")
    return sorted(unlocked, key=lambda x: x["unlock_level"])


def get_next_skill_unlock(player_level: int) -> dict:
    """Get the next skill that will be unlocked"""
    for skill_id, skill_data in sorted(
        ATTACK_SKILLS.items(), key=lambda x: x[1]["unlock_level"]
    ):
        if player_level < skill_data["unlock_level"]:
            return {
                "id": skill_id,
                "levels_until": skill_data["unlock_level"] - player_level,
                **skill_data,
            }
    return None  # All skills unlocked!


def analyze_writing_quality(text: str, ai_result: Dict) -> Dict:
    """
    Analyze writing quality and determine bonus rewards

    🔒 PRIVACY PROTECTION:
    - Text is used in-memory ONLY for analysis
    - Sensitive info already filtered (emails, phones, etc.)
    - Message content is NEVER saved to disk
    - Only statistics (bonus counts) are stored

    🎮 POSITIVE-ONLY SYSTEM - NO PENALTIES!
    - All messages analyzed by AI for quality
    - Only gives BONUS rewards for excellence
    - NEVER takes away points or XP
    - Casual style is perfectly acceptable

    BALANCED APPROACH:
    - "yea idk" = acceptable casual speech (0 bonus, 0 penalty)
    - "Yeah, I don't know." = no extra bonus for formality
    - Bonuses for: no typos, readable, proper words, coherent
    - AI checks for REAL mistakes only, not style preferences

    Example: "gonna" "idk" "yea" are casual words (OK, no penalty)
    vs "teh" "recieve" "alot" are actual typos (no bonus)

    Returns dict with quality scores and bonus XP/points
    """
    bonuses = []
    total_bonus_xp = 0
    total_bonus_points = 0

    # Get AI analysis
    errors = ai_result.get("errors", [])
    has_errors = ai_result.get("has_errors", False)

    # Skip quality analysis for very short messages (1-2 words)
    word_count = len(text.split())
    if word_count < 3:
        return {
            "bonuses": bonuses,
            "bonus_xp": 0,
            "bonus_points": 0,
            "quality_count": 0,
            "suggestions": [],
        }

    # 🎯 CATEGORY 1: NO REAL MISTAKES (actual errors, not style)
    # Only count if AI found zero actual errors (typos, wrong words, etc.)
    if not has_errors:
        error_types = [e.get("type", "").lower() for e in errors]

        # 1. Perfect spelling - no typos like "teh" "recieve" "alot"
        # Note: "idk" "gonna" "yea" are casual words (acceptable, not typos)
        if "spelling" not in error_types and word_count >= 3:
            bonuses.append("perfect_spelling")
            total_bonus_xp += QUALITY_BONUSES["perfect_spelling"]["bonus_xp"]
            total_bonus_points += QUALITY_BONUSES["perfect_spelling"]["bonus_points"]

        # 2. Perfect grammar - no subject/verb disagreement, tense errors
        # Note: Casual phrasing OK ("gonna go" = "going to go")
        if "grammar" not in error_types:
            bonuses.append("perfect_grammar")
            total_bonus_xp += QUALITY_BONUSES["perfect_grammar"]["bonus_xp"]
            total_bonus_points += QUALITY_BONUSES["perfect_grammar"]["bonus_points"]

    # 🎯 CATEGORY 2: REASONABLE EFFORT (optional bonuses)
    # Light bonuses for showing basic care (not required)

    # 3. Thoughtful length - reward substantial responses (50+ chars)
    # Not about formality, just putting in effort
    if len(text) >= 50 and not has_errors:
        bonuses.append("long_quality_message")
        total_bonus_xp += QUALITY_BONUSES["long_quality_message"]["bonus_xp"]
        total_bonus_points += QUALITY_BONUSES["long_quality_message"]["bonus_points"]

    # 4. Basic punctuation - shows some structure
    # Even casual: "yea idk, maybe?" counts
    # Only bonus if message is long enough to need it (8+ words)
    if word_count >= 8 and any(p in text for p in ".!?,;:"):
        bonuses.append("perfect_punctuation")
        total_bonus_xp += QUALITY_BONUSES["perfect_punctuation"]["bonus_xp"]
        total_bonus_points += QUALITY_BONUSES["perfect_punctuation"]["bonus_points"]

    # 5. Word variety - not super repetitive
    # Casual vocab fine, just not "like like like like like"
    if word_count >= 15:
        unique_ratio = len(set(text.lower().split())) / word_count
        if unique_ratio > 0.65:  # 65%+ unique words (relaxed standard)
            bonuses.append("varied_vocabulary")
            total_bonus_xp += QUALITY_BONUSES["varied_vocabulary"]["bonus_xp"]
            total_bonus_points += QUALITY_BONUSES["varied_vocabulary"]["bonus_points"]

    # 🚫 NO PENALTIES - even if you have errors, you still earn base XP!
    # Missing a bonus? Just means you didn't get extra, not losing anything

    # 📝 Generate improvement suggestions (helpful tips, not requirements)
    suggestions = []

    # What could improve to earn bonuses
    if has_errors:
        error_types = [e.get("type", "").lower() for e in errors]
        if "spelling" in error_types:
            suggestions.append("💡 Watch for typos to earn spelling bonus")
        if "grammar" in error_types:
            suggestions.append("💡 Fix grammar errors for grammar bonus")

    # Missed opportunities for bonuses (only if already error-free)
    if not has_errors:
        if "perfect_punctuation" not in bonuses and word_count >= 8:
            suggestions.append("💡 Add punctuation for clarity bonus (. ! ? ,)")

        if "varied_vocabulary" not in bonuses and word_count >= 15:
            unique_ratio = len(set(text.lower().split())) / word_count
            if unique_ratio <= 0.65:
                suggestions.append("💡 Vary word choices for vocabulary bonus")

        if "long_quality_message" not in bonuses and len(text) < 50:
            suggestions.append("💡 Longer messages (50+ chars) earn length bonus")

    return {
        "bonuses": bonuses,
        "bonus_xp": total_bonus_xp,
        "bonus_points": total_bonus_points,
        "quality_count": len(bonuses),
        "suggestions": suggestions,
    }


def update_daily_stats(
    player: Dict,
    points_earned: int,
    xp_earned: int,
    quality_bonuses: list,
    is_perfect: bool = False,
) -> None:
    """Update daily statistics for tracking progress"""
    today = datetime.now().date().isoformat()

    # Initialize daily_stats if not exists
    if "daily_stats" not in player:
        player["daily_stats"] = {
            "date": today,
            "total_points_earned": 0,
            "total_xp_earned": 0,
            "quality_breakdown": {},
            "messages_today": 0,
            "perfect_messages_today": 0,
        }

    # Check if new day - archive yesterday's stats
    if player["daily_stats"]["date"] != today:
        # Save yesterday's stats to history
        if "quality_history" not in player:
            player["quality_history"] = []

        player["quality_history"].append(
            {
                "date": player["daily_stats"]["date"],
                "total_points": player["daily_stats"]["total_points_earned"],
                "total_xp": player["daily_stats"]["total_xp_earned"],
                "quality_breakdown": player["daily_stats"]["quality_breakdown"].copy(),
                "messages": player["daily_stats"]["messages_today"],
                "perfect_messages": player["daily_stats"]["perfect_messages_today"],
            }
        )

        # Keep only last 7 days
        player["quality_history"] = player["quality_history"][-7:]

        # Reset for new day
        player["daily_stats"] = {
            "date": today,
            "total_points_earned": 0,
            "total_xp_earned": 0,
            "quality_breakdown": {},
            "messages_today": 0,
            "perfect_messages_today": 0,
        }

    # Update today's stats
    player["daily_stats"]["total_points_earned"] += points_earned
    player["daily_stats"]["total_xp_earned"] += xp_earned
    player["daily_stats"]["messages_today"] += 1

    # Track perfect messages (no errors + quality bonuses)
    if is_perfect:
        player["daily_stats"]["perfect_messages_today"] += 1

    # Track quality bonuses
    for bonus in quality_bonuses:
        if bonus not in player["daily_stats"]["quality_breakdown"]:
            player["daily_stats"]["quality_breakdown"][bonus] = {
                "count": 0,
                "points": 0,
                "xp": 0,
            }

        player["daily_stats"]["quality_breakdown"][bonus]["count"] += 1
        player["daily_stats"]["quality_breakdown"][bonus]["points"] += QUALITY_BONUSES[
            bonus
        ]["bonus_points"]
        player["daily_stats"]["quality_breakdown"][bonus]["xp"] += QUALITY_BONUSES[
            bonus
        ]["bonus_xp"]


def get_daily_report(user_id: str) -> Dict:
    """Get today's detailed statistics"""
    player = get_player_data(user_id)

    if "daily_stats" not in player:
        return {
            "has_data": False,
            "message": "No activity today yet! Start writing to track your progress.",
        }

    today = datetime.now().date().isoformat()
    if player["daily_stats"]["date"] != today:
        return {
            "has_data": False,
            "message": "No activity today yet! Start writing to track your progress.",
        }

    stats = player["daily_stats"]

    return {
        "has_data": True,
        "date": stats["date"],
        "total_points": stats["total_points_earned"],
        "total_xp": stats["total_xp_earned"],
        "messages_count": stats["messages_today"],
        "perfect_messages": stats["perfect_messages_today"],
        "quality_breakdown": stats["quality_breakdown"],
        "history": player.get("quality_history", []),
    }


def process_message(
    user_id: str,
    has_errors: bool,
    error_count: int = 0,
    message_text: str = "",
    ai_result: Dict = None,
) -> Dict:
    """
    Process a message and update player stats with quality tracking

    Returns:
        Dict with rewards/penalties and updated player data
    """
    data = load_game_data()
    player = get_player_data(user_id)

    # Regenerate HP
    player = regenerate_hp(player)

    # Track message
    player["total_messages"] += 1

    # Initialize result
    result = {
        "points_change": 0,
        "hp_change": 0,
        "xp_change": 0,
        "level_up": False,
        "new_level": player["level"],
        "streak_broken": False,
        "achievement_unlocked": None,
        "messages": [],
    }

    # Check if streak continues (message within 24 hours)
    if player["last_message_time"]:
        last_time = datetime.fromisoformat(player["last_message_time"])
        time_diff = datetime.now() - last_time

        if time_diff > timedelta(hours=24):
            if player["streak"] > 0:
                result["streak_broken"] = True
                result["messages"].append(
                    f"💔 Streak broken! You had {player['streak']} clean messages."
                )
            player["streak"] = 0

    player["last_message_time"] = datetime.now().isoformat()

    # Get stat bonuses
    bonuses = get_stat_bonuses(player)

    # Apply max HP bonus from durability stat
    player["max_hp"] = BASE_HP + bonuses["max_hp_bonus"]

    # Analyze writing quality for silent bonuses
    quality_analysis = {"bonuses": [], "bonus_xp": 0, "bonus_points": 0}
    if message_text and ai_result:
        quality_analysis = analyze_writing_quality(message_text, ai_result)

    if has_errors:
        # Message has errors - penalties
        player["total_errors"] += error_count

        # Lose HP (reduced by resilience stat)
        hp_loss = HP_PER_ERROR * error_count
        hp_loss = int(hp_loss * (1.0 - bonuses["hp_loss_reduction"]))
        player["hp"] = max(0, player["hp"] + hp_loss)
        result["hp_change"] = hp_loss

        # Lose points
        points_loss = POINTS_PER_ERROR * error_count
        player["points"] = max(0, player["points"] + points_loss)
        result["points_change"] = points_loss

        # Small XP for participation (boosted by learning stat)
        xp_earned = int(XP_PER_MESSAGE * bonuses["xp_multiplier"])
        player["xp"] += xp_earned
        result["xp_change"] = xp_earned

        # Break streak
        if player["streak"] > 0:
            result["streak_broken"] = True
            result["messages"].append(f"💔 Streak broken at {player['streak']}!")
        player["streak"] = 0

        result["messages"].append(
            f"⚠️ {error_count} error{'s' if error_count > 1 else ''} found!"
        )

    else:
        # Clean message - rewards!
        player["clean_messages"] += 1
        player["streak"] += 1

        # Update best streak
        if player["streak"] > player["best_streak"]:
            player["best_streak"] = player["streak"]
            result["messages"].append(
                f"🏆 New personal best: {player['streak']} clean messages!"
            )

        # Calculate points with streak bonus and efficiency stat
        points_earned = POINTS_PER_CLEAN_MESSAGE
        if player["streak"] >= 5:
            points_earned = int(points_earned * STREAK_BONUS_MULTIPLIER)
            result["messages"].append(f"🔥 Streak bonus! x{STREAK_BONUS_MULTIPLIER}")

        # Apply efficiency stat bonus
        points_earned = int(points_earned * bonuses["points_multiplier"])

        # 🌟 SILENT QUALITY BONUSES - Add without notification
        if quality_analysis["bonus_points"] > 0:
            points_earned += quality_analysis["bonus_points"]
            # Track quality bonuses silently
            if "quality_bonuses_earned" not in player:
                player["quality_bonuses_earned"] = 0
            player["quality_bonuses_earned"] += quality_analysis["bonus_points"]

        player["points"] += points_earned
        result["points_change"] = points_earned

        # Earn XP (boosted by learning stat)
        xp_earned = int(XP_PER_CLEAN_MESSAGE * bonuses["xp_multiplier"])

        # 🌟 SILENT QUALITY XP BONUSES
        if quality_analysis["bonus_xp"] > 0:
            xp_earned += quality_analysis["bonus_xp"]
            # Track quality XP silently
            if "quality_xp_earned" not in player:
                player["quality_xp_earned"] = 0
            player["quality_xp_earned"] += quality_analysis["bonus_xp"]

        player["xp"] += xp_earned
        result["xp_change"] = xp_earned

        result["messages"].append(f"✅ Perfect grammar! +{points_earned} points")

        # Store quality info for feedback (what was earned + what to improve)
        result["quality_bonuses"] = quality_analysis["bonuses"]
        result["quality_count"] = quality_analysis["quality_count"]
        result["suggestions"] = quality_analysis.get("suggestions", [])

        # 🌟 Solo Leveling: Track quest progress for clean messages
        quest_result = update_quest_progress(user_id, "clean_messages", 1)
        if quest_result["completed_quests"]:
            for quest in quest_result["completed_quests"]:
                result["messages"].append(f"📜 **[QUEST COMPLETE]** {quest['name']}")
                rewards_text = []
                if quest_result["rewards"]["points"] > 0:
                    rewards_text.append(f"+{quest_result['rewards']['points']} pts")
                if quest_result["rewards"]["xp"] > 0:
                    rewards_text.append(f"+{quest_result['rewards']['xp']} XP")
                if quest_result["rewards"]["stat_points"] > 0:
                    rewards_text.append(
                        f"+{quest_result['rewards']['stat_points']} stat point(s)"
                    )
                if rewards_text:
                    result["messages"].append(f"🎁 {', '.join(rewards_text)}")

        # Track streak quest progress
        if player["streak"] >= 5:
            streak_quest = update_quest_progress(user_id, "streak", 1)
            if streak_quest["completed_quests"]:
                for quest in streak_quest["completed_quests"]:
                    result["messages"].append(
                        f"📜 **[QUEST COMPLETE]** {quest['name']}"
                    )

    # Check for level up
    old_level = player["level"]
    new_level = calculate_level(player["xp"])

    if new_level > old_level:
        levels_gained = new_level - old_level
        player["level"] = new_level
        result["level_up"] = True
        result["new_level"] = new_level

        # ⭐ SOLO LEVELING FEATURE: Full HP restoration on level up!
        old_hp = player["hp"]
        player["hp"] = player["max_hp"]
        result["messages"].append(
            "✨ **[SYSTEM]** Level up detected. HP fully restored."
        )

        # Level up rewards
        level_reward = new_level * 50
        player["points"] += level_reward

        # Award stat points (1 per level + bonus at milestones)
        if "stat_points" not in player:
            player["stat_points"] = 0

        stat_points_gained = levels_gained

        # Bonus stat points at milestones
        for level in range(old_level + 1, new_level + 1):
            if level in [15, 50, 80]:
                bonus_points = PROGRESSIVE_BUFFS["level_milestones"][level]
                if "stat points" in bonus_points["effect"]:
                    # Extract number from effect string
                    if level == 15:
                        stat_points_gained += 2
                    elif level == 50:
                        stat_points_gained += 3
                    elif level == 80:
                        stat_points_gained += 5

        player["stat_points"] += stat_points_gained

        result["messages"].append(f"🎉 LEVEL UP! You're now Level {new_level}!")
        result["messages"].append(
            f"💚 HP: {old_hp}/{player['max_hp']} → {player['hp']}/{player['max_hp']}"
        )
        result["messages"].append(f"💰 Bonus: +{level_reward} points!")
        result["messages"].append(
            f"💎 +{stat_points_gained} stat point(s)! Use `/allocate` to upgrade"
        )

        # Check for new skill unlocks
        for level in range(old_level + 1, new_level + 1):
            for skill_id, skill_data in ATTACK_SKILLS.items():
                if level == skill_data["unlock_level"]:
                    result["messages"].append(
                        f"⚔️ **NEW SKILL UNLOCKED:** {skill_data['name']}!"
                    )
                    result["messages"].append(f"   {skill_data['description']}")
                    if "special" in skill_data:
                        result["messages"].append(
                            f"   🌟 Special: {skill_data['special']}"
                        )

        # Check for progressive buffs
        for level in range(old_level + 1, new_level + 1):
            if level in PROGRESSIVE_BUFFS["level_milestones"]:
                buff = PROGRESSIVE_BUFFS["level_milestones"][level]
                result["messages"].append(f"🌟 **MILESTONE BUFF:** {buff['name']}")
                result["messages"].append(f"   Effect: {buff['effect']}")

        # Check for title upgrades
        new_title = get_title_for_level(new_level)
        if new_title != player["title"]:
            player["title"] = new_title
            result["messages"].append(f"👑 New title: {new_title}")

        # Special message for reaching max level
        if new_level == MAX_LEVEL:
            result["messages"].append("👑🌟💫 **YOU HAVE REACHED MAX LEVEL!** 💫🌟👑")
            result["messages"].append(
                "You are now a true Grammar Deity! All skills unlocked!"
            )

    # Check for achievements
    achievement = check_achievements(player)
    if achievement:
        result["achievement_unlocked"] = achievement
        result["messages"].append(f"🏅 Achievement Unlocked: {achievement['name']}!")
        player["points"] += achievement["reward"]
        result["messages"].append(f"💰 Reward: +{achievement['reward']} points!")

    # 📊 Update daily statistics
    update_daily_stats(
        player,
        points_earned=result["points_change"],
        xp_earned=result["xp_change"],
        quality_bonuses=quality_analysis.get("bonuses", []),
        is_perfect=(not has_errors and len(quality_analysis.get("bonuses", [])) > 0),
    )

    # Save updated data
    data[user_id] = player
    save_game_data(data)

    return {**result, "player_data": player}


def get_stat_bonuses(player_data: Dict) -> Dict:
    """Calculate bonuses from allocated stats"""
    stats = player_data.get("stats", {})

    return {
        "max_hp_bonus": stats.get("durability", 0) * 10,
        "points_multiplier": 1.0 + (stats.get("efficiency", 0) * 0.05),
        "xp_multiplier": 1.0 + (stats.get("learning", 0) * 0.05),
        "hp_loss_reduction": stats.get("resilience", 0) * 0.05,
        "shop_discount": stats.get("fortune", 0) * 0.03,
    }


def allocate_stat(user_id: str, stat_name: str, points: int = 1) -> Dict:
    """
    Allocate stat points to a specific stat

    Returns:
        Dict with success status and message
    """
    valid_stats = ["durability", "efficiency", "learning", "resilience", "fortune"]

    if stat_name not in valid_stats:
        return {
            "success": False,
            "message": f"❌ Invalid stat! Choose from: {', '.join(valid_stats)}",
        }

    data = load_game_data()
    player = get_player_data(user_id)

    # Check if player has enough unallocated points
    available_points = player.get("stat_points", 0)

    if available_points < points:
        return {
            "success": False,
            "message": (
                f"❌ Not enough stat points! " f"Have {available_points}, need {points}"
            ),
        }

    # Allocate points
    if "stats" not in player:
        player["stats"] = {
            "durability": 0,
            "efficiency": 0,
            "learning": 0,
            "resilience": 0,
            "fortune": 0,
        }

    player["stats"][stat_name] += points
    player["stat_points"] -= points

    # Apply immediate effects for durability
    if stat_name == "durability":
        hp_increase = points * 10
        player["max_hp"] += hp_increase
        player["hp"] += hp_increase

    # Save
    data[user_id] = player
    save_game_data(data)

    # Get stat description
    stat_descriptions = {
        "durability": f"+{points * 10} Max HP",
        "efficiency": f"+{points * 5}% Points earned",
        "learning": f"+{points * 5}% XP earned",
        "resilience": f"-{points * 5}% HP loss",
        "fortune": f"{points * 3}% Shop discount",
    }

    return {
        "success": True,
        "message": (
            f"✅ Allocated {points} point(s) to **{stat_name.title()}**!\n"
            f"📊 Effect: {stat_descriptions[stat_name]}\n"
            f"💎 Remaining stat points: {player['stat_points']}"
        ),
        "stat_name": stat_name,
        "points_allocated": points,
        "new_total": player["stats"][stat_name],
    }


def get_title_for_level(level: int) -> str:
    """Get title based on level"""
    if level >= 10:
        return "Grammar Master"
    elif level >= 8:
        return "Grammar Expert"
    elif level >= 6:
        return "Grammar Specialist"
    elif level >= 4:
        return "Grammar Enthusiast"
    elif level >= 2:
        return "Grammar Apprentice"
    else:
        return "Grammar Novice"


def check_achievements(player_data: Dict) -> Optional[Dict]:
    """Check if player unlocked any new achievements"""
    achievements_list = [
        {
            "id": "first_clean",
            "name": "First Step",
            "description": "Send your first error-free message",
            "condition": lambda p: p["clean_messages"] >= 1,
            "reward": 50,
        },
        {
            "id": "streak_5",
            "name": "On Fire",
            "description": "Maintain a 5-message streak",
            "condition": lambda p: p["streak"] >= 5,
            "reward": 100,
        },
        {
            "id": "streak_10",
            "name": "Unstoppable",
            "description": "Maintain a 10-message streak",
            "condition": lambda p: p["streak"] >= 10,
            "reward": 250,
        },
        {
            "id": "level_5",
            "name": "Halfway There",
            "description": "Reach Level 5",
            "condition": lambda p: p["level"] >= 5,
            "reward": 500,
        },
        {
            "id": "level_10",
            "name": "Grammar Legend",
            "description": "Reach Level 10",
            "condition": lambda p: p["level"] >= 10,
            "reward": 1000,
        },
        {
            "id": "100_clean",
            "name": "Perfectionist",
            "description": "Send 100 error-free messages",
            "condition": lambda p: p["clean_messages"] >= 100,
            "reward": 500,
        },
    ]

    for achievement in achievements_list:
        # Check if already unlocked
        if achievement["id"] in player_data["achievements"]:
            continue

        # Check condition
        if achievement["condition"](player_data):
            player_data["achievements"].append(achievement["id"])
            return achievement

    return None


def format_player_stats(user_id: str) -> str:
    """Format player stats for display"""
    player = get_player_data(user_id)
    player = regenerate_hp(player)

    # Calculate progress to next level
    xp_needed, next_threshold = xp_to_next_level(player["xp"], player["level"])

    # HP bar
    hp_percentage = (player["hp"] / player["max_hp"]) * 100
    hp_bar = "█" * int(hp_percentage / 10) + "░" * (10 - int(hp_percentage / 10))
    hp_color = "🟢" if hp_percentage > 66 else "🟡" if hp_percentage > 33 else "🔴"

    # Accuracy
    accuracy = (
        (player["clean_messages"] / player["total_messages"]) * 100
        if player["total_messages"] > 0
        else 0
    )

    # Build stat allocation display
    stats_display = ""
    if player["stat_points"] > 0 or any(player["stats"].values()):
        stats_display = "\n\n💎 **Stat Allocation:**"
        if player["stat_points"] > 0:
            stats_display += (
                f"\n• **Unallocated Points: {player['stat_points']}** (Use `/allocate`)"
            )

        stat_emojis = {
            "durability": "💪",
            "efficiency": "🔥",
            "learning": "⚡",
            "resilience": "🛡️",
            "fortune": "💎",
        }

        for stat_name, stat_value in player["stats"].items():
            if stat_value > 0:
                emoji = stat_emojis.get(stat_name, "•")
                bonus_text = ""
                if stat_name == "durability":
                    bonus_text = f" (+{stat_value * 10} max HP)"
                elif stat_name == "efficiency":
                    bonus_text = f" (+{stat_value * 5}% points)"
                elif stat_name == "learning":
                    bonus_text = f" (+{stat_value * 5}% XP)"
                elif stat_name == "resilience":
                    bonus_text = f" (-{stat_value * 5}% HP loss)"
                elif stat_name == "fortune":
                    bonus_text = f" ({stat_value * 3}% discount)"

                stats_display += (
                    f"\n{emoji} {stat_name.title()}: {stat_value}{bonus_text}"
                )

    # Build PvP stats display
    pvp_display = ""
    pvp_wins = player.get("pvp_wins", 0)
    pvp_losses = player.get("pvp_losses", 0)
    pvp_damage_dealt = player.get("pvp_damage_dealt", 0)
    pvp_damage_taken = player.get("pvp_damage_taken", 0)

    if pvp_wins > 0 or pvp_losses > 0 or pvp_damage_dealt > 0:
        total_pvp = pvp_wins + pvp_losses
        win_rate = (pvp_wins / total_pvp * 100) if total_pvp > 0 else 0
        pvp_display = (
            f"\n\n⚔️ **PvP Combat:**\n"
            f"• W/L: {pvp_wins}/{pvp_losses} ({win_rate:.0f}% win rate)\n"
            f"• Damage Dealt: {pvp_damage_dealt:,}\n"
            f"• Damage Taken: {pvp_damage_taken:,}"
        )

    # Build unlocked skills display
    skills_display = "\n\n⚔️ **Unlocked Attack Skills:**"
    unlocked_skills = get_unlocked_skills(player["level"])
    if unlocked_skills:
        for skill in unlocked_skills[-3:]:  # Show last 3 unlocked skills
            skills_display += f"\n• {skill['name']} (Lv.{skill['unlock_level']})"

        if len(unlocked_skills) > 3:
            skills_display += f"\n... and {len(unlocked_skills) - 3} more!"

    # Show next skill unlock
    next_skill = get_next_skill_unlock(player["level"])
    if next_skill:
        skills_display += (
            f"\n\n🔒 **Next Unlock:** {next_skill['name']} "
            f"(Lv.{next_skill['unlock_level']} - {next_skill['levels_until']} "
            f"level{'s' if next_skill['levels_until'] > 1 else ''} to go!)"
        )
    else:
        skills_display += "\n\n✨ **ALL SKILLS UNLOCKED!**"

    stats = f"""
╔══════════════════════════════════╗
║   🎮 GRAMMAR RPG STATS 🎮       ║
╚══════════════════════════════════╝

👤 **Title:** {player["title"]}
⭐ **Level:** {player["level"]}/{MAX_LEVEL} ({player["xp"]} XP)
📊 **Next Level:** {xp_needed} XP needed

{hp_color} **HP:** {player["hp"]}/{player["max_hp"]}
[{hp_bar}] {hp_percentage:.0f}%

💰 **Points:** {player["points"]}
🔥 **Current Streak:** {player["streak"]}
🏆 **Best Streak:** {player["best_streak"]}

📈 **Stats:**
• Total Messages: {player["total_messages"]}
• Clean Messages: {player["clean_messages"]}
• Accuracy: {accuracy:.1f}%
• Total Errors: {player["total_errors"]}{stats_display}{skills_display}{pvp_display}

🏅 **Achievements:** {len(player["achievements"])}
    """

    return stats.strip()


# ============================================================================
# PVP COMBAT SYSTEM
# ============================================================================


def attack_player(
    attacker_id: str, defender_id: str, skill_id: str = "basic_strike"
) -> Dict:
    """
    Attack another player in PvP combat using a skill

    Args:
        attacker_id: User ID of the attacker
        defender_id: User ID of the defender
        skill_id: ID of the attack skill to use

    Returns:
        Dict with success status, damage dealt, and battle report
    """
    import random

    # Prevent self-attack
    if attacker_id == defender_id:
        return {
            "success": False,
            "message": "❌ You can't attack yourself! That would be silly.",
        }

    # Load both players
    attacker = get_player_data(attacker_id)
    defender = get_player_data(defender_id)

    # Regenerate HP for both players
    attacker = regenerate_hp(attacker)
    defender = regenerate_hp(defender)

    # Get skill data
    if skill_id not in ATTACK_SKILLS:
        skill_id = "basic_strike"  # Fallback to basic attack

    skill = ATTACK_SKILLS[skill_id]

    # Check if skill is unlocked
    if attacker["level"] < skill["unlock_level"]:
        return {
            "success": False,
            "message": (
                f"❌ Skill locked! {skill['name']} unlocks at Level "
                f"{skill['unlock_level']}. Your level: {attacker['level']}"
            ),
        }

    # Check if attacker has enough HP for stamina cost
    if attacker["hp"] < skill["stamina_cost"]:
        return {
            "success": False,
            "message": (
                f"❌ Not enough HP! {skill['name']} costs "
                f"{skill['stamina_cost']} HP. Current HP: {attacker['hp']}"
            ),
        }

    # Calculate attack power based on skill and attacker's level
    base_damage = 15 + (attacker["level"] * 2)

    # Apply skill damage multiplier
    base_damage = int(base_damage * skill["damage_multiplier"])

    # Efficiency stat increases attack damage (+2% per point)
    attack_multiplier = 1.0 + (attacker["stats"]["efficiency"] * 0.02)

    # Add some randomness (90% to 110% for more consistent damage)
    damage_variance = random.uniform(0.9, 1.1)

    raw_damage = int(base_damage * attack_multiplier * damage_variance)

    # Special skill effects
    ignore_defense = False
    guaranteed_crit = False
    multi_hit = 1
    heal_amount = 0

    if skill_id == "syntax_surge":
        ignore_defense = 0.5  # Ignores 50% defense
    elif skill_id == "punctuation_barrage":
        multi_hit = random.randint(2, 3)  # 2-3 hits
    elif skill_id == "grammar_godstrike":
        guaranteed_crit = True
    elif skill_id == "omniscient_correction":
        ignore_defense = 1.0  # Ignores ALL defense

    # Defender's resilience reduces incoming damage (unless ignored)
    if ignore_defense:
        defense_reduction = ignore_defense
    else:
        defense_reduction = 0

    defense_multiplier = 1.0 - (
        defender["stats"]["resilience"] * 0.03 * (1.0 - defense_reduction)
    )
    final_damage = max(5, int(raw_damage * defense_multiplier))

    # Critical hit chance (5% base + 1% per fortune point)
    crit_chance = 0.05 + (attacker["stats"]["fortune"] * 0.01)
    is_critical = guaranteed_crit or random.random() < crit_chance

    if is_critical:
        final_damage = int(final_damage * 1.5)

    # Dodge chance (can't dodge omniscient correction)
    is_dodged = False
    if skill_id != "omniscient_correction":
        dodge_chance = 0.05 + (defender["stats"]["learning"] * 0.01)
        is_dodged = random.random() < dodge_chance

    if is_dodged:
        final_damage = 0
        multi_hit = 1

    # Apply multi-hit
    total_damage = final_damage * multi_hit

    # Special skill bonuses
    if skill_id == "spelling_slam" and not is_dodged:
        # 20% chance for double damage
        if random.random() < 0.2:
            total_damage *= 2
            is_critical = True  # Mark as special hit

    # Healing effects
    if skill_id == "grammar_godstrike" and total_damage > 0:
        heal_amount = int(total_damage * 0.25)
    elif skill_id == "perfect_composition" and total_damage > 0:
        heal_amount = 20
    elif skill_id == "omniscient_correction":
        heal_amount = 50

    # Apply damage to defender
    defender["hp"] = max(0, defender["hp"] - total_damage)

    # Apply healing to attacker
    if heal_amount > 0:
        attacker["hp"] = min(attacker["max_hp"], attacker["hp"] + heal_amount)

    # Attacker loses HP as stamina cost
    attacker["hp"] = max(0, attacker["hp"] - skill["stamina_cost"])

    # Award points to attacker if successful hit
    points_gained = 0
    if total_damage > 0:
        points_gained = int(total_damage * 0.5)
        attacker["points"] += points_gained

    # Track PvP stats
    if "pvp_damage_dealt" not in attacker:
        attacker["pvp_damage_dealt"] = 0
        attacker["pvp_wins"] = 0
    if "pvp_damage_taken" not in defender:
        defender["pvp_damage_taken"] = 0
        defender["pvp_losses"] = 0

    attacker["pvp_damage_dealt"] += total_damage
    defender["pvp_damage_taken"] += total_damage

    # Check for victory/defeat
    if defender["hp"] == 0:
        attacker["pvp_wins"] = attacker.get("pvp_wins", 0) + 1
        defender["pvp_losses"] = defender.get("pvp_losses", 0) + 1

    # Save both players
    data = load_game_data()
    data[attacker_id] = attacker
    data[defender_id] = defender
    save_game_data(data)

    # Build battle report with skill details
    attack_name = skill["name"]

    # Build damage message
    damage_msg = ""
    if multi_hit > 1:
        damage_msg = (
            f"💥 **{multi_hit}x HIT COMBO!** Dealt **{total_damage}** "
            f"total damage ({final_damage} x {multi_hit})!"
        )
    elif is_critical:
        damage_msg = f"💥 **CRITICAL HIT!** Dealt **{total_damage}** damage!"
    else:
        damage_msg = f"🎯 Hit! Dealt **{total_damage}** damage"

    if is_dodged:
        message = (
            f"⚔️ **{attack_name}!**\n\n"
            f"💨 **DODGED!** The defender evaded your attack!\n\n"
            f"💔 You: {attacker['hp']}/{attacker['max_hp']} HP "
            f"(-{skill['stamina_cost']} stamina)\n"
            f"🛡️ Opponent: {defender['hp']}/{defender['max_hp']} HP"
        )
    else:
        message = f"⚔️ **{attack_name}!**\n\n" f"{damage_msg}\n"

        if points_gained > 0:
            message += f"💰 Earned {points_gained} points\n"

        if heal_amount > 0:
            message += f"� Healed {heal_amount} HP!\n"

        message += (
            f"\n💔 You: {attacker['hp']}/{attacker['max_hp']} HP "
            f"(-{skill['stamina_cost']} stamina"
        )
        if heal_amount > 0:
            message += f", +{heal_amount} heal"
        message += ")\n"

        message += f"🛡️ Opponent: {defender['hp']}/{defender['max_hp']} HP"

    # Check if defender was defeated
    if defender["hp"] == 0:
        message += "\n\n🏆 **VICTORY!** You defeated your opponent!"

        # Quest progress for PvP wins
        from_quest = update_quest_progress(attacker_id, "pvp_wins", 1)
        if from_quest["completed_quests"]:
            message += "\n\n📜 **Quest progress updated!**"

    return {
        "success": True,
        "message": message,
        "damage": total_damage,
        "critical": is_critical,
        "dodged": is_dodged,
        "points_gained": points_gained,
        "skill_used": skill_id,
    }


# ============================================================================
# SOLO LEVELING FEATURES: DAILY QUESTS & TITLE BUFFS
# ============================================================================


def reset_daily_quests(player: Dict) -> None:
    """Reset daily quests for a new day"""
    player["daily_quests"] = {
        quest_id: {"progress": 0, "completed": False}
        for quest_id in DAILY_QUESTS.keys()
    }
    player["last_daily_reset"] = datetime.now().isoformat()
    player["completed_quests_today"] = []


def check_daily_reset(player: Dict) -> bool:
    """Check if daily quests need to be reset"""
    if not player.get("last_daily_reset"):
        reset_daily_quests(player)
        return True

    last_reset = datetime.fromisoformat(player["last_daily_reset"])
    now = datetime.now()

    # Reset if it's a new day
    if now.date() > last_reset.date():
        reset_daily_quests(player)
        return True

    return False


def update_quest_progress(user_id: str, quest_type: str, amount: int = 1) -> Dict:
    """
    Update progress on daily quests

    Returns dict with completed quests and rewards
    """
    player = get_player_data(user_id)
    check_daily_reset(player)

    if "daily_quests" not in player:
        reset_daily_quests(player)

    completed_quests = []
    rewards = {"points": 0, "xp": 0, "stat_points": 0}

    for quest_id, quest_data in DAILY_QUESTS.items():
        if quest_data["requirement"]["type"] == quest_type:
            if quest_id not in player["daily_quests"]:
                player["daily_quests"][quest_id] = {
                    "progress": 0,
                    "completed": False,
                }

            quest_progress = player["daily_quests"][quest_id]

            # Skip if already completed
            if quest_progress.get("completed"):
                continue

            # Update progress
            quest_progress["progress"] += amount
            required = quest_data["requirement"]["count"]

            # Check if quest is now complete
            if quest_progress["progress"] >= required:
                quest_progress["completed"] = True
                player["completed_quests_today"].append(quest_id)

                # Award rewards
                quest_rewards = quest_data["rewards"]
                for reward_type, reward_amount in quest_rewards.items():
                    if reward_type == "points":
                        player["points"] += reward_amount
                        rewards["points"] += reward_amount
                    elif reward_type == "xp":
                        player["xp"] += reward_amount
                        rewards["xp"] += reward_amount
                    elif reward_type == "stat_points":
                        player["stat_points"] += reward_amount
                        rewards["stat_points"] += reward_amount

                completed_quests.append(quest_data)

    # Save progress
    data = load_game_data()
    data[user_id] = player
    save_game_data(data)

    return {
        "completed_quests": completed_quests,
        "rewards": rewards,
    }


def get_daily_quests_status(user_id: str) -> Dict:
    """Get current status of all daily quests"""
    player = get_player_data(user_id)
    check_daily_reset(player)

    if "daily_quests" not in player:
        reset_daily_quests(player)
        data = load_game_data()
        data[user_id] = player
        save_game_data(data)

    quests_status = []
    for quest_id, quest_data in DAILY_QUESTS.items():
        progress_data = player["daily_quests"].get(
            quest_id, {"progress": 0, "completed": False}
        )
        required = quest_data["requirement"]["count"]
        progress = progress_data["progress"]
        completed = progress_data["completed"]

        quests_status.append(
            {
                "id": quest_id,
                "name": quest_data["name"],
                "description": quest_data["description"],
                "progress": progress,
                "required": required,
                "completed": completed,
                "rewards": quest_data["rewards"],
            }
        )

    return {"quests": quests_status}


def check_title_unlocks(user_id: str) -> list:
    """Check if player has unlocked any new titles"""
    player = get_player_data(user_id)
    unlocked_titles = []

    for title_id, title_data in TITLE_BUFFS.items():
        unlock_req = title_data["unlock"]
        meets_requirements = True

        for req_type, req_value in unlock_req.items():
            player_value = player.get(req_type, 0)
            if player_value < req_value:
                meets_requirements = False
                break

        if meets_requirements:
            # Check if not already in title buffs
            if title_id not in player.get("title_buffs", []):
                if "title_buffs" not in player:
                    player["title_buffs"] = []
                player["title_buffs"].append(title_id)
                unlocked_titles.append(title_data)

    # Save if any titles unlocked
    if unlocked_titles:
        data = load_game_data()
        data[user_id] = player
        save_game_data(data)

    return unlocked_titles


def apply_title_buffs(player: Dict, base_value: float, buff_type: str) -> float:
    """Apply title buffs to a base value"""
    multiplier = 1.0
    flat_bonus = 0

    for title_id in player.get("title_buffs", []):
        title_data = TITLE_BUFFS.get(title_id, {})
        buffs = title_data.get("buffs", {})

        # Apply multiplier buffs
        if f"{buff_type}_mult" in buffs:
            multiplier *= buffs[f"{buff_type}_mult"]

        # Apply flat bonuses
        if f"{buff_type}_bonus" in buffs:
            flat_bonus += buffs[f"{buff_type}_bonus"]

    return (base_value * multiplier) + flat_bonus
