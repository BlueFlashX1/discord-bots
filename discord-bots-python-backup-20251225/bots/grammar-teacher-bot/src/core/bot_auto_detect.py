"""
Grammar Teacher Bot - PREMIUM GRAMMAR CORRECTOR

Features:
- Advanced grammar detection with contextual analysis
- Multiple sentence variations and rephrase options
- Tone analysis and style suggestions
- Use /check command to check grammar manually
- User-triggered corrections (no auto-monitoring)
- English (US) only with advanced rules
- Smart filtering (ignores minor issues)
- Opt-out available with /autocheck command
- Smart pattern tracking and trend analysis
- Shows corrected sentence + multiple variations
- Readability scoring and complexity analysis

NOTE: Auto-detection is DISABLED. Friends prefer to use slash commands!
Use /check <text> to manually check grammar.
"""

import os
import sys

# Add parent directory to path for src imports
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

import asyncio
from datetime import datetime

import discord
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv

# Import AI grammar checker
from src.ai.ai_grammar import check_grammar_ai, get_ai_variations
from src.ai.ai_stats import analyze_trends_ai
from src.ai.budget_monitor import get_budget_status
from src.core.analysis import analyze_readability, get_tone_analysis

# Import modular components
from src.core.config import *

# Import gamification system
from src.gamification import (
    allocate_stat,
    attack_player,
    format_player_stats,
    format_shop_catalog,
    get_daily_quests_status,
    process_message,
    purchase_item,
    use_item,
)
from src.utils.utils import load_stats, update_user_stats

# Check if AI is available
AI_GRAMMAR_AVAILABLE = os.getenv("OPENAI_API_KEY") is not None
if not AI_GRAMMAR_AVAILABLE:
    print("⚠️  WARNING: OPENAI_API_KEY not found in .env file")
    print("   Add your OpenAI API key to enable AI grammar checking")
    print("   Get one at: https://platform.openai.com/api-keys")
    print("   Add to .env: OPENAI_API_KEY=sk-...")
else:
    print("✅ AI Grammar Checking enabled (OpenAI GPT-4o-mini)")
    print("   Best available model for grammar correction")


try:
    import textstat

    READABILITY_AVAILABLE = True
except ImportError:
    READABILITY_AVAILABLE = False
    print("WARNING: textstat not installed. Readability analysis disabled.")

try:
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize

    NLTK_AVAILABLE = True
    # Download required NLTK data silently
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)
except ImportError:
    NLTK_AVAILABLE = False
    print("WARNING: nltk not installed. Advanced analysis disabled.")

# Load environment
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN_GRAMMAR") or os.getenv("BOT_TOKEN_1")

# Bot setup
intents = discord.Intents.default()
intents.message_content = True  # REQUIRED to read messages
intents.members = True  # For user info
bot = commands.Bot(
    command_prefix="!",
    intents=intents,
    description="Grammar Teacher Bot - Use slash commands to check grammar!",
)

# Cooldown tracking (user_id: last_correction_time)
# Note: Uses COOLDOWN_SECONDS from config.py
last_correction_time = {}

# Message deduplication - prevent processing same message multiple times
# Stores message IDs of recently processed messages
processed_message_ids = set()
MAX_PROCESSED_MESSAGES = 1000  # Keep last 1000 messages in memory


def should_ignore_message(message):
    """Determine if message should be ignored"""

    # Ignore bot messages
    if message.author.bot:
        return True

    # Ignore commands
    if message.content.startswith(("/", "!", "?", ".")):
        return True

    # Ignore very short messages (< 10 characters)
    if len(message.content.strip()) < 10:
        return True

    # Ignore messages with only emojis/links
    if message.content.startswith(("http://", "https://", "<:", "<a:")):
        return True

    # Ignore code blocks
    if "```" in message.content:
        return True

    # Ignore messages with attachments (files, images, videos)
    if getattr(message, "attachments", None) and len(message.attachments) > 0:
        return True

    # Ignore messages with embeds (e.g., image/video previews)
    if getattr(message, "embeds", None) and len(message.embeds) > 0:
        return True

    return False


# ============================================================================
# HELPER FUNCTIONS (NOT IN MODULES)
# ============================================================================


def is_on_cooldown(user_id):
    """Check if user is on cooldown"""
    if user_id not in last_correction_time:
        return False

    time_since_last = datetime.now() - last_correction_time[user_id]
    return time_since_last.total_seconds() < COOLDOWN_SECONDS


def set_cooldown(user_id):
    """Set cooldown for user"""
    last_correction_time[user_id] = datetime.now()


def analyze_trends(user_stats):
    """Analyze error patterns and provide smart recommendations"""
    if not user_stats:
        return None

    error_patterns = user_stats.get("error_patterns", {})
    if not error_patterns:
        return None

    # Sort patterns by frequency
    sorted_patterns = sorted(error_patterns.items(), key=lambda x: x[1], reverse=True)

    # Get top 3 common patterns
    top_patterns = sorted_patterns[:3]

    # Analyze trends
    recommendations = []

    for pattern_key, count in top_patterns:
        error_type, error_msg = pattern_key.split(":", 1)

        if error_type == "grammar":
            if count >= 5:
                recommendations.append(
                    f"Grammar issue repeated {count}x: Focus on sentence structure"
                )
            elif count >= 3:
                recommendations.append(
                    f"Grammar pattern ({count}x): Review verb tenses and agreement"
                )

        elif error_type == "misspelling":
            if count >= 5:
                recommendations.append(
                    f"Spelling issue repeated {count}x: Consider using spell-check"
                )
            elif count >= 3:
                recommendations.append(
                    f"Spelling pattern ({count}x): Review commonly misspelled words"
                )

        elif error_type == "typographical":
            if count >= 5:
                recommendations.append(
                    f"Typo repeated {count}x: Slow down when typing or proofread"
                )

    # Calculate improvement trend
    error_history = user_stats.get("error_history", [])
    if len(error_history) >= 10:
        recent_errors = error_history[-5:]
        older_errors = error_history[-10:-5]

        if len(recent_errors) < len(older_errors):
            recommendations.insert(0, "IMPROVING: Fewer errors in recent messages!")
        elif len(recent_errors) > len(older_errors):
            recommendations.insert(
                0, "TREND: Error rate increasing. Take time to proofread."
            )

    return recommendations if recommendations else None


# ============================================================================
# AUTO-DETECTION ENGINE (SILENT TRACKING MODE)
# ============================================================================
# Silently tracks all messages and rewards good writing without notifications
# Players earn passive XP/points for quality messages
# ============================================================================


