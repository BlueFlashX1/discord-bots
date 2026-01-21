"""
Shop System - Buy items, boosts, and cosmetics
===============================================

Players can spend points on:
- HP potions and boosts
- XP multipliers
- Streak shields
- Custom titles
- Visual customizations
"""

from typing import Dict

from .points import get_player_data, load_game_data, save_game_data

# Shop items catalog
SHOP_ITEMS = {
    "hp_potion": {
        "name": "HP Potion",
        "description": "Restore 25 HP instantly",
        "price": 50,
        "emoji": "🧪",
        "type": "consumable",
        "effect": {"hp_restore": 25},
    },
    "full_hp_potion": {
        "name": "Full HP Potion",
        "description": "Restore all HP instantly",
        "price": 150,
        "emoji": "💊",
        "type": "consumable",
        "effect": {"hp_restore": "full"},
    },
    "xp_boost": {
        "name": "XP Boost (1 hour)",
        "description": "Double XP gains for 1 hour",
        "price": 200,
        "emoji": "⚡",
        "type": "boost",
        "effect": {"xp_multiplier": 2.0, "duration": 3600},
    },
    "streak_shield": {
        "name": "Streak Shield",
        "description": "Protect your streak from 1 error",
        "price": 100,
        "emoji": "🛡️",
        "type": "consumable",
        "effect": {"streak_protection": 1},
    },
    "title_scholar": {
        "name": "Title: Grammar Scholar",
        "description": "Custom title (permanent)",
        "price": 500,
        "emoji": "📚",
        "type": "cosmetic",
        "effect": {"title": "Grammar Scholar"},
    },
    "title_wordsmith": {
        "name": "Title: The Wordsmith",
        "description": "Custom title (permanent)",
        "price": 750,
        "emoji": "✒️",
        "type": "cosmetic",
        "effect": {"title": "The Wordsmith"},
    },
    "title_linguist": {
        "name": "Title: Master Linguist",
        "description": "Custom title (permanent)",
        "price": 1000,
        "emoji": "🎓",
        "type": "cosmetic",
        "effect": {"title": "Master Linguist"},
    },
    "hp_upgrade": {
        "name": "Max HP Upgrade",
        "description": "Permanently increase max HP by 20",
        "price": 300,
        "emoji": "❤️",
        "type": "upgrade",
        "effect": {"max_hp_increase": 20},
    },
}


def get_shop_catalog() -> Dict:
    """Get the full shop catalog"""
    return SHOP_ITEMS


def purchase_item(user_id: str, item_id: str) -> Dict:
    """
    Purchase an item from the shop

    Returns:
        Dict with success status and message
    """
    result = {"success": False, "message": "", "item": None}

    # Check if item exists
    if item_id not in SHOP_ITEMS:
        result["message"] = "❌ Item not found!"
        return result

    item = SHOP_ITEMS[item_id]

    # Load player data
    data = load_game_data()
    player = get_player_data(user_id)

    # Check if player has enough points
    if player["points"] < item["price"]:
        result["message"] = (
            f"❌ Not enough points! " f"Need {item['price']}, have {player['points']}"
        )
        return result

    # Process purchase based on item type
    if item["type"] == "consumable":
        # Add to inventory
        if "inventory" not in player:
            player["inventory"] = {}

        if item_id not in player["inventory"]:
            player["inventory"][item_id] = 0

        player["inventory"][item_id] += 1

        # Deduct points
        player["points"] -= item["price"]

        result["success"] = True
        result["message"] = (
            f"✅ Purchased {item['emoji']} {item['name']}!\n"
            f"Use `/use {item_id}` to consume it.\n"
            f"💰 Remaining points: {player['points']}"
        )

    elif item["type"] == "boost":
        # Add to active boosts
        if "active_boosts" not in player:
            player["active_boosts"] = []

        from datetime import datetime, timedelta

        expires_at = (
            datetime.now() + timedelta(seconds=item["effect"]["duration"])
        ).isoformat()

        player["active_boosts"].append(
            {"item_id": item_id, "effect": item["effect"], "expires_at": expires_at}
        )

        # Deduct points
        player["points"] -= item["price"]

        result["success"] = True
        result["message"] = (
            f"✅ Activated {item['emoji']} {item['name']}!\n"
            f"⏰ Active for 1 hour\n"
            f"💰 Remaining points: {player['points']}"
        )

    elif item["type"] == "cosmetic":
        # Apply cosmetic effect
        if "title" in item["effect"]:
            player["custom_title"] = item["effect"]["title"]
            player["title"] = item["effect"]["title"]

        # Add to owned items
        if "owned_cosmetics" not in player:
            player["owned_cosmetics"] = []

        if item_id not in player["owned_cosmetics"]:
            player["owned_cosmetics"].append(item_id)

        # Deduct points
        player["points"] -= item["price"]

        result["success"] = True
        result["message"] = (
            f"✅ Purchased {item['emoji']} {item['name']}!\n"
            f"👑 Your new title: {item['effect']['title']}\n"
            f"💰 Remaining points: {player['points']}"
        )

    elif item["type"] == "upgrade":
        # Apply permanent upgrade
        if "max_hp_increase" in item["effect"]:
            player["max_hp"] += item["effect"]["max_hp_increase"]
            player["hp"] += item["effect"]["max_hp_increase"]

        # Deduct points
        player["points"] -= item["price"]

        result["success"] = True
        result["message"] = (
            f"✅ Purchased {item['emoji']} {item['name']}!\n"
            f"❤️ New max HP: {player['max_hp']}\n"
            f"💰 Remaining points: {player['points']}"
        )

    # Save updated data
    data[user_id] = player
    save_game_data(data)

    result["item"] = item
    return result


