# Integration Guide - Private Modal Gameplay

## Quick Start Integration

This guide shows how to integrate the private modal system into the main bot.

## Step 1: Import New Modules

In `spelling_bee_bot.py`, add:

```python
from src.core.private_game_manager import PrivateGameManager
from src.core.game_views import PlayerGameView
from src.gamification.player_session import GameSessionTracker
```

## Step 2: Store PrivateGameManager per Game

In the `SpellingBeeBot` class, modify the start_button handler in views.py:

```python
# Add this to GameControlView.__init__:
self.private_game_manager = None

# In start_button method, after game starts:
# Create private game manager
self.private_game_manager = PrivateGameManager(
    game_id=game.game_id,
    letters=game.letters,
    word_generator=word_generator,
    bot=bot,
    possible_words=game.possible_words,
)

# Initialize all players
for player_id in game.participants:
    player = guild.get_member(player_id)
    player_name = player.display_name if player else f"User {player_id}"

    await self.private_game_manager.initialize_player(
        player_id,
        player_name,
    )
```

## Step 3: Handle Word Submissions During Game

Replace the `/submit` command logic:

**Old Flow (slash command):**

```python
@app_commands.command(name="submit")
async def submit_command(self, interaction: discord.Interaction, word: str):
    """Submit word via slash command"""
    game.submit_word(interaction.user.id, word)
```

**New Flow (no slash command needed):**

- Players click "Submit Word" in their private DM
- Modal opens automatically
- Word is submitted through modal handler
- No additional command needed

## Step 4: Update Game End Handler

Modify the `_end_game_timer_expired` method:

```python
async def _end_game_timer_expired(self):
    """Called when game timer expires"""
    try:
        self.game.mark_game_ended()

        # Get results from private game manager
        if self.private_game_manager:
            results_text = await self.private_game_manager.end_game()

            # Create final embed
            embed = discord.Embed(
                title="🐝 Spelling Bee Final Results",
                description=results_text,
                color=0xFFD700,
            )

            # Get leaderboard from session tracker
            leaderboard = (
                self.private_game_manager.session_tracker
                .get_leaderboard()
            )

            # Format leaderboard field
            lb_text = ""
            for rank, (pid, name, score, wc, att) in enumerate(
                leaderboard, 1
            ):
                lb_text += (
                    f"{rank}. **{name}**: {score} pts "
                    f"({wc} words, {att} attempts)\n"
                )

            embed.add_field(
                name="🏆 Final Leaderboard",
                value=lb_text if lb_text else "No results",
                inline=False,
            )

            # Post to channel
            try:
                if self.embed_message:
                    await self.embed_message.reply(embed=embed)
            except Exception as e:
                log_debug(f"Could not post results: {str(e)}")

    except Exception as e:
        log_error_traceback(e, "_end_game_timer_expired")
```

## Step 5: Handle Early Game End

Update the end_button or /spelling_end command:

```python
async def end_command(self, interaction: discord.Interaction):
    """End game early"""
    try:
        # Find game...
        game = ...

        # Get results from private manager
        if hasattr(game, '_private_manager'):
            results = await game._private_manager.end_game()

            # Create and post results embed...

        # Clean up
        delete_game(game.game_id)

    except Exception as e:
        log_error_traceback(e, "end_command")
```

## Step 6: Store Manager Reference

Modify `create_game` function to store the manager:

```python
def create_game(
    game_id: str,
    starter_id: int,
    letters: str,
    possible_words: List[Dict],
    bot: commands.Bot,
    word_generator: WordGenerator,
) -> SpellingBeeGame:
    """Create a new game with private manager"""
    game = SpellingBeeGame(game_id, starter_id, letters, possible_words)

    # Create and store private game manager
    game._private_manager = PrivateGameManager(
        game_id,
        letters,
        word_generator,
        bot,
        possible_words,
    )

    active_games[game_id] = game
    return game
```

## Step 7: Update Command Signatures

Modify `spelling_command`:

```python
# Remove the /submit command requirement note
# Add to description:
description="Start a spelling bee game - play privately with modals",

# Add note about gameplay:
embed.add_field(
    name="🎮 How to Play",
    value=(
        "Click the 'Submit Word' button in your private DM\n"
        "Type words in the modal that opens\n"
        "Get instant feedback on validity"
    ),
    inline=False,
)
```