@bot.event
async def on_message(message):
    """
    Process commands + silent quality tracking for passive rewards

    PRIVACY PROTECTION:
    - Filters sensitive info (emails, phones, etc.) before AI analysis
    - Message content is NEVER saved - only stats (XP, points, quality)
    - Text is used in-memory only, then discarded immediately
    """

    # Process commands first
    await bot.process_commands(message)

    # Silent tracking - no notifications, just rewards!
    if should_ignore_message(message):
        return

    # DEDUPLICATION: Skip if already processed recently
    if message.id in processed_message_ids:
        print(
            f"[Dedup] Skipping duplicate message {message.id} "
            f"from {message.author.name}"
        )
        return

    # Mark as processed
    processed_message_ids.add(message.id)

    # Maintain cache size
    if len(processed_message_ids) > MAX_PROCESSED_MESSAGES:
        # Remove oldest message (FIFO approach is approximate)
        processed_message_ids.pop()

    # Skip if AI not available
    if not AI_GRAMMAR_AVAILABLE:
        return

    try:
        # Get message text
        text = message.content

        # DEBUG: Log that we're processing a message
        print(
            f"[Silent Tracking] Processing message from {message.author.name}: {text[:50]}..."
        )

        # 🔒 PRIVACY: Filter sensitive info before AI analysis
        from src.utils.privacy import filter_sensitive_info

        privacy_result = filter_sensitive_info(text)
        safe_text = privacy_result["filtered_text"]

        # Use filtered text for AI analysis (emails/phones/etc. redacted)
        ai_result = check_grammar_ai(safe_text)
        print(
            f"[Silent Tracking] AI result - has_errors: {ai_result.get('has_errors')}, error_count: {ai_result.get('error_count', 0)}"
        )

        # Process gamification silently with quality tracking
        game_result = process_message(
            str(message.author.id),
            has_errors=ai_result["has_errors"],
            error_count=ai_result.get("error_count", 0),
            message_text=safe_text,  # Use filtered text, not original
            ai_result=ai_result,  # Pass AI result for detailed tracking
        )

        # Track but don't notify - players see progress in /profile
        update_user_stats(message.author.id, "messages_monitored")

        # 🌟 QUALITY TIER REACTIONS - Progressive star ranking!
        if game_result:
            quality_bonuses = game_result.get("quality_bonuses", [])
            bonus_count = len(quality_bonuses)

            print(
                f"[Quality Check] Bonuses earned: {quality_bonuses} ({bonus_count}/5)"
            )

        if game_result and game_result.get("quality_bonuses"):
            quality_bonuses = game_result["quality_bonuses"]
            bonus_count = len(quality_bonuses)

            # Determine which reaction to use based on quality tier
            reaction_emoji = None

            if bonus_count >= 5:
                # 🌟 LEGENDARY - Perfect 5/5 (glowing star - stands out!)
                reaction_emoji = "🌟"
            elif bonus_count >= 4:
                # ⭐ EXCELLENT - 4/5 bonuses (solid star)
                reaction_emoji = "⭐"
            elif bonus_count >= 3:
                # ✨ GOOD - 3/5 bonuses (sparkles)
                reaction_emoji = "✨"
            # No reaction for 0-2 bonuses (silent tracking only)

            if reaction_emoji:
                print(f"[Reaction] Adding {reaction_emoji} reaction...")
                try:
                    await message.add_reaction(reaction_emoji)
                    print(f"[Reaction] Successfully added {reaction_emoji}!")
                except Exception as e:
                    print(f"[Reaction] Failed to add {reaction_emoji}: {e}")
            else:
                print(f"[Reaction] No reaction (only {bonus_count}/5 bonuses)")

        # Silent tracking complete - tiered reactions for quality!

    except Exception as e:
        # Silent failure - log but don't bother users
        print(f"[Silent Tracking] Error: {e}")
        import traceback

        traceback.print_exc()
        # Continue without crashing
        pass


# ============================================================================
# SLASH COMMANDS
# ============================================================================

# Note: /autocheck removed - bot now uses silent tracking only
# All messages are automatically analyzed for quality without intrusive corrections


