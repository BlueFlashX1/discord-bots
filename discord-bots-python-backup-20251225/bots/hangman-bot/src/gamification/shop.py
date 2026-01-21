"""Shop system for purchasing cosmetics and rewards with earned points"""

import json
import os
from typing import Dict, List, Optional

SHOP_FILE = "data/shop_inventory.json"

# Shop items definition
SHOP_ITEMS = {
    "golden_prefix": {
        "name": "Golden Game Icon 🏆",
        "description": "Replace your default 🎮 with a golden trophy icon",
        "type": "prefix",
        "value": "🏆",
        "cost": 500,
        "category": "Cosmetics",
    },
    "fire_prefix": {
        "name": "Fire Icon 🔥",
        "description": "Replace icon with 🔥 to show you're on fire!",
        "type": "prefix",
        "value": "🔥",
        "cost": 400,
        "category": "Cosmetics",
    },
    "star_prefix": {
        "name": "Star Icon ⭐",
        "description": "Show off with a shiny ⭐ prefix",
        "type": "prefix",
        "value": "⭐",
        "cost": 350,
        "category": "Cosmetics",
    },
    "dark_theme": {
        "name": "Dark Theme 🌑",
        "description": "Dark-themed leaderboard and stats display",
        "type": "theme",
        "value": "dark",
        "cost": 750,
        "category": "Themes",
    },
    "neon_theme": {
        "name": "Neon Theme 💜",
        "description": "Vibrant neon-colored displays",
        "type": "theme",
        "value": "neon",
        "cost": 800,
        "category": "Themes",
    },
    "retro_theme": {
        "name": "Retro Theme 📼",
        "description": "Classic 80s/90s-style display",
        "type": "theme",
        "value": "retro",
        "cost": 600,
        "category": "Themes",
    },
    "season_badge_1": {
        "name": "Season Champion Badge 👑",
        "description": "Exclusive badge showing you're a season champion",
        "type": "badge",
        "value": "champion",
        "cost": 2000,
        "category": "Badges",
    },
    "speed_demon_badge": {
        "name": "Speed Demon Badge ⚡",
        "description": "For those who win in 5 guesses or less",
        "type": "badge",
        "value": "speed_demon",
        "cost": 1500,
        "category": "Badges",
    },
    "perfect_badge": {
        "name": "Perfect Game Badge 💯",
        "description": "For winning with zero mistakes",
        "type": "badge",
        "value": "perfect",
        "cost": 1200,
        "category": "Badges",
    },
    "vip_status": {
        "name": "VIP Status ✨",
        "description": "Get ✨ next to your name (lasts 1 week)",
        "type": "vip",
        "value": "vip_week",
        "cost": 3000,
        "category": "Premium",
    },
    "points_boost": {
        "name": "Points Boost x1.5 (24h) 📈",
        "description": "Earn 50% more points for 24 hours",
        "type": "boost",
        "value": "points_1_5x_24h",
        "cost": 1000,
        "category": "Boosters",
    },
    "profile_border": {
        "name": "Gold Profile Border 🎖️",
        "description": "Decorative gold border on your stats profile",
        "type": "profile_decoration",
        "value": "gold_border",
        "cost": 600,
        "category": "Cosmetics",
    },
}


def ensure_shop_file():
    """Create shop inventory file if it doesn't exist"""
    os.makedirs(os.path.dirname(SHOP_FILE), exist_ok=True)
    if not os.path.exists(SHOP_FILE):
        with open(SHOP_FILE, "w") as f:
            json.dump({"shop_items": SHOP_ITEMS}, f, indent=2)


def get_shop_items() -> Dict:
    """Get all available shop items"""
    ensure_shop_file()
    with open(SHOP_FILE, "r") as f:
        data = json.load(f)
    return data.get("shop_items", SHOP_ITEMS)


def get_item_by_id(item_id: str) -> Optional[Dict]:
    """Get specific shop item by ID"""
    items = get_shop_items()
    return items.get(item_id)


def purchase_item(user_id: int, item_id: str, current_points: int) -> tuple[bool, str]:
    """
    Attempt to purchase an item
    Returns: (success: bool, message: str)
    """
    item = get_item_by_id(item_id)

    if not item:
        return False, "Item not found!"

    cost = item["cost"]

    if current_points < cost:
        return False, (
            f"❌ Not enough points! Need **{cost}** points, "
            f"you have **{current_points}**"
        )

    return True, ""


def get_categories() -> List[str]:
    """Get all shop categories"""
    items = get_shop_items()
    categories = set()
    for item in items.values():
        categories.add(item.get("category", "Other"))
    return sorted(list(categories))


def get_items_by_category(category: str) -> Dict[str, Dict]:
    """Get all items in a specific category"""
    items = get_shop_items()
    return {
        item_id: item
        for item_id, item in items.items()
        if item.get("category") == category
    }


def format_shop_item(item_id: str, item: Dict) -> str:
    """Format a shop item for display"""
    return f"**{item['name']}** - `{item['cost']}` points\n" f"_{item['description']}_"


def format_shop_preview() -> str:
    """Format shop preview for embeds"""
    categories = get_categories()

    preview = ""
    for category in categories:
        cat_items = get_items_by_category(category)
        preview += f"\n**{category}:**\n"
        items_list = list(cat_items.items())[:3]
        for item_id, item in items_list:
            preview += f"  • {item['name']} ({item['cost']} pts)\n"
        if len(cat_items) > 3:
            preview += f"  ... +{len(cat_items) - 3} more\n"

    return preview


def get_player_inventory(player_stats: Dict) -> Dict:
    """Get player's owned items and active customizations"""
    return {
        "owned_items": player_stats.get("shop_items", []),
        "active_theme": player_stats.get("theme", "default"),
        "active_prefix": player_stats.get("prefix", "🎮"),
        "available_prefixes": [
            item["value"]
            for item_id, item in get_shop_items().items()
            if item["type"] == "prefix"
            and item_id in player_stats.get("shop_items", [])
        ],
        "available_themes": [
            item["value"]
            for item_id, item in get_shop_items().items()
            if item["type"] == "theme" and item_id in player_stats.get("shop_items", [])
        ],
    }