## Complete Example Integration

```python
class SpellingBeeBot(commands.Cog):
    """Spelling Bee Game Cog"""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.word_generator = WordGenerator(OPENAI_API_KEY)
        self.active_managers = {}  # game_id -> PrivateGameManager

    async def _start_private_gameplay(
        self,
        game: SpellingBeeGame,
        channel_id: str,
    ) -> None:
        """Start private gameplay for all participants"""
        try:
            # Create private game manager
            manager = PrivateGameManager(
                game.game_id,
                game.letters,
                self.word_generator,
                self.bot,
                game.possible_words,
            )
            self.active_managers[game.game_id] = manager

            # Initialize each player
            for player_id in game.participants:
                try:
                    user = await self.bot.fetch_user(player_id)
                    member = (
                        self.bot.get_guild(channel_id).get_member(
                            player_id
                        )
                    )
                    player_name = (
                        member.display_name
                        if member
                        else user.name
                    )

                    await manager.initialize_player(
                        player_id,
                        player_name,
                    )
                except Exception as e:
                    log_debug(
                        f"Failed to init player {player_id}: {str(e)}"
                    )

        except Exception as e:
            log_error_traceback(e, "_start_private_gameplay")

    async def _end_private_gameplay(
        self,
        game_id: str,
    ) -> Optional[discord.Embed]:
        """End private gameplay and get results"""
        try:
            if game_id not in self.active_managers:
                return None

            manager = self.active_managers[game_id]

            # Compile results
            leaderboard = (
                manager.session_tracker.get_leaderboard()
            )

            embed = discord.Embed(
                title="🐝 Spelling Bee Final Results",
                color=0xFFD700,
            )

            # Leaderboard
            lb_text = ""
            for rank, (pid, name, score, wc, att) in enumerate(
                leaderboard, 1
            ):
                lb_text += (
                    f"{rank}. **{name}**: {score} pts "
                    f"({wc} words)\n"
                )

            embed.add_field(
                name="🏆 Final Leaderboard",
                value=lb_text if lb_text else "No words found",
                inline=False,
            )

            # All words with definitions
            words_text = ""
            for pid, name, score, wc, _ in leaderboard:
                words = manager.session_tracker.get_player_words(pid)
                if words:
                    words_text += f"\n**{name}** ({score} pts):\n"
                    for word, pts, definition in words:
                        words_text += (
                            f"• **{word}** (+{pts}): {definition}\n"
                        )

            if words_text:
                embed.add_field(
                    name="📚 All Words Found",
                    value=words_text[:4096],  # Discord limit
                    inline=False,
                )

            # Cleanup
            del self.active_managers[game_id]

            return embed

        except Exception as e:
            log_error_traceback(e, "_end_private_gameplay")
            return None
```

## Testing Checklist

- [ ] Game starts and private DMs sent to all players
- [ ] Each player can only see their own embed
- [ ] Valid words are accepted and definitions shown
- [ ] Invalid words are rejected with helpful message
- [ ] Attempt count increments for all submissions
- [ ] Score updates correctly in player embed
- [ ] Multiple players don't see each other's words
- [ ] Final leaderboard shows all participants
- [ ] Final results show all words with definitions
- [ ] Game ends automatically when timer expires
- [ ] Game can end manually with /spelling_end
- [ ] No errors in DM processing
- [ ] Definitions are helpful and accurate

## Troubleshooting

### Players not receiving DM

- Check bot permissions in Discord
- Verify user hasn't disabled DMs from bots
- Check bot token is correct

### Modal not opening

- Ensure discord.py supports `send_modal()`
- Update discord.py to latest version
- Check client intents are enabled

### Definitions not showing

- Verify OpenAI API key is valid
- Check API quota isn't exceeded
- Verify model supports `get_word_definition()`

### Embeds not updating

- Ensure message object is stored correctly
- Check edit permissions (should be fine for DMs)
- Verify view is persisting correctly

---

## Performance Considerations

- DM sending is async - one per player
- Word validation is quick (local + API)
- Definition retrieval cached in embed
- Leaderboard generation is O(n)
- Final results compilation is O(n²) at worst

For 4 players, expect:

- ~4-8 DMs sent (100-200ms)
- Per word: ~500-1000ms (validation + definition)
- Final compilation: ~100ms