@bot.tree.command(
    name="check", description="Manually check grammar (only you see the result)"
)
@app_commands.describe(text="The text you want to check")
async def slash_check(interaction: discord.Interaction, text: str):
    """Manual grammar check - PRIVATE response with AI analysis"""

    if not AI_GRAMMAR_AVAILABLE:
        await interaction.response.send_message(
            "❌ AI grammar checking is not available! "
            "Please add OPENAI_API_KEY to .env file.",
            ephemeral=True,
        )
        return

    # Respond INSTANTLY with processing message (parallel processing!)
    await interaction.response.send_message(
        "🔍 **Analyzing your text...**\n"
        "AI is checking grammar, style, and readability. This will take just a moment!",
        ephemeral=True,
    )

    # Process AI analysis in background (this is the magic!)
    async def process_check():
        try:
            # Check grammar using AI (this is the slow part - 1-2 seconds)
            ai_result = check_grammar_ai(text)
            update_user_stats(interaction.user.id, "manual_checks")

            # Process gamification (points, HP, XP, levels, achievements)
            game_result = process_message(
                str(interaction.user.id),
                has_errors=ai_result["has_errors"],
                error_count=ai_result.get("error_count", 0),
            )

            if ai_result["has_errors"] and ai_result["error_count"] > 0:
                update_user_stats(
                    interaction.user.id, "errors_found", ai_result["error_count"]
                )

            if not ai_result["has_errors"] or ai_result["error_count"] == 0:
                # Perfect grammar - show enhanced feedback
                embed = discord.Embed(
                    title="✨ Excellent Writing!",
                    description=(
                        "No grammar issues detected. "
                        "Your text is clear and well-written!"
                    ),
                    color=0x57F287,  # Discord Green
                )

                # Still show readability
                readability = analyze_readability(text)
                if readability:
                    embed.add_field(
                        name="📊 Readability Score",
                        value=(
                            f"{readability['emoji']} {readability['level']}\n"
                            f"Grade Level: {readability['grade']}"
                        ),
                        inline=True,
                    )

                # Show tone
                tones = get_tone_analysis(text)
                if tones:
                    embed.add_field(name="🎭 Tone", value=", ".join(tones), inline=True)

                # Add gamification stats
                if game_result:
                    game_stats = (
                        f"{game_result['points_change']:+d} pts | "
                        f"{game_result['hp_change']:+d} HP | "
                        f"{game_result['xp_change']:+d} XP"
                    )
                    embed.add_field(
                        name="🎮 Game Rewards", value=game_stats, inline=False
                    )

                    # Show special messages (level ups, achievements)
                    if game_result.get("messages"):
                        rewards_text = "\n".join(game_result["messages"])
                        embed.add_field(
                            name="🎉 Rewards & Notifications",
                            value=rewards_text,
                            inline=False,
                        )

                embed.set_footer(text="✅ AI-Powered Check Complete")

            else:
                # Issues found - show AI analysis
                corrected = ai_result["corrected"]
                variations = get_ai_variations(corrected, text)
                readability = analyze_readability(corrected)
                tones = get_tone_analysis(text)

                embed = discord.Embed(
                    title="✨ AI Grammar Analysis Results",
                    description=(
                        f"**Found {ai_result['error_count']} issue(s)** • "
                        f"Comprehensive AI analysis below"
                    ),
                    color=0xFEE75C,  # Discord Yellow
                )

                # Show original text
                original_display = text[:200] + "..." if len(text) > 200 else text
                embed.add_field(
                    name="📝 Your Text", value=f"```{original_display}```", inline=False
                )

                # Show tone and readability
                if tones and tones != ["Neutral"]:
                    embed.add_field(name="🎭 Tone", value=", ".join(tones), inline=True)

                if readability:
                    embed.add_field(
                        name="📊 Readability",
                        value=f"{readability['emoji']} {readability['level']}",
                        inline=True,
                    )

                # Show top issues from AI (max 1024 chars per field)
                for i, error in enumerate(ai_result["errors"][:3], 1):
                    error_type = error.get("type", "grammar")
                    error_msg = error["message"]
                    correction = error.get("correction", "")

                    issue_emoji = {
                        "grammar": "📖",
                        "spelling": "✏️",
                        "punctuation": "🔤",
                        "capitalization": "🔠",
                        "style": "🎨",
                        "word choice": "📝",
                        "clarity": "💡",
                    }.get(error_type.lower(), "📌")

                    # Truncate long error messages
                    if len(error_msg) > 900:
                        error_msg = error_msg[:900] + "..."

                    error_value = f"**Problem:** {error_msg}"
                    if correction:
                        # Truncate long corrections
                        if len(correction) > 100:
                            correction = correction[:100] + "..."
                        error_value += f"\n**Fix:** `{correction}`"

                    # Final safety check for Discord's 1024 char limit
                    if len(error_value) > 1024:
                        error_value = error_value[:1020] + "..."

                    embed.add_field(
                        name=f"{issue_emoji} {error_type.title()}",
                        value=error_value,
                        inline=False,
                    )

                if ai_result["error_count"] > 3:
                    embed.add_field(
                        name="➕ More",
                        value=(
                            f"+ {ai_result['error_count'] - 3} " f"additional issues"
                        ),
                        inline=False,
                    )

                # Corrected version (max 1024 chars for Discord)
                if corrected != text:
                    # Account for code block markers (```) = 6 chars
                    max_corrected_len = 1018 - 6
                    corrected_display = (
                        corrected[:max_corrected_len] + "..."
                        if len(corrected) > max_corrected_len
                        else corrected
                    )
                    embed.add_field(
                        name="✅ Corrected",
                        value=f"```{corrected_display}```",
                        inline=False,
                    )

                # AI-generated sentence variations (max 1024 chars for Discord)
                if variations:
                    variations_text = ""
                    for var in variations[:2]:  # Show 2 variations
                        var_title = var.get("title", "Variation")
                        var_text = var.get("text", "")
                        var_line = f"**{var_title}:** {var_text}\n"

                        # Check if adding this variation would exceed limit
                        if len(variations_text + var_line) > 1020:
                            variations_text += "...(truncated)"
                            break
                        variations_text += var_line

                    if variations_text:
                        embed.add_field(
                            name="🔄 Alternatives",
                            value=variations_text.strip()[:1024],
                            inline=False,
                        )

                # Add gamification stats
                if game_result:
                    game_stats = (
                        f"{game_result['points_change']:+d} pts | "
                        f"{game_result['hp_change']:+d} HP | "
                        f"{game_result['xp_change']:+d} XP"
                    )
                    embed.add_field(
                        name="🎮 Game Impact", value=game_stats, inline=False
                    )

                    # Show special messages (level ups, achievements) - max 1024 chars
                    if game_result.get("messages"):
                        rewards_text = "\n".join(game_result["messages"])
                        # Truncate if too long
                        if len(rewards_text) > 1020:
                            rewards_text = rewards_text[:1020] + "..."
                        embed.add_field(
                            name="🎉 Rewards & Notifications",
                            value=rewards_text,
                            inline=False,
                        )

                embed.set_footer(text="✨ AI-Powered Grammar Analysis")

            # Send the final result
            await interaction.followup.send(embed=embed, ephemeral=True)

        except Exception as e:
            print(f"Error in /check command: {e}")
            import traceback

            traceback.print_exc()
            try:
                await interaction.followup.send(
                    f"❌ Error analyzing text: {str(e)}", ephemeral=True
                )
            except:
                pass  # Interaction may have expired

    # Start background processing (INSTANT response to user!)
    asyncio.create_task(process_check())


@bot.tree.command(
    name="profile",
    description="View your gamification profile (HP, level, points, achievements)",
)
async def slash_profile(interaction: discord.Interaction):
    """View user's gamification profile"""
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.errors.NotFound:
        # Interaction expired - return early
        print(f"[Profile] Interaction expired for user {interaction.user.id}")
        return
    except Exception as defer_error:
        print(f"[Profile] Error deferring: {defer_error}")
        return

    try:
        # Get formatted player stats
        try:
            stats_text = format_player_stats(str(interaction.user.id))
        except Exception as format_error:
            # Fallback if formatting fails - show basic stats
            print(f"[Error] format_player_stats failed: {format_error}")
            from src.gamification import get_player_data

            player = get_player_data(str(interaction.user.id))
            stats_text = (
                f"**Level:** {player.get('level', 1)}\n"
                f"**HP:** {player.get('hp', 100)}/{player.get('max_hp', 100)}\n"
                f"**Points:** {player.get('points', 0):,}\n"
                f"**XP:** {player.get('xp', 0):,}"
            )

        # Create embed
        embed = discord.Embed(
            title=f"🎮 {interaction.user.display_name}'s Profile",
            description=stats_text,
            color=0x5865F2,
        )

        embed.set_footer(text="Keep writing to earn more rewards!")

        await interaction.followup.send(embed=embed, ephemeral=True)

    except discord.errors.NotFound:
        # Interaction expired before we could send
        print(f"[Profile] Interaction expired before sending for user {interaction.user.id}")
    except Exception as e:
        print(f"[Profile Command] Error: {e}")
        try:
            await interaction.followup.send(
                f"❌ Error loading profile: {str(e)[:100]}",
                ephemeral=True,
            )
        except Exception as followup_error:
            print(f"[Profile Command] Could not send followup: {followup_error}")


@bot.tree.command(
    name="shop", description="Browse the shop and purchase items with your points"
)
async def slash_shop(interaction: discord.Interaction):
    """Display shop catalog"""
    await interaction.response.defer(ephemeral=True)

    try:
        from src.gamification.points import get_player_data

        # Get player's current points
        player_data = get_player_data(str(interaction.user.id))
        current_points = player_data.get("points", 0)

        # Get formatted shop catalog
        shop_text = format_shop_catalog()

        # Create embed
        embed = discord.Embed(
            title="🏪 Grammar Shop",
            description=(
                f"**Your Points:** {current_points} pts\n\n"
                f"{shop_text}\n\n"
                f"Use `/buy <item_id>` to purchase items!"
            ),
            color=0xFEE75C,
        )

        embed.set_footer(text="Earn points by writing clean messages!")

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error loading shop: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="buy", description="Purchase an item from the shop")
async def slash_buy(interaction: discord.Interaction, item_id: str):
    """Purchase item from shop"""
    await interaction.response.defer(ephemeral=True)

    try:
        result = purchase_item(str(interaction.user.id), item_id)

        if result["success"]:
            embed = discord.Embed(
                title="✅ Purchase Successful!",
                description=result["message"],
                color=0x57F287,
            )
        else:
            embed = discord.Embed(
                title="❌ Purchase Failed",
                description=result["message"],
                color=0xED4245,
            )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error purchasing item: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="use", description="Use an item from your inventory")
