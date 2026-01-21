"""
Hangman Bot - Discord Multiplayer Word Guessing Game

Commands:
- /hangman start <word> - Start a new game with a word
- /hangman stats - View your personal stats
- /hangman leaderboard - View weekly rankings
- /hangman shop - View cosmetic shop
- /hangman inventory - View owned cosmetics
"""

import os
import sys

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
from src.ai.word_hints import get_game_hint
from src.core.cache import (
    flush_stats_cache,
    get_stats_cache,
    schedule_stats_save,
)
from src.core.logger import (
    log_api_call,
    log_command,
    log_debug,
    log_error_traceback,
    log_game_action,
    log_game_end,
    log_game_start,
    log_startup,
    logger,
)
from src.core.throttle import (
    check_channel_cooldown,
    check_command_cooldown,
    cleanup_old_entries,
)
from src.core.views import GameControlView
from src.gamification.game import create_game, delete_game
from src.gamification.player_stats import (
    calculate_win_rate,
    get_player_rank,
    get_weekly_leaderboard,
    get_weekly_reset_time,
    load_stats,
)
from src.gamification.shop import (
    format_shop_preview,
    get_player_inventory,
    purchase_item,
)

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN_HANGMAN") or os.getenv("BOT_TOKEN_2")

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

# Track which channel has the current game
channel_games = {}


@bot.event
async def on_ready():
    """Bot startup"""
    try:
        log_startup()
        logger.info(f"Bot connected as {bot.user} (ID: {bot.user.id})")
        logger.info(f"Connected to {len(bot.guilds)} guild(s)")

        # Start periodic cache saves
        schedule_stats_save()

        # Start periodic throttle cleanup
        asyncio.create_task(_periodic_throttle_cleanup())

        # Only sync commands once per day to avoid rate limiting
        # Discord caches commands, so re-syncing every startup is unnecessary
        if not hasattr(bot, "_commands_synced"):
            import asyncio
            import os
            from pathlib import Path

            # Check if commands were synced today
            sync_file = Path(__file__).parent.parent.parent / "data" / ".last_sync"
            should_sync = True

            if sync_file.exists():
                try:
                    last_sync = sync_file.read_text().strip()
                    from datetime import datetime
                    last_sync_time = datetime.fromisoformat(last_sync)
                    hours_since_sync = (datetime.now() - last_sync_time).total_seconds() / 3600

                    # Only sync if last sync was more than 24 hours ago
                    if hours_since_sync < 24:
                        should_sync = False
                        logger.info(
                            f"Commands synced {hours_since_sync:.1f}h ago, skipping sync"
                        )
                except Exception:
                    pass  # If we can't read the file, sync anyway

            if should_sync:
                await asyncio.sleep(2)  # Small delay to be respectful to Discord API
                try:
                    synced = await bot.tree.sync()
                    logger.info(f"Commands synced: {len(synced)}")
                    bot._commands_synced = True

                    # Save sync timestamp
                    sync_file.parent.mkdir(parents=True, exist_ok=True)
                    from datetime import datetime
                    sync_file.write_text(datetime.now().isoformat())
                except discord.errors.HTTPException as e:
                    # Handle rate limiting gracefully
                    status = getattr(e, "status", None)
                    if status == 429 or "429" in str(e):
                        logger.warning(
                            "Rate limited by Discord while syncing commands; "
                            "skipping sync this startup"
                        )
                        # Don't save sync timestamp so we'll try again next startup
                    else:
                        raise
        else:
            logger.info("Commands already synced this session")

        logger.info("Bot is ready for gameplay!")

    except discord.errors.HTTPException as e:
        # Don't spam error logs when Discord rate-limits command syncs (HTTP 429).
        # This is expected if commands were recently updated; log a warning instead
        # of recording a full traceback so logs stay actionable.
        try:
            status = getattr(e, "status", None)
        except Exception:
            status = None

        if status == 429 or "429" in str(e):
            logger.warning(
                "Rate limited by Discord while syncing commands; skipping sync this startup"
            )
        else:
            log_error_traceback(e, "on_ready")

    except Exception as e:
        # Any other unexpected exception should be recorded with a traceback
        log_error_traceback(e, "on_ready")


