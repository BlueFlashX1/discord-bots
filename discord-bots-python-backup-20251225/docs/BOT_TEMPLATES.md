# Quick Start Templates

Ready-to-use templates for common Discord bot types. Copy and customize!

---

## 🎯 1. Simple Utility Bot Template

**File:** `bots/utility-bot/bot.py`

```python
import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment
load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents, description='Utility Bot')

@bot.event
async def on_ready():
    print(f'{bot.user} is online!')
    await bot.change_presence(activity=discord.Game(name="!help"))

@bot.command()
async def ping(ctx):
    """Check bot latency"""
    latency = round(bot.latency * 1000)
    await ctx.send(f'🏓 Pong! Latency: {latency}ms')

@bot.command()
async def serverinfo(ctx):
    """Display server information"""
    guild = ctx.guild
    embed = discord.Embed(
        title=f"📊 {guild.name} Server Info",
        color=0x3498db,
        timestamp=datetime.utcnow()
    )
    embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
    embed.add_field(name="👑 Owner", value=guild.owner.mention, inline=True)
    embed.add_field(name="👥 Members", value=guild.member_count, inline=True)
    embed.add_field(name="📅 Created", value=guild.created_at.strftime("%b %d, %Y"), inline=True)
    embed.add_field(name="💬 Channels", value=len(guild.channels), inline=True)
    embed.add_field(name="🎭 Roles", value=len(guild.roles), inline=True)
    embed.set_footer(text=f"Server ID: {guild.id}")

    await ctx.send(embed=embed)

@bot.command()
async def poll(ctx, question, *options):
    """Create a poll: !poll "Question?" "Option 1" "Option 2" """
    if len(options) < 2:
        await ctx.send("❌ Need at least 2 options!")
        return
    if len(options) > 10:
        await ctx.send("❌ Maximum 10 options!")
        return

    # Number emojis for reactions
    numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

    description = []
    for i, option in enumerate(options):
        description.append(f"{numbers[i]} {option}")

    embed = discord.Embed(
        title=f"📊 {question}",
        description="\n".join(description),
        color=0xf39c12
    )
    embed.set_footer(text=f"Poll by {ctx.author.name}")

    poll_msg = await ctx.send(embed=embed)

    for i in range(len(options)):
        await poll_msg.add_reaction(numbers[i])

bot.run(TOKEN)
```

**Usage:**

```
!ping
!serverinfo
!poll "Best language?" "Python" "JavaScript" "Java"
```

---

## 🎮 2. Welcome Bot Template

**File:** `bots/welcome-bot/bot.py`

```python
import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')
WELCOME_CHANNEL_ID = 1234567890  # Replace with your channel ID

intents = discord.Intents.default()
intents.members = True  # Important for member events
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user} is online!')

@bot.event
async def on_member_join(member):
    """Welcome new members"""
    channel = bot.get_channel(WELCOME_CHANNEL_ID)
    if channel:
        embed = discord.Embed(
            title="🎉 Welcome!",
            description=f"Welcome to the server, {member.mention}!",
            color=0x2ecc71
        )
        embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
        embed.add_field(name="Member #", value=f"{len(member.guild.members)}", inline=True)
        embed.add_field(name="Account Created", value=member.created_at.strftime("%b %d, %Y"), inline=True)
        embed.set_footer(text=f"ID: {member.id}")

        await channel.send(embed=embed)

        # Optional: Send DM to new member
        try:
            await member.send(
                f"Welcome to {member.guild.name}! 👋\n"
                "Please read the rules and have fun!"
            )
        except discord.Forbidden:
            pass  # User has DMs disabled

@bot.event
async def on_member_remove(member):
    """Goodbye messages"""
    channel = bot.get_channel(WELCOME_CHANNEL_ID)
    if channel:
        await channel.send(f"👋 {member.name} has left the server.")

bot.run(TOKEN)
```

---

## 💰 3. Economy Bot Template