async def slash_use(interaction: discord.Interaction, item_id: str):
    """Use item from inventory"""
    await interaction.response.defer(ephemeral=True)

    try:
        result = use_item(str(interaction.user.id), item_id)

        if result["success"]:
            embed = discord.Embed(
                title="✅ Item Used!", description=result["message"], color=0x57F287
            )
        else:
            embed = discord.Embed(
                title="❌ Cannot Use Item",
                description=result["message"],
                color=0xED4245,
            )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error using item: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="allocate", description="Allocate stat points to upgrade your character"
)
@app_commands.describe(
    stat="Which stat to allocate points to",
    points="Number of points to allocate (default: 1)",
)
@app_commands.choices(
    stat=[
        app_commands.Choice(
            name="💪 Durability (+10 max HP per point)", value="durability"
        ),
        app_commands.Choice(
            name="🔥 Efficiency (+5% points per point)", value="efficiency"
        ),
        app_commands.Choice(name="⚡ Learning (+5% XP per point)", value="learning"),
        app_commands.Choice(
            name="🛡️ Resilience (-5% HP loss per point)", value="resilience"
        ),
        app_commands.Choice(
            name="💎 Fortune (3% shop discount per point)", value="fortune"
        ),
    ]
)
async def slash_allocate(
    interaction: discord.Interaction, stat: app_commands.Choice[str], points: int = 1
):
    """Allocate stat points to improve character abilities"""
    await interaction.response.defer(ephemeral=True)

    try:
        # Use the stat value from the choice
        stat_name = stat.value

        result = allocate_stat(str(interaction.user.id), stat_name, points)

        if result["success"]:
            # Get updated player data to show full stats
            from src.gamification import get_player_data

            player = get_player_data(str(interaction.user.id))

            embed = discord.Embed(
                title="💎 Stat Allocation Successful!",
                description=result["message"],
                color=0x57F287,
            )

            # Show current stat values
            if "stats" in player:
                stats_text = (
                    f"💪 Durability: {player['stats'].get('durability', 0)}\n"
                    f"🔥 Efficiency: {player['stats'].get('efficiency', 0)}\n"
                    f"⚡ Learning: {player['stats'].get('learning', 0)}\n"
                    f"🛡️ Resilience: {player['stats'].get('resilience', 0)}\n"
                    f"💎 Fortune: {player['stats'].get('fortune', 0)}"
                )
                embed.add_field(
                    name="📊 Your Current Stats",
                    value=stats_text,
                    inline=False,
                )

            # Show remaining points prominently
            remaining_points = player.get("stat_points", 0)
            embed.add_field(
                name="✨ Unallocated Points Remaining",
                value=f"**{remaining_points}** points available",
                inline=False,
            )

        else:
            embed = discord.Embed(
                title="❌ Allocation Failed",
                description=result["message"],
                color=0xED4245,
            )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error allocating stats: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="statpoints", description="View your stats and allocation points"
)
async def slash_statpoints(interaction: discord.Interaction):
    """View your current stat values and remaining allocation points"""
    await interaction.response.defer(ephemeral=True)

    try:
        from src.gamification import get_player_data

        player = get_player_data(str(interaction.user.id))

        embed = discord.Embed(
            title="📈 Your Character Stats",
            description=f"Level {player.get('level', 1)} • HP: {player.get('hp', 100)}/{player.get('max_hp', 100)}",
            color=0x5865F2,
        )

        if "stats" in player:
            durability = player["stats"].get("durability", 0)
            efficiency = player["stats"].get("efficiency", 0)
            learning = player["stats"].get("learning", 0)
            resilience = player["stats"].get("resilience", 0)
            fortune = player["stats"].get("fortune", 0)
            total_allocated = durability + efficiency + learning + resilience + fortune

            stats_text = (
                f"💪 **Durability**: {durability}\n"
                f"   └─ +1% max HP per point\n\n"
                f"🔥 **Efficiency**: {efficiency}\n"
                f"   └─ +2% damage per point\n\n"
                f"⚡ **Learning**: {learning}\n"
                f"   └─ +3% XP gain per point\n\n"
                f"🛡️ **Resilience**: {resilience}\n"
                f"   └─ -5% HP loss per point\n\n"
                f"💎 **Fortune**: {fortune}\n"
                f"   └─ 3% shop discount per point"
            )
            embed.add_field(
                name="📊 Current Stats",
                value=stats_text,
                inline=False,
            )

            remaining = player.get("stat_points", 0)
            totals_text = (
                f"📈 **Total Allocated**: {total_allocated} points\n"
                f"✨ **Remaining**: {remaining} points\n"
                f"📊 **Grand Total**: {total_allocated + remaining} available"
            )
            embed.add_field(
                name="💎 Point Summary",
                value=totals_text,
                inline=False,
            )
        else:
            remaining = player.get("stat_points", 0)
            embed.add_field(
                name="✨ Your Points",
                value=f"**{remaining}** points ready to allocate",
                inline=False,
            )

        embed.set_footer(text="Tip: Use /allocate <stat> [points] to allocate!")
        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error loading stats: {str(e)}", ephemeral=True
        )


# Attack cooldown tracking (user_id: last_attack_time)
attack_cooldown_map = {}
ATTACK_COOLDOWN_SECONDS = 15  # 15 seconds between attacks


async def skill_autocomplete(
    interaction: discord.Interaction,
    current: str,
) -> list[app_commands.Choice[str]]:
    """Autocomplete function for attack skill selection"""
    try:
        from src.gamification import get_player_data, get_unlocked_skills

        # Get user's unlocked skills
        user_id = str(interaction.user.id)
        player_data = get_player_data(user_id)
        unlocked_skills = get_unlocked_skills(player_data["level"])

        # Create choices from unlocked skills
        choices = []
        current_lower = current.lower().strip()

        for skill_data in unlocked_skills:
            skill_name = skill_data["name"]
            skill_id = skill_data["id"]

            # Filter by current input (case-insensitive)
            # Show all skills if no input, or filter by name/ID if typing
            if (not current_lower or
                current_lower in skill_name.lower() or
                current_lower in skill_id.lower()):

                # Show skill name with damage and cost info for better UX
                damage = skill_data.get("damage_multiplier", 1.0)
                cost = skill_data.get("stamina_cost", 10)
                display_name = f"{skill_name} (x{damage} dmg, {cost} HP)"

                choices.append(
                    app_commands.Choice(
                        name=display_name,
                        value=skill_id  # Use ID as value for matching
                    )
                )

        # Limit to 25 choices (Discord's limit)
        return choices[:25]
    except Exception as e:
        print(f"[ERROR] skill_autocomplete: {e}")
        return []