async def _periodic_throttle_cleanup():
    """Periodically clean up throttle entries"""
    while True:
        try:
            await asyncio.sleep(300)  # Every 5 minutes
            cleanup_old_entries()
        except asyncio.CancelledError:
            break
        except Exception as e:
            log_debug(f"Error in throttle cleanup: {str(e)}")


@bot.tree.command(
    name="hangman", description="Play Hangman - Multiplayer word guessing game"
)
@app_commands.describe(
    action=("start - Begin a game, end - End game (starter only)"),
    word="The word to guess (for start action only)",
    letter="The letter to guess (for guess action)",
)
async def hangman_command(
    interaction: discord.Interaction,
    action: str = "start",
    word: str = None,
    letter: str = None,
):
    """Hangman game command"""
    await interaction.response.defer(ephemeral=False)

    channel_id = str(interaction.channel_id)
    user_id = interaction.user.id

    try:
        # Check command cooldown
        allowed, remaining = check_command_cooldown(user_id)
        if not allowed:
            await interaction.followup.send(
                f"⏳ Please wait {remaining:.1f} seconds before using another command.",
                ephemeral=True,
            )
            return

        log_command(f"hangman {action}", user_id, interaction.user.name)

        if action.lower() == "start":
            try:
                # Check channel cooldown (prevent rapid game creation)
                channel_allowed, channel_remaining = check_channel_cooldown(
                    interaction.channel_id
                )
                if not channel_allowed:
                    await interaction.followup.send(
                        f"⏳ Please wait {channel_remaining:.1f} seconds before "
                        "starting another game in this channel.",
                        ephemeral=True,
                    )
                    return

                # Start a new game
                if not word:
                    await interaction.followup.send(
                        "❌ Please provide a word! " "Usage: `/hangman start <word>`",
                        ephemeral=True,
                    )
                    return

                if channel_id in channel_games:
                    await interaction.followup.send(
                        "⚠️ A game is already in progress " "in this channel!",
                        ephemeral=True,
                    )
                    return

                # Create game
                game = create_game(channel_id, word, user_id)
                channel_games[channel_id] = game
                log_game_start(channel_id, word, user_id)

                # Get AI hints with error handling
                try:
                    hints = get_game_hint(word)
                    log_api_call(
                        "OpenAI hint generation",
                        "success",
                        f"word={word}",
                    )
                except Exception as e:
                    log_error_traceback(e, "get_game_hint")
                    hints = (
                        f"**Word Length**: {len(word)} letters\n"
                        f"*Hint generation unavailable*"
                    )
                    logger.warning(f"Failed to get AI hints for word '{word}', using fallback")

                embed = discord.Embed(
                    title="🎮 Hangman Game Started!",
                    description=(
                        f"**{interaction.user.display_name}** " f"started a game!"
                    ),
                    color=0x00FF00,
                )
                embed.add_field(name="📚 Word Info", value=hints, inline=False)
                embed.add_field(
                    name="📝 Word",
                    value=f"`{game.get_display_word()}`",
                    inline=False,
                )
                embed.add_field(
                    name="👥 Players (1/4)",
                    value=f"<@{user_id}> 👑 (Starter)",
                    inline=False,
                )
                embed.add_field(
                    name="🎯 How to Play",
                    value=(
                        "1. Click **Join Game** to join (max 4)\n"
                        "2. Once ready, click **Start Game**\n"
                        "3. A random player goes first\n"
                        "4. Use `/hangman guess <letter>` "
                        "to guess\n"
                        "5. 6 wrong guesses = game over!"
                    ),
                    inline=False,
                )
                embed.add_field(
                    name=game.get_hangman_display(),
                    value=(f"Mistakes: {game.mistakes}/" f"{game.MAX_MISTAKES}"),
                    inline=False,
                )

                # Create view with buttons
                view = GameControlView(
                    game,
                    channel_id,
                    user_id,
                    timeout=300,
                )

                # Send embed with buttons
                message = await interaction.followup.send(embed=embed, view=view)
                # Store message reference for button interactions
                view.embed_message = message
                # Start solo player timeout monitor (3 minutes)
                view.start_solo_monitor()

            except discord.errors.HTTPException as e:
                if e.status == 429:
                    log_error_traceback(e, "hangman_command start action - rate limited")
                    await interaction.followup.send(
                        "⚠️ Discord is rate limiting requests. Please try again in a moment.",
                        ephemeral=True,
                    )
                else:
                    log_error_traceback(e, "hangman_command start action - HTTP error")
                    await interaction.followup.send(
                        f"❌ Error starting game: {str(e)}",
                        ephemeral=True,
                    )
            except Exception as e:
                log_error_traceback(e, "hangman_command start action")
                await interaction.followup.send(
                    f"❌ Error starting game: {str(e)}",
                    ephemeral=True,
                )

        elif action.lower() == "end":
            try:
                # End the game (if in progress) or show message if no game
                if channel_id not in channel_games:
                    # No game in progress - just acknowledge
                    log_debug(f"End attempted: no game in progress in {channel_id}")
                    embed = discord.Embed(
                        title="🛑 No Game Active",
                        description="There's no game in progress in this channel.",
                        color=0xFF6B6B,
                    )
                    await interaction.followup.send(embed=embed)
                    return

                game = channel_games[channel_id]

                # Check if player is the starter
                if not game.is_starter(user_id):
                    log_debug(
                        f"End failed: {user_id} is not starter of " f"{channel_id}"
                    )
                    await interaction.followup.send(
                        "❌ Only the game starter can end the game!",
                        ephemeral=True,
                    )
                    return

                # Mark game as cancelled (no points awarded)
                word = game.word
                game.game_state = "cancelled"
                log_game_end(channel_id, "cancelled_by_starter", word)
                delete_game(channel_id)
                del channel_games[channel_id]

                embed = discord.Embed(
                    title="🛑 Game Cancelled",
                    description=(
                        f"**{interaction.user.display_name}** ended the " f"game early."
                    ),
                    color=0xFF6B6B,
                )
                embed.add_field(
                    name="📝 The Word Was",
                    value=f"`{word}`",
                    inline=False,
                )
                embed.add_field(
                    name="💡 Status",
                    value="No points awarded (game cancelled)",
                    inline=False,
                )

                await interaction.followup.send(embed=embed)
            except Exception as e:
                log_error_traceback(e, "hangman_command end action")
                await interaction.followup.send(
                    f"❌ Error ending game: {str(e)}", ephemeral=True
                )

        else:
            log_debug(f"Invalid action '{action}' from {user_id}")
            await interaction.followup.send(
                "❌ Invalid action! Use: start or end",
                ephemeral=True,
            )

    except Exception as e:
        log_error_traceback(e, "hangman_command")
        await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)