**File:** `bots/economy-bot/bot.py`

```python
import discord
from discord.ext import commands
import json
import os
from dotenv import load_dotenv
import random

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='$', intents=intents)

# Simple JSON database
def load_data():
    try:
        with open('economy_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_data(data):
    with open('economy_data.json', 'w') as f:
        json.dump(data, f, indent=2)

def get_balance(user_id):
    data = load_data()
    return data.get(str(user_id), 0)

def update_balance(user_id, amount):
    data = load_data()
    data[str(user_id)] = data.get(str(user_id), 0) + amount
    save_data(data)
    return data[str(user_id)]

@bot.event
async def on_ready():
    print(f'{bot.user} is online!')

@bot.command()
async def balance(ctx):
    """Check your balance"""
    bal = get_balance(ctx.author.id)
    await ctx.send(f"💰 {ctx.author.mention}, you have **${bal}** coins!")

@bot.command()
async def daily(ctx):
    """Claim daily reward"""
    amount = random.randint(100, 500)
    new_balance = update_balance(ctx.author.id, amount)

    embed = discord.Embed(
        title="🎁 Daily Reward!",
        description=f"You received **${amount}** coins!",
        color=0x2ecc71
    )
    embed.add_field(name="New Balance", value=f"${new_balance}")
    await ctx.send(embed=embed)

@bot.command()
async def gamble(ctx, amount: int):
    """Gamble coins: $gamble 100"""
    if amount <= 0:
        await ctx.send("❌ Amount must be positive!")
        return

    balance = get_balance(ctx.author.id)
    if balance < amount:
        await ctx.send(f"❌ You only have ${balance}!")
        return

    # 45% chance to win double
    if random.random() < 0.45:
        winnings = amount
        update_balance(ctx.author.id, winnings)
        await ctx.send(f"🎉 You won ${amount}! New balance: ${balance + winnings}")
    else:
        update_balance(ctx.author.id, -amount)
        await ctx.send(f"💸 You lost ${amount}! New balance: ${balance - amount}")

@bot.command()
async def leaderboard(ctx):
    """Show richest users"""
    data = load_data()
    sorted_users = sorted(data.items(), key=lambda x: x[1], reverse=True)[:10]

    embed = discord.Embed(
        title="🏆 Richest Users",
        color=0xf39c12
    )

    for i, (user_id, balance) in enumerate(sorted_users, 1):
        user = await bot.fetch_user(int(user_id))
        embed.add_field(
            name=f"{i}. {user.name}",
            value=f"${balance}",
            inline=False
        )

    await ctx.send(embed=embed)

bot.run(TOKEN)
```

**Usage:**

```
$balance
$daily
$gamble 100
$leaderboard
```

---

## 🎵 4. Simple Music Bot Template

**File:** `bots/music-bot/bot.py`

```python
# Note: Requires yt-dlp and PyNaCl
# pip install yt-dlp PyNaCl

import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
bot = commands.Bot(command_prefix='!', intents=intents)

queues = {}

@bot.event
async def on_ready():
    print(f'{bot.user} is online!')

@bot.command()
async def join(ctx):
    """Join your voice channel"""
    if ctx.author.voice:
        channel = ctx.author.voice.channel
        await channel.connect()
        await ctx.send(f"✅ Joined {channel.name}")
    else:
        await ctx.send("❌ You're not in a voice channel!")

@bot.command()
async def leave(ctx):
    """Leave voice channel"""
    if ctx.voice_client:
        await ctx.voice_client.disconnect()
        await ctx.send("👋 Left voice channel")
    else:
        await ctx.send("❌ I'm not in a voice channel!")

@bot.command()
async def play(ctx, url):
    """Play a YouTube video: !play <url>"""
    if not ctx.voice_client:
        await ctx.invoke(bot.get_command('join'))

    # This is a simplified version - you'll need yt-dlp for full functionality
    await ctx.send(f"🎵 Would play: {url}")
    # Implementation requires yt-dlp and FFmpeg

@bot.command()
async def pause(ctx):
    """Pause playback"""
    if ctx.voice_client and ctx.voice_client.is_playing():
        ctx.voice_client.pause()
        await ctx.send("⏸️ Paused")

@bot.command()
async def resume(ctx):
    """Resume playback"""
    if ctx.voice_client and ctx.voice_client.is_paused():
        ctx.voice_client.resume()
        await ctx.send("▶️ Resumed")

@bot.command()
async def stop(ctx):
    """Stop playback"""
    if ctx.voice_client:
        ctx.voice_client.stop()
        await ctx.send("⏹️ Stopped")

bot.run(TOKEN)
```