@bot.tree.command(
    name="attack", description="⚔️ GRAMMAR WARFARE - Challenge someone to combat!"
)
@app_commands.describe(
    target="The opponent to face in battle!",
    skill="Choose an attack skill from the list",
)
@app_commands.autocomplete(skill=skill_autocomplete)
async def slash_attack(
    interaction: discord.Interaction,
    target: discord.User,
    skill: str = None,
):
    """⚔️ DRAMATIC PVP COMBAT - Challenge anyone to grammar battle!"""
    await interaction.response.defer(ephemeral=False)  # Public for drama!

    try:
        # Check attack cooldown
        from datetime import datetime

        user_id = str(interaction.user.id)
        now = datetime.now()

        if user_id in attack_cooldown_map:
            time_since_last = now - attack_cooldown_map[user_id]
            if time_since_last.total_seconds() < ATTACK_COOLDOWN_SECONDS:
                cooldown_remaining = (
                    ATTACK_COOLDOWN_SECONDS - time_since_last.total_seconds()
                )
                embed = discord.Embed(
                    title="⏳ ATTACK COOLDOWN",
                    description=(
                        f"⚔️ Your next attack is ready in "
                        f"**{cooldown_remaining:.1f}** seconds!\n\n"
                        f"💡 *Strategy: Use this time to craft "
                        f"the perfect grammar attack!*"
                    ),
                    color=0x95A5A6,
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

        # Set cooldown for this user
        attack_cooldown_map[user_id] = now

        # Get attacker's unlocked skills
        from src.gamification import get_player_data, get_unlocked_skills

        attacker_data = get_player_data(str(interaction.user.id))
        unlocked_skills = get_unlocked_skills(attacker_data["level"])

        # If no skill chosen, show available skills
        if skill is None:
            # Debug info for troubleshooting
            print(f"[DEBUG] /attack: Attacker level: {attacker_data['level']}")
            print(f"[DEBUG] /attack: Unlocked skills count: {len(unlocked_skills)}")
            print(f"[DEBUG] /attack: Unlocked skills: {unlocked_skills}")
            print(f"[DEBUG] /attack: Skill IDs: {[s['id'] for s in unlocked_skills]}")

            embed = discord.Embed(
                title="⚔️ Choose Your Attack Skill",
                description="Use `/attack @user <skill_name>` to attack!",
                color=0x5865F2,
            )

            if len(unlocked_skills) == 0:
                embed.add_field(
                    name="❌ No Skills Available",
                    value="Contact the developers! No skills found for your level.",
                    inline=False,
                )
                print("[DEBUG] NO SKILLS FOUND - THIS IS THE BUG!")
            else:
                for s in unlocked_skills:
                    embed.add_field(
                        name=s["name"],
                        value=f"✨ {s['description']}\n"
                        f"💥 Damage: x{s['damage_multiplier']}\n"
                        f"⚡ Cost: {s['stamina_cost']} HP"
                        + (f"\n🌟 {s['special']}" if "special" in s else ""),
                        inline=False,
                    )

            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # Validate skill is unlocked (robust matching)
        skill_data = None
        if skill is not None:
            skill_lower = skill.lower().strip()
            for s in unlocked_skills:
                # Match by ID, exact name, or partial name (case-insensitive)
                if (
                    s["id"].lower() == skill_lower
                    or s["name"].lower() == skill_lower
                    or skill_lower in s["name"].lower()
                ):
                    skill_data = s
                    break

        if not skill_data:
            embed = discord.Embed(
                title="❌ Skill Not Available",
                description=f"You haven't unlocked this skill yet!\n"
                f"Your current level: {attacker_data['level']}",
                color=0xED4245,
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # Use the selected skill for attack
        result = attack_player(
            str(interaction.user.id), str(target.id), skill_data["id"]
        )

        if result["success"]:
            # Create dramatic combat embed
            drama_emojis = ["⚔️", "🔥", "💥", "⚡"]
            drama_emoji = drama_emojis[
                hash((interaction.user.id + int(target.id))) % len(drama_emojis)
            ]

            embed = discord.Embed(
                title=f"{drama_emoji} ⚔️ GRAMMAR SHOWDOWN! ⚔️ {drama_emoji}",
                description=(
                    f"**{interaction.user.display_name}** launches a devastating "
                    f"grammar attack on **{target.display_name}**!\n\n"
                    f"{result['message']}"
                ),
                color=0xE74C3C if result.get("critical") else 0xF39C12,
            )

            # Add skill info
            embed.add_field(name="Used Skill", value=skill_data["name"], inline=True)

            # Add footer with combat tips
            if result.get("dodged"):
                embed.set_footer(text="💨 Dodge chance increases with Learning stat!")
            elif result.get("critical"):
                embed.set_footer(text="💥 Critical hits are boosted by Fortune stat!")
            else:
                embed.set_footer(text="⚔️ Attack power scales with level and skills!")

            await interaction.followup.send(embed=embed)
        else:
            # Error embed
            embed = discord.Embed(
                title="❌ Attack Failed", description=result["message"], color=0xED4245
            )
            await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error during attack: {str(e)}", ephemeral=True
        )


@bot.tree.command(name="skills", description="⚔️ View all your unlocked attack skills")
async def slash_skills(interaction: discord.Interaction):
    """View all unlocked attack skills and next unlock"""
    await interaction.response.defer(ephemeral=True)

    try:
        from src.gamification import (
            get_next_skill_unlock,
            get_player_data,
            get_unlocked_skills,
        )
        from src.gamification.points import ATTACK_SKILLS

        player = get_player_data(str(interaction.user.id))
        unlocked = get_unlocked_skills(player["level"])
        next_unlock = get_next_skill_unlock(player["level"])

        embed = discord.Embed(
            title=f"⚔️ Attack Skills - Level {player['level']}/100",
            description=(
                "**Your Combat Arsenal**\n"
                "Use `/attack @user <skill_name>` to fight!\n\n"
                "Scroll down to see all skills and plan your upgrades!"
            ),
            color=0xE74C3C,
        )

        # Show unlocked skills
        if unlocked:
            embed.add_field(
                name="🟢 UNLOCKED SKILLS",
                value="─" * 40,
                inline=False,
            )

            for skill in unlocked:
                value = (
                    f"**Type:** `/attack @user {skill['id']}`\n"
                    f"💥 Power: **x{skill['damage_multiplier']}**  "
                    f"| ⚡ Cost: **{skill['stamina_cost']} HP**\n"
                    f"📝 {skill['description']}"
                )
                if "special" in skill:
                    value += f"\n✨ **SPECIAL:** {skill['special']}"

                embed.add_field(
                    name=f"{skill['name']}",
                    value=value,
                    inline=False,
                )

        # Show next unlock if available
        if next_unlock:
            embed.add_field(
                name="� NEXT UNLOCK",
                value=(
                    f"📈 **Level {next_unlock['unlock_level']}** "
                    f"({next_unlock['levels_until']} level"
                    f"{'s' if next_unlock['levels_until'] > 1 else ''} away!)\n"
                    f"{next_unlock['name']}\n"
                    f"💥 Power: **x{next_unlock['damage_multiplier']}**  "
                    f"| ⚡ Cost: **{next_unlock['stamina_cost']} HP**\n"
                    f"🎯 {next_unlock['description']}"
                ),
                inline=False,
            )

            # Show skill progression roadmap
            all_skills_sorted = sorted(
                ATTACK_SKILLS.items(),
                key=lambda x: x[1]["unlock_level"],
            )
            locked_skills = [
                s for s in all_skills_sorted if s[1]["unlock_level"] > player["level"]
            ]

            if locked_skills:
                roadmap_text = ""
                for skill_id, skill_data in locked_skills[1:]:
                    roadmap_text += (
                        f"  • Lv.{skill_data['unlock_level']} - "
                        f"{skill_data['name']}\n"
                    )

                if roadmap_text:
                    embed.add_field(
                        name="🗺️ FUTURE SKILLS",
                        value=roadmap_text.strip(),
                        inline=False,
                    )
        else:
            embed.set_footer(
                text=("🌟 You've unlocked all skills! " "You've reached maximum power!")
            )

        # Add helpful tips footer
        if not embed.footer:
            embed.set_footer(
                text=(
                    "💡 Tip: Use `/attack` without a skill name to "
                    "see your available skills!"
                )
            )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error fetching skills: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="quests", description="📜 View your daily quests (Solo Leveling style!)"
)
async def slash_quests(interaction: discord.Interaction):
    """View daily quests with progress"""
    await interaction.response.defer(ephemeral=True)

    try:
        quest_data = get_daily_quests_status(str(interaction.user.id))
        quests = quest_data["quests"]

        embed = discord.Embed(
            title="📜 Daily Quests",
            description="**[SYSTEM]** Complete quests to earn rewards!\nResets daily at midnight.",
            color=0x5865F2,
        )

        for quest in quests:
            status_emoji = "✅" if quest["completed"] else "⏳"
            progress_bar = ""

            if quest["completed"]:
                progress_bar = "█████████████████████ 100%"
            else:
                progress = quest["progress"]
                required = quest["required"]
                percentage = min(100, int((progress / required) * 100))
                filled = int(percentage / 5)
                empty = 20 - filled
                progress_bar = f"{'█' * filled}{'░' * empty} {percentage}%"

            # Build rewards text
            rewards = quest["rewards"]
            rewards_text = []
            if rewards.get("points"):
                rewards_text.append(f"+{rewards['points']} pts")
            if rewards.get("xp"):
                rewards_text.append(f"+{rewards['xp']} XP")
            if rewards.get("stat_points"):
                rewards_text.append(f"+{rewards['stat_points']} stat point(s)")

            field_value = (
                f"{quest['description']}\n"
                f"Progress: {quest['progress']}/{quest['required']}\n"
                f"{progress_bar}\n"
                f"🎁 Rewards: {', '.join(rewards_text)}"
            )

            embed.add_field(
                name=f"{status_emoji} {quest['name']}", value=field_value, inline=False
            )

        # Add completion summary
        completed_count = sum(1 for q in quests if q["completed"])
        total_count = len(quests)
        embed.set_footer(
            text=f"Completed: {completed_count}/{total_count} quests today"
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error loading quests: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="daily", description="📊 View your detailed daily writing statistics"
)
async def slash_daily(interaction: discord.Interaction):
    """View today's detailed statistics with quality breakdown"""
    await interaction.response.defer(ephemeral=True)

    try:
        from src.gamification import get_daily_report

        report = get_daily_report(str(interaction.user.id))

        if not report["has_data"]:
            await interaction.followup.send(f"📊 {report['message']}", ephemeral=True)
            return

        embed = discord.Embed(
            title="📊 Daily Writing Statistics",
            description=f"**Date:** {report['date']}\n\n"
            f"Track your writing quality across multiple aspects!",
            color=0xFFD700,
        )

        # Overall summary
        embed.add_field(
            name="📈 Today's Totals",
            value=f"**Points Earned:** {report['total_points']:,}\n"
            f"**XP Earned:** {report['total_xp']:,}\n"
            f"**Messages:** {report['messages_count']}\n"
            f"**Perfect Messages:** {report['perfect_messages']}",
            inline=False,
        )

        # Quality breakdown
        if report["quality_breakdown"]:
            quality_text = ""
            sorted_qualities = sorted(
                report["quality_breakdown"].items(),
                key=lambda x: x[1]["points"],
                reverse=True,
            )

            for aspect, data in sorted_qualities:
                aspect_display = aspect.replace("_", " ").title()
                quality_text += (
                    f"**{aspect_display}**\n"
                    f"  ✓ Count: {data['count']} | "
                    f"Points: +{data['points']} | "
                    f"XP: +{data['xp']}\n"
                )

            if quality_text:
                embed.add_field(
                    name="🌟 Quality Breakdown",
                    value=quality_text,
                    inline=False,
                )
        else:
            embed.add_field(
                name="🌟 Quality Breakdown",
                value="No quality bonuses earned yet today.\n"
                "Keep writing to earn bonuses!",
                inline=False,
            )

        # Add 7-day history summary if available
        if report.get("history"):
            history_text = ""
            for day_data in report["history"][-3:]:  # Last 3 days
                history_text += (
                    f"**{day_data['date']}:** "
                    f"{day_data['total_points']:,} pts, "
                    f"{day_data['messages']} msgs\n"
                )

            if history_text:
                embed.add_field(
                    name="📅 Recent History", value=history_text, inline=False
                )

        # 💡 IMPROVEMENT TIPS - Show what bonuses you HAVEN'T earned
        all_bonuses = {
            "perfect_spelling",
            "perfect_grammar",
            "long_quality_message",
            "perfect_punctuation",
            "varied_vocabulary",
        }
        earned_bonuses = set(report.get("quality_breakdown", {}).keys())
        missing_bonuses = all_bonuses - earned_bonuses

        if missing_bonuses and report["messages_count"] > 0:
            tips = []
            from src.gamification.points import QUALITY_BONUSES

            for bonus_id in missing_bonuses:
                bonus_info = QUALITY_BONUSES.get(bonus_id, {})
                tips.append(
                    f"• **{bonus_info.get('name', bonus_id)}**: "
                    f"{bonus_info.get('description', 'Keep improving!')}"
                )

            if tips:
                embed.add_field(
                    name="💡 How to Improve",
                    value="\n".join(tips[:3]),  # Show top 3 tips
                    inline=False,
                )

        embed.set_footer(
            text="Stats reset at midnight • Quality bonuses tracked silently"
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error loading daily stats: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="stats", description="View your grammar statistics and improvement trends"
)
async def slash_stats(interaction: discord.Interaction):
    """View user stats with smart trend analysis"""

    # Defer immediately to prevent timeout
    await interaction.response.defer(ephemeral=True)

    stats = load_stats()
    user_stats = stats.get(str(interaction.user.id), {})

    if not user_stats:
        embed = discord.Embed(
            title="📊 Grammar Statistics",
            description="You haven't used the bot yet! Start writing messages to see your stats.",
            color=0x95A5A6,
        )
        await interaction.followup.send(embed=embed, ephemeral=True)
        return

    # Create beautiful stats embed
    embed = discord.Embed(
        title=f"📊 Grammar Statistics for {interaction.user.display_name}",
        description="Your writing quality and improvement trends",
        color=0x3498DB,
    )

    # Basic activity stats
    messages_monitored = user_stats.get("messages_monitored", 0)
    auto_corrections = user_stats.get("auto_corrections", 0)
    manual_checks = user_stats.get("manual_checks", 0)
    errors_found = user_stats.get("errors_found", 0)

    # Total activity
    total_checks = messages_monitored + manual_checks
    embed.add_field(
        name="📝 Activity",
        value=f"**{total_checks:,}** total checks\n**{messages_monitored:,}** messages monitored\n**{manual_checks:,}** manual checks",
        inline=True,
    )

    # Error statistics
    embed.add_field(
        name="⚠️ Errors Found",
        value=f"**{errors_found:,}** total issues\n**{auto_corrections:,}** auto-corrections",
        inline=True,
    )

    # Calculate and show accuracy rate
    if messages_monitored > 0:
        accuracy = ((messages_monitored - auto_corrections) / messages_monitored) * 100

        # Visual accuracy bar
        accuracy_emoji = "🟢" if accuracy >= 90 else "🟡" if accuracy >= 75 else "🔴"
        accuracy_stars = "⭐" * int(accuracy / 20)  # 5-star rating

        embed.add_field(
            name=f"{accuracy_emoji} Accuracy Rate",
            value=f"**{accuracy:.1f}%** error-free messages\n{accuracy_stars}",
            inline=True,
        )

    # Error breakdown by type
    error_patterns = user_stats.get("error_patterns", {})
    if error_patterns:
        grammar_count = sum(
            count for key, count in error_patterns.items() if "grammar:" in key
        )
        spelling_count = sum(
            count for key, count in error_patterns.items() if "misspelling:" in key
        )
        typo_count = sum(
            count for key, count in error_patterns.items() if "typographical:" in key
        )

        if grammar_count or spelling_count or typo_count:
            # Create visual breakdown
            total_errors = grammar_count + spelling_count + typo_count
            breakdown_text = []

            if grammar_count:
                pct = (grammar_count / total_errors * 100) if total_errors > 0 else 0
                breakdown_text.append(f"📖 Grammar: **{grammar_count}** ({pct:.0f}%)")
            if spelling_count:
                pct = (spelling_count / total_errors * 100) if total_errors > 0 else 0
                breakdown_text.append(f"✏️ Spelling: **{spelling_count}** ({pct:.0f}%)")
            if typo_count:
                pct = (typo_count / total_errors * 100) if total_errors > 0 else 0
                breakdown_text.append(f"⌨️ Typos: **{typo_count}** ({pct:.0f}%)")

            embed.add_field(
                name="📈 Error Breakdown",
                value="\n".join(breakdown_text),
                inline=False,
            )

    # Recent activity trend (last 10 errors) - IMPROVED ANALYSIS
    error_history = user_stats.get("error_history", [])
    if len(error_history) >= 6:
        # Compare last 3 with previous 3 for more accurate trend
        recent_3 = error_history[-3:]
        previous_3 = error_history[-6:-3]

        recent_count = len(recent_3)
        previous_count = len(previous_3)

        if previous_count > 0:
            change_pct = ((recent_count - previous_count) / previous_count) * 100

            if recent_count < previous_count:
                trend_emoji = "�"
                improvement = ((previous_count - recent_count) / previous_count) * 100
                trend_text = f"{trend_emoji} **Improving!** {improvement:.0f}% fewer errors\n{previous_count} → {recent_count} errors"
            elif recent_count > previous_count:
                trend_emoji = "📈"
                decline = ((recent_count - previous_count) / previous_count) * 100
                trend_text = f"{trend_emoji} **Watch out!** {decline:.0f}% more errors\n{previous_count} → {recent_count} errors"
            else:
                trend_emoji = "➡️"
                trend_text = f"{trend_emoji} **Consistent** - Same error rate ({recent_count} errors)"

            embed.add_field(
                name="📊 Recent Trend (Last 3 vs Previous 3)",
                value=trend_text,
                inline=False,
            )
    elif len(error_history) >= 3:
        # Show simpler trend if we don't have enough history
        trend_count = len(error_history)
        embed.add_field(
            name="📊 Recent Activity",
            value=f"⏳ **Building history** - {trend_count} errors recorded\nNeed 6+ errors for trend analysis",
            inline=False,
        )

    # Smart recommendations (without showing full history)
    # AI-powered smart recommendations with timeout
    try:
        loop = asyncio.get_event_loop()
        trends = await asyncio.wait_for(
            loop.run_in_executor(None, analyze_trends_ai, user_stats), timeout=5.0
        )
    except asyncio.TimeoutError:
        print(f"AI Stats Analysis timed out for user {interaction.user.id}")
        trends = None
    except Exception as e:
        print(f"Error getting AI recommendations: {e}")
        trends = None

    if trends:
        # Show AI-generated recommendations
        embed.add_field(
            name="🤖 AI-Powered Recommendations",
            value="\n".join(f"• {rec}" for rec in trends),
            inline=False,
        )

    # Last active timestamp
    if user_stats.get("last_active"):
        last_active = datetime.fromisoformat(user_stats["last_active"])
        time_ago = datetime.now() - last_active

        if time_ago.days > 0:
            time_text = f"{time_ago.days} day{'s' if time_ago.days > 1 else ''} ago"
        elif time_ago.seconds >= 3600:
            hours = time_ago.seconds // 3600
            time_text = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_ago.seconds >= 60:
            minutes = time_ago.seconds // 60
            time_text = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_text = "just now"

        embed.set_footer(
            text=f"Last active: {time_text} • Tracking since {last_active.strftime('%b %d, %Y')}"
        )

    await interaction.followup.send(embed=embed, ephemeral=True)


