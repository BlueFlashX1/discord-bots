"""Discord embed utilities for Reminder bot."""

import discord
from typing import Optional, List
from datetime import datetime


def create_reminder_embed(
    reminder_id: str,
    message: str,
    remind_at: str,
    recurring: Optional[str] = None,
    notes: Optional[str] = None,
) -> discord.Embed:
    """Create an embed for a reminder."""
    embed = discord.Embed(
        title="⏰ Reminder",
        description=message,
        color=discord.Color.orange(),
    )

    try:
        dt = datetime.fromisoformat(remind_at.replace("Z", "+00:00"))
        embed.add_field(
            name="⏰ Remind At",
            value=f"<t:{int(dt.timestamp())}:F> (<t:{int(dt.timestamp())}:R>)",
            inline=False,
        )
    except:
        embed.add_field(name="⏰ Remind At", value=remind_at, inline=False)

    if recurring:
        embed.add_field(name="🔄 Recurring", value=recurring, inline=True)

    if notes:
        embed.add_field(name="📝 Notes", value=notes[:500], inline=False)

    embed.set_footer(text=f"Reminder ID: {reminder_id}")
    return embed


def create_reminder_list_embed(reminders: List[dict]) -> discord.Embed:
    """Create an embed listing reminders."""
    embed = discord.Embed(
        title="📋 Your Reminders",
        description=f"You have {len(reminders)} active reminder(s)",
        color=discord.Color.blue(),
    )

    if not reminders:
        embed.description = "No active reminders"
        return embed

    # Sort by remind_at
    sorted_reminders = sorted(reminders, key=lambda r: r.get("remind_at", ""))

    for i, reminder in enumerate(sorted_reminders[:20], 1):
        message = reminder.get("message", "No message")[:50]
        remind_at = reminder.get("remind_at", "")
        reminder_id = reminder.get("id", "unknown")
        notes = reminder.get("notes")

        try:
            dt = datetime.fromisoformat(remind_at.replace("Z", "+00:00"))
            time_str = f"<t:{int(dt.timestamp())}:R>"
        except:
            time_str = remind_at

        recurring = reminder.get("recurring")
        rec_str = f" ({recurring})" if recurring else ""

        value = f"⏰ {time_str}{rec_str}\n`ID: {reminder_id[:8]}`"
        if notes:
            value += f"\n📝 {notes[:100]}"

        embed.add_field(
            name=f"{i}. {message}",
            value=value,
            inline=False,
        )

    if len(reminders) > 20:
        embed.set_footer(text=f"Showing 20 of {len(reminders)} reminders")

    return embed


def create_success_embed(message: str) -> discord.Embed:
    """Create a success embed."""
    return discord.Embed(
        title="✅ Success",
        description=message,
        color=discord.Color.green(),
    )


def create_error_embed(message: str) -> discord.Embed:
    """Create an error embed."""
    return discord.Embed(
        title="❌ Error",
        description=message,
        color=discord.Color.red(),
    )