---

## 🎲 5. Fun & Games Bot Template

**File:** `bots/fun-bot/bot.py`

```python
import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import random
import aiohttp

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN_1')

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'{bot.user} is online!')

@bot.command()
async def roll(ctx, dice: str = "1d6"):
    """Roll dice: !roll 2d20"""
    try:
        rolls, sides = map(int, dice.lower().split('d'))
        results = [random.randint(1, sides) for _ in range(rolls)]
        total = sum(results)

        await ctx.send(
            f"🎲 Rolling {dice}...\n"
            f"Results: {', '.join(map(str, results))}\n"
            f"**Total: {total}**"
        )
    except:
        await ctx.send("❌ Format: !roll 2d20")

@bot.command()
async def flip(ctx):
    """Flip a coin"""
    result = random.choice(['Heads', 'Tails'])
    await ctx.send(f"🪙 {result}!")

@bot.command()
async def choose(ctx, *choices):
    """Choose between options: !choose pizza tacos burgers"""
    if len(choices) < 2:
        await ctx.send("❌ Give me at least 2 options!")
        return

    choice = random.choice(choices)
    await ctx.send(f"🤔 I choose: **{choice}**")

@bot.command(name='8ball')
async def magic_8ball(ctx, *, question):
    """Ask the magic 8-ball: !8ball Will I win?"""
    responses = [
        "Yes, definitely!",
        "It is certain.",
        "Without a doubt.",
        "Yes.",
        "Most likely.",
        "Outlook good.",
        "Signs point to yes.",
        "Reply hazy, try again.",
        "Ask again later.",
        "Better not tell you now.",
        "Cannot predict now.",
        "Concentrate and ask again.",
        "Don't count on it.",
        "My reply is no.",
        "My sources say no.",
        "Outlook not so good.",
        "Very doubtful."
    ]

    await ctx.send(f"🎱 {random.choice(responses)}")

@bot.command()
async def joke(ctx):
    """Get a random dad joke"""
    async with aiohttp.ClientSession() as session:
        async with session.get('https://icanhazdadjoke.com/',
                               headers={'Accept': 'application/json'}) as response:
            if response.status == 200:
                data = await response.json()
                await ctx.send(f"😄 {data['joke']}")
            else:
                await ctx.send("❌ Couldn't fetch a joke!")

@bot.command()
async def meme(ctx):
    """Get a random meme"""
    async with aiohttp.ClientSession() as session:
        async with session.get('https://meme-api.com/gimme') as response:
            if response.status == 200:
                data = await response.json()
                embed = discord.Embed(
                    title=data['title'],
                    color=0x9b59b6
                )
                embed.set_image(url=data['url'])
                embed.set_footer(text=f"👍 {data['ups']} | r/{data['subreddit']}")
                await ctx.send(embed=embed)

bot.run(TOKEN)
```

**Usage:**

```
!roll 2d20
!flip
!choose pizza tacos burgers
!8ball Will I win the lottery?
!joke
!meme
```

---

## 📝 Next Steps

1. **Choose a template** that matches your goal
2. **Create the bot directory** in `bots/`
3. **Copy the template code**
4. **Add your bot token** to `.env`
5. **Run and test**
6. **Customize and extend**!

All templates use your conda environment automatically! 🚀