@bot.tree.command(name="commands", description="📋 View all available bot commands")
async def slash_commands(interaction: discord.Interaction):
    """Display a list of all available commands"""
    await interaction.response.defer(ephemeral=True)

    try:
        embed = discord.Embed(
            title="📋 Grammar Teacher Bot - Command List",
            description="All available slash commands for your grammar journey!",
            color=0x5865F2,
        )

        # Grammar Commands
        embed.add_field(
            name="✏️ Grammar Commands",
            value=(
                "**`/check <text>`** - Check grammar of your text\n"
                "**`/stats`** - View your grammar statistics and trends\n"
                "**`/autocheck`** - Toggle auto-monitoring (currently disabled)"
            ),
            inline=False,
        )

        # Gamification Commands
        embed.add_field(
            name="🎮 Profile & Progression",
            value=(
                "**`/profile`** - View your gamification profile (HP, level, points)\n"
                "**`/statpoints`** - View character stats and allocation points\n"
                "**`/daily`** - View today's writing statistics and quality breakdown\n"
                "**`/quests`** - View your daily quests and progress\n"
                "**`/skills`** - View your unlocked attack skills"
            ),
            inline=False,
        )

        # Shop & Items
        embed.add_field(
            name="🏪 Shop & Items",
            value=(
                "**`/shop`** - Browse and purchase items with your points\n"
                "**`/buy <item_id>`** - Purchase an item from the shop\n"
                "**`/use <item_id>`** - Use an item from your inventory"
            ),
            inline=False,
        )

        # Battle System
        embed.add_field(
            name="⚔️ Battle System",
            value=(
                "**`/attack @user [skill_name]`** - Attack another player with a skill\n"
                "  └─ Use skill name or ID (e.g., 'Lexicon Slash' or 'basic_strike')\n"
                "  └─ Cooldown: 15 seconds between attacks"
            ),
            inline=False,
        )

        # Stats & Customization
        embed.add_field(
            name="💪 Stats & Customization",
            value=(
                "**`/allocate <stat> [points]`** - Allocate stat points\n"
                "  └─ Stats: durability, efficiency, learning, resilience, fortune"
            ),
            inline=False,
        )

        # System Commands
        embed.add_field(
            name="⚙️ System",
            value=(
                "**`/budget`** - Check AI usage and spending\n"
                "**`/commands`** - Show this command list"
            ),
            inline=False,
        )

        embed.set_footer(
            text="💡 Tip: Use Tab key when typing to see command suggestions!"
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.followup.send(
            f"❌ Error loading commands: {str(e)}", ephemeral=True
        )


@bot.tree.command(
    name="budget", description="Check AI usage and spending for this month"
)
async def slash_budget(interaction: discord.Interaction):
    """View OpenAI API budget and usage"""

    if not AI_GRAMMAR_AVAILABLE:
        await interaction.response.send_message(
            "❌ AI grammar checking is not enabled!", ephemeral=True
        )
        return

    try:
        budget = get_budget_status()

        # Create status embed
        embed = discord.Embed(
            title=f"{budget['emoji']} AI Budget Status - {budget['status']}",
            description=(
                f"**Current Month:** {budget['current_month']}\n"
                f"Using OpenAI GPT-4o-mini for accurate grammar checking"
            ),
            color=(
                0xFF0000
                if budget["suspended"]
                else (
                    0xED4245
                    if budget["percentage"] >= 90
                    else 0xFEE75C if budget["percentage"] >= 75 else 0x57F287
                )
            ),
        )

        # Spending info
        embed.add_field(
            name="💰 Spending",
            value=(
                f"**Used:** ${budget['spent']:.4f}\n"
                f"**Limit:** ${budget['limit']:.2f}\n"
                f"**Remaining:** ${budget['remaining']:.4f}"
            ),
            inline=True,
        )

        # Usage info
        percentage_bar = "█" * int(budget["percentage"] / 10)
        percentage_bar += "░" * (10 - int(budget["percentage"] / 10))

        embed.add_field(
            name="📊 Usage",
            value=(
                f"**Percentage:** {budget['percentage']:.1f}%\n"
                f"`{percentage_bar}`\n"
                f"**Requests:** {budget['requests']:,}"
            ),
            inline=True,
        )

        # Status message
        if budget["suspended"]:
            embed.add_field(
                name="🚫 Bot Suspended",
                value=(
                    "Budget limit reached! Bot will not process "
                    "grammar checks until next month.\n\n"
                    "**To resume:**\n"
                    "• Wait for automatic reset (1st of next month)\n"
                    "• Or increase OPENAI_MAX_BUDGET in .env file"
                ),
                inline=False,
            )
        elif budget["percentage"] >= 90:
            embed.add_field(
                name="⚠️ Warning",
                value=(
                    f"Only ${budget['remaining']:.2f} remaining! "
                    f"Bot will suspend at ${budget['limit']:.2f}"
                ),
                inline=False,
            )
        elif budget["percentage"] >= 75:
            embed.add_field(
                name="💡 Heads Up",
                value=(
                    f"You've used {budget['percentage']:.0f}% of your budget. "
                    f"${budget['remaining']:.2f} remaining."
                ),
                inline=False,
            )
        else:
            embed.add_field(
                name="✅ All Good",
                value=(
                    f"Plenty of budget remaining! "
                    f"At current usage: ~{int(budget['remaining'] / (budget['spent'] / budget['requests']) if budget['requests'] > 0 else 0):,} more checks available."
                ),
                inline=False,
            )

        # Cost estimate
        if budget["requests"] > 0:
            avg_cost = budget["spent"] / budget["requests"]
            embed.add_field(
                name="📉 Cost Analysis",
                value=(
                    f"**Average per check:** ${avg_cost:.6f}\n"
                    f"**Estimated monthly (1000/day):** "
                    f"${avg_cost * 30000:.2f}\n"
                    f"**Model:** GPT-4o-mini"
                ),
                inline=False,
            )

        embed.set_footer(
            text=(
                "Budget resets monthly • "
                "To change limit, update OPENAI_MAX_BUDGET in .env"
            )
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    except Exception as e:
        await interaction.response.send_message(
            f"❌ Error checking budget: {str(e)}", ephemeral=True
        )


# ============================================================================
# BOT EVENTS
# ============================================================================


@bot.event
async def on_ready():
    """Bot startup"""
    print(f"{bot.user} is online!")
    print(
        f"AI Grammar checking: " f'{"Enabled" if AI_GRAMMAR_AVAILABLE else "Disabled"}'
    )
    print(f"Auto-detection: " f'{"Active" if AI_GRAMMAR_AVAILABLE else "Disabled"}')

    try:
        # Sync commands globally (takes up to 1 hour)
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} slash commands globally")

        # Also sync to all guilds the bot is in (instant!)
        for guild in bot.guilds:
            try:
                guild_synced = await bot.tree.sync(guild=guild)
                print(f"Synced {len(guild_synced)} commands to guild: {guild.name}")
            except Exception as e:
                print(f"Failed to sync to guild {guild.name}: {e}")

    except Exception as e:
        print(f"Failed to sync commands: {e}")

    await bot.change_presence(
        activity=discord.Game(name="Grammar checking | /autocheck")
    )


@bot.tree.error
async def on_app_command_error(
    interaction: discord.Interaction, error: app_commands.AppCommandError
):
    """Handle errors gracefully without showing them to users"""
    print(f"[Command Error] {error}")

    # Log full traceback for debugging
    import traceback

    traceback.print_exception(type(error), error, error.__traceback__)

    # Try to respond if possible (don't show error to user, just fail silently)
    try:
        if not interaction.response.is_done():
            await interaction.response.send_message(
                "⚠️ Something went wrong. Please try again!", ephemeral=True
            )
        else:
            await interaction.followup.send(
                "⚠️ Something went wrong. Please try again!", ephemeral=True
            )
    except Exception as e:
        # Can't respond - just log and continue
        print(f"[Error Handler] Failed to send error message: {e}")


# ============================================================================
# RUN BOT
# ============================================================================

if __name__ == "__main__":
    if not TOKEN:
        print("ERROR: No bot token found!")
        print("Add BOT_TOKEN_GRAMMAR to your .env file")
    else:
        print("Starting Grammar Teacher Bot (Silent Tracking Mode)...")
        print("✅ Analyzing messages for quality bonuses")
        print("✅ Privacy-protected (sensitive info filtered)")
        print("✅ No DMs, no interruptions - pure gamification!")
        bot.run(TOKEN)