@bot.tree.command(name="games", description="List active games")
async def games_command(interaction: discord.Interaction):
    """List all active games"""
    try:
        log_command("games", interaction.user.id, interaction.user.name)

        if not channel_games:
            log_debug(f"No active games when queried by {interaction.user.id}")
            await interaction.response.send_message("No active games!", ephemeral=True)
            return

        embed = discord.Embed(title="🎮 Active Hangman Games", color=0x5865F2)

        for channel_id, game in channel_games.items():
            players_text = ", ".join([f"<@{pid}>" for pid in game.players])
            embed.add_field(
                name=f"Channel: <#{channel_id}>",
                value=(
                    f"Players: {players_text}\n"
                    f"Word: `{game.get_display_word()}`\n"
                    f"Mistakes: {game.mistakes}/{game.MAX_MISTAKES}"
                ),
                inline=False,
            )

        await interaction.response.send_message(embed=embed, ephemeral=True)
    except Exception as e:
        log_error_traceback(e, "games_command")
        await interaction.response.send_message(
            f"❌ Error listing games: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="leaderboard", description="View weekly Hangman leaderboard")
async def leaderboard_command(interaction: discord.Interaction):
    """Show weekly leaderboard with top 10 players"""
    await interaction.response.defer(ephemeral=False)
    try:
        log_command("leaderboard", interaction.user.id, interaction.user.name)

        leaderboard = get_weekly_leaderboard(limit=10)

        if not leaderboard:
            await interaction.followup.send(
                "📊 No stats yet! Start playing to see the leaderboard.",
                ephemeral=True,
            )
            return

        medals = ["🥇", "🥈", "🥉"]
        description = ""

        for idx, player in enumerate(leaderboard, 1):
            medal = medals[idx - 1] if idx <= 3 else f"`{idx:2d}`"
            description += (
                f"{medal} <@{player['user_id']}> - "
                f"**{player['weekly_points']}** points "
                f"({player['games_won']}W-{player['games_lost']}L)\n"
            )

        embed = discord.Embed(
            title="🏆 Weekly Leaderboard",
            description=description,
            color=0xFFD700,
        )

        reset_time = get_weekly_reset_time()
        embed.set_footer(text=f"Resets every Monday | Next reset: {reset_time}")

        await interaction.followup.send(embed=embed)
        log_game_action(
            str(interaction.channel_id), "leaderboard_viewed", interaction.user.id
        )
    except Exception as e:
        log_error_traceback(e, "leaderboard_command")
        await interaction.followup.send(
            f"❌ Error loading leaderboard: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="mystats", description="View your personal Hangman stats")
async def mystats_command(interaction: discord.Interaction):
    """Show player's personal statistics"""
    await interaction.response.defer(ephemeral=False)
    try:
        log_command("mystats", interaction.user.id, interaction.user.name)

        stats = load_stats(interaction.user.id)
        rank = get_player_rank(interaction.user.id)
        win_rate = calculate_win_rate(interaction.user.id)

        embed = discord.Embed(
            title=f"📊 Stats for {interaction.user.display_name}",
            color=0x5865F2,
        )

        embed.add_field(
            name="📈 Performance",
            value=(
                f"Games Played: **{stats['games_played']}**\n"
                f"Wins: **{stats['games_won']}**\n"
                f"Losses: **{stats['games_lost']}**\n"
                f"Win Rate: **{win_rate}%**"
            ),
            inline=True,
        )

        embed.add_field(
            name="⭐ Points",
            value=(
                f"Weekly Points: **{stats['weekly_points']}**\n"
                f"All-Time Points: **{stats['total_points']}**\n"
                f"Best Game Score: **{stats['best_game_score']}**"
            ),
            inline=True,
        )

        embed.add_field(
            name="🏅 Ranking",
            value=(
                f"Weekly Rank: **#{rank if rank else 'N/A'}**\n"
                f"Joined: **{stats['joined_at'][:10]}**"
            ),
            inline=False,
        )

        await interaction.followup.send(embed=embed)
        log_game_action(
            str(interaction.channel_id), "stats_viewed", interaction.user.id
        )
    except Exception as e:
        log_error_traceback(e, "mystats_command")
        await interaction.followup.send(
            f"❌ Error loading stats: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="shop", description="Browse the cosmetics shop")
async def shop_command(interaction: discord.Interaction):
    """Show the shop with available items"""
    await interaction.response.defer(ephemeral=False)
    try:
        log_command("shop", interaction.user.id, interaction.user.name)

        stats = load_stats(interaction.user.id)
        current_points = stats["weekly_points"]

        embed = discord.Embed(
            title="🛍️ Hangman Cosmetics Shop",
            description=(
                f"💰 You have: **{current_points}** points\n\n"
                f"Use `/buy <item_name>` to purchase items!"
            ),
            color=0x43B581,
        )

        preview = format_shop_preview()
        embed.add_field(
            name="Available Categories",
            value=preview,
            inline=False,
        )

        embed.add_field(
            name="💡 Tip",
            value="Use `/inventory` to see what you own!",
            inline=False,
        )

        await interaction.followup.send(embed=embed)
        log_game_action(str(interaction.channel_id), "shop_viewed", interaction.user.id)
    except Exception as e:
        log_error_traceback(e, "shop_command")
        await interaction.followup.send(
            f"❌ Error loading shop: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="buy", description="Purchase an item from the shop")
@app_commands.describe(item="The item ID to purchase (e.g., fire_prefix, dark_theme)")
async def buy_command(interaction: discord.Interaction, item: str):
    """Buy an item from the shop"""
    await interaction.response.defer(ephemeral=False)
    try:
        log_command(f"buy {item}", interaction.user.id, interaction.user.name)

        stats = load_stats(interaction.user.id)
        current_points = stats["weekly_points"]

        success, message = purchase_item(interaction.user.id, item, current_points)

        if not success:
            await interaction.followup.send(message, ephemeral=True)
            return

        # Purchase successful - deduct points and add to inventory
        from src.gamification.shop import get_item_by_id

        item_obj = get_item_by_id(item)
        if not item_obj:
            await interaction.followup.send("❌ Item not found!", ephemeral=True)
            return

        # Deduct points and add item
        stats["weekly_points"] -= item_obj["cost"]
        if item not in stats["shop_items"]:
            stats["shop_items"].append(item)

        # Save updated stats
        import json

        os.makedirs("data", exist_ok=True)
        with open("data/player_stats.json", "r") as f:
            all_stats = json.load(f)
        all_stats[str(interaction.user.id)] = stats
        with open("data/player_stats.json", "w") as f:
            json.dump(all_stats, f, indent=2)

        embed = discord.Embed(
            title="✅ Purchase Successful!",
            description=(
                f"You purchased: **{item_obj['name']}**\n\n"
                f"💰 Points Remaining: **{stats['weekly_points']}**"
            ),
            color=0x43B581,
        )

        await interaction.followup.send(embed=embed)
        log_game_action(
            str(interaction.channel_id),
            "item_purchased",
            interaction.user.id,
            f"item={item},cost={item_obj['cost']}",
        )
    except Exception as e:
        log_error_traceback(e, "buy_command")
        await interaction.followup.send(
            f"❌ Error purchasing item: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="inventory", description="View your owned cosmetics")
async def inventory_command(interaction: discord.Interaction):
    """Show player's owned items and active customizations"""
    await interaction.response.defer(ephemeral=False)
    try:
        log_command("inventory", interaction.user.id, interaction.user.name)

        stats = load_stats(interaction.user.id)
        inventory = get_player_inventory(stats)

        owned_text = (
            "\n".join(inventory["owned_items"])
            if inventory["owned_items"]
            else "No items yet"
        )

        embed = discord.Embed(
            title=f"🎒 Inventory for {interaction.user.display_name}",
            color=0x5865F2,
        )

        embed.add_field(
            name="👤 Active Customizations",
            value=(
                f"Prefix: `{inventory['active_prefix']}`\n"
                f"Theme: `{inventory['active_theme']}`"
            ),
            inline=False,
        )

        embed.add_field(
            name="🎁 Owned Items",
            value=owned_text,
            inline=False,
        )

        if len(inventory["available_prefixes"]) > 0:
            embed.add_field(
                name="Available Prefixes",
                value=", ".join(inventory["available_prefixes"]),
                inline=True,
            )

        if len(inventory["available_themes"]) > 0:
            embed.add_field(
                name="Available Themes",
                value=", ".join(inventory["available_themes"]),
                inline=True,
            )

        await interaction.followup.send(embed=embed)
        log_game_action(
            str(interaction.channel_id), "inventory_viewed", interaction.user.id
        )
    except Exception as e:
        log_error_traceback(e, "inventory_command")
        await interaction.followup.send(
            f"❌ Error loading inventory: {str(e)}", ephemeral=True
        )


if __name__ == "__main__":
    logger.info("🎮 Starting Hangman Bot...")
    if not TOKEN:
        log_error_traceback(
            ValueError("BOT_TOKEN_HANGMAN not found in .env"), "startup"
        )
        exit(1)

    # Retry logic for bot connection
    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            bot.run(TOKEN, reconnect=True)
            break  # Success, exit retry loop
        except KeyboardInterrupt:
            logger.info("🛑 Hangman Bot shutting down...")
            # Flush cache before shutdown
            try:
                flush_stats_cache()
            except Exception:
                pass
            break
        except discord.errors.HTTPException as e:
            if e.status == 429:
                wait_time = retry_delay * (attempt + 1)
                logger.warning(
                    f"Rate limited. Waiting {wait_time}s before retry "
                    f"({attempt + 1}/{max_retries})..."
                )
                import time
                time.sleep(wait_time)
                if attempt == max_retries - 1:
                    log_error_traceback(e, "bot.run() - rate limit exceeded")
                    raise
            else:
                log_error_traceback(e, f"bot.run() - HTTP error (attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    raise
        except discord.errors.LoginFailure as e:
            log_error_traceback(e, "bot.run() - invalid token")
            raise  # Don't retry on auth failures
        except Exception as e:
            log_error_traceback(e, f"bot.run() - unexpected error (attempt {attempt + 1})")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay}s...")
                import time
                time.sleep(retry_delay)
            else:
                logger.error("Max retries exceeded. Bot failed to start.")
                raise
        finally:
            # Always flush cache on shutdown
            try:
                flush_stats_cache()
            except Exception:
                pass