def use_item(user_id: str, item_id: str) -> Dict:
    """Use a consumable item from inventory"""
    result = {"success": False, "message": ""}

    # Load player data
    data = load_game_data()
    player = get_player_data(user_id)

    # Check inventory
    if "inventory" not in player or item_id not in player["inventory"]:
        result["message"] = "❌ You don't have this item!"
        return result

    if player["inventory"][item_id] <= 0:
        result["message"] = "❌ You don't have this item!"
        return result

    # Get item details
    if item_id not in SHOP_ITEMS:
        result["message"] = "❌ Invalid item!"
        return result

    item = SHOP_ITEMS[item_id]
    effect = item["effect"]

    # Apply effect
    if "hp_restore" in effect:
        if effect["hp_restore"] == "full":
            old_hp = player["hp"]
            player["hp"] = player["max_hp"]
            restored = player["max_hp"] - old_hp
        else:
            restored = min(effect["hp_restore"], player["max_hp"] - player["hp"])
            player["hp"] += restored

        result["message"] = (
            f"✅ Used {item['emoji']} {item['name']}!\n"
            f"❤️ Restored {restored} HP\n"
            f"Current HP: {player['hp']}/{player['max_hp']}"
        )

    elif "streak_protection" in effect:
        if "streak_shields" not in player:
            player["streak_shields"] = 0
        player["streak_shields"] += effect["streak_protection"]

        result["message"] = (
            f"✅ Used {item['emoji']} {item['name']}!\n"
            f"🛡️ Your next error won't break your streak!"
        )

    # Remove item from inventory
    player["inventory"][item_id] -= 1

    # Save updated data
    data[user_id] = player
    save_game_data(data)

    result["success"] = True
    return result


def format_shop_catalog() -> str:
    """Format shop items for display"""
    categories = {
        "consumable": "💊 Consumables",
        "boost": "⚡ Boosts",
        "cosmetic": "👑 Cosmetics",
        "upgrade": "⬆️ Upgrades",
    }

    output = "╔══════════════════════════════════╗\n"
    output += "║        🛒 GRAMMAR SHOP 🛒        ║\n"
    output += "╚══════════════════════════════════╝\n\n"

    for category, title in categories.items():
        items_in_category = {
            k: v for k, v in SHOP_ITEMS.items() if v["type"] == category
        }

        if items_in_category:
            output += f"**{title}**\n"
            for item_id, item in items_in_category.items():
                output += (
                    f"{item['emoji']} **{item['name']}** - "
                    f"{item['price']} points\n"
                    f"   _{item['description']}_\n"
                    f"   `/buy {item_id}`\n\n"
                )

    return output.strip()
    return output.strip()
