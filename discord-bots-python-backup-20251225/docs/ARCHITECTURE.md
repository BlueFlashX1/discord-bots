# Architecture Document: Discord Bots Ecosystem

**Project:** Discord Bots Collection
**Version:** 2.0
**Date:** December 21, 2025
**Status:** Active Development

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Components](#system-components)
4. [Data Architecture](#data-architecture)
5. [Integration Architecture](#integration-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Performance Architecture](#performance-architecture)

---

## System Overview

### Vision

A scalable, maintainable Discord bot ecosystem where specialized bots share common infrastructure while maintaining independence. The architecture prioritizes:

- **Code reusability** through shared utilities
- **Consistency** across bot implementations
- **Scalability** for growth and new features
- **Maintainability** for long-term development

### Core Architecture Pattern

**Shared Infrastructure + Independent Bots**

```
┌─────────────────────────────────────────────────────────┐
│                Discord Bots Ecosystem                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Shared Infrastructure Layer               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • Utilities (helpers, logger)                   │  │
│  │  • Configuration (settings.yaml)                 │  │
│  │  • Database Abstraction                          │  │
│  │  • Authentication Framework (OAuth2)             │  │
│  │  • Gamification System                           │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                  │
│  ┌───────────────────┴──────────────────────────────┐  │
│  │           Bot Layer (Independent Bots)           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ Grammar  │  │ Hangman  │  │ Spelling │       │  │
│  │  │   Bot    │  │   Bot    │  │  Bee Bot │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │   Mod    │  │ Utility  │  │  Music   │       │  │
│  │  │   Bot    │  │   Bot    │  │   Bot    │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
│                      │                                  │
│  ┌───────────────────┴──────────────────────────────┐  │
│  │         External Services Layer                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • Discord API                                   │  │
│  │  • OpenAI API                                    │  │
│  │  • Database (SQLite/PostgreSQL)                  │  │
│  │  • Redis Cache                                   │  │
│  │  • Payment APIs (Stripe/PayPal)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Separation of Concerns

**Principle:** Each layer has distinct responsibilities.

**Implementation:**

- **Shared Layer:** Common utilities, configuration, frameworks
- **Bot Layer:** Bot-specific logic, commands, features
- **Service Layer:** External API integrations

**Benefits:**

- Changes in one layer don't affect others
- Easy to test individual layers
- Clear boundaries for development

### 2. Code Reusability

**Principle:** Write once, use everywhere.

**Implementation:**

- Shared utilities in `utils/`
- Common patterns documented
- Template system for new bots
- Centralized configuration

**Benefits:**

- Reduced code duplication
- Consistent behavior across bots
- Faster bot development

### 3. Modularity

**Principle:** Bots are independent, self-contained units.

**Implementation:**

- Each bot has own directory structure
- Bot-specific dependencies isolated
- Independent deployment possible
- Shared utilities are optional

**Benefits:**

- Bot failures don't cascade
- Independent scaling
- Easy to add/remove bots

### 4. Scalability

**Principle:** System grows with demand.

**Implementation:**

- Asynchronous operations throughout
- Database connection pooling
- Redis caching for hot data
- Sharding support for large servers

**Benefits:**

- Handle increased load
- Performance remains consistent
- Cost-effective scaling

### 5. Security First

**Principle:** Security is built-in, not added later.

**Implementation:**

- Environment variables for secrets
- OAuth2 for authentication
- Input validation everywhere
- Rate limiting on all commands

**Benefits:**

- Protected user data
- Prevent abuse
- Compliance ready (GDPR)

---

## System Components

### 1. Shared Infrastructure

#### 1.1 Utilities (`utils/`)

**Purpose:** Common functions used across all bots

**Components:**

**`helpers.py`**

```python
# Configuration
load_config(path: str) -> dict

# Embeds
create_embed(
    title: str,
    description: str,
    color: int,
    fields: list = None,
    footer: str = None,
    timestamp: bool = False
) -> discord.Embed

# Time utilities
format_time(seconds: int) -> str
parse_time(time_str: str) -> int

# String utilities
truncate_string(text: str, max_length: int) -> str
chunk_list(items: list, chunk_size: int) -> list
```

**`logger.py`**

```python
setup_logger(
    name: str,
    log_file: str = None,
    level: str = "INFO"
) -> logging.Logger

get_log_filename(bot_name: str) -> str
```

**Usage Pattern:**

```python
from utils.helpers import load_config, create_embed
from utils.logger import setup_logger

config = load_config("config/settings.yaml")
logger = setup_logger(__name__, "logs/bot.log")
```

#### 1.2 Configuration System

**Architecture:**

```
config/
├── settings.yaml          # Shared settings
└── environments/
    ├── development.yaml   # Dev overrides
    ├── staging.yaml       # Staging overrides
    └── production.yaml    # Production overrides
```

**Configuration Hierarchy:**

1. Load base `settings.yaml`
2. Override with environment-specific file
3. Override with bot-specific settings
4. Override with environment variables

**Example:**

```yaml
# settings.yaml (base)
bot:
  prefix: '!'

colors:
  success: 0x2ecc71
  error: 0xe74c3c

rate_limits:
  commands_per_user: 5
  time_window: 10
```

#### 1.3 Database Abstraction Layer

**Architecture Decision:** Use SQLAlchemy ORM for database abstraction

**Benefits:**

- Database-agnostic (SQLite dev, PostgreSQL prod)
- Type safety with models
- Migration support
- Connection pooling

**Structure:**

```
database/
├── __init__.py
├── base.py              # Base model, session management
├── models/
│   ├── __init__.py
│   ├── user.py          # User model
│   ├── guild.py         # Guild (server) model
│   └── stats.py         # Statistics model
└── migrations/
    └── (Alembic migrations)
```

**Usage Pattern:**

```python
from database.base import get_session
from database.models import User

async with get_session() as session:
    user = await session.get(User, user_id)
    user.xp += 10
    await session.commit()
```

#### 1.4 Gamification Framework

**Architecture:**

```
gamification/
├── __init__.py
├── xp_system.py         # XP and leveling
├── achievements.py      # Achievement definitions
├── leaderboards.py      # Leaderboard generation
└── rewards.py           # Reward distribution
```

**Design Pattern:** Event-driven gamification

```python
# Event: User executes command
@bot.event
async def on_command_completion(ctx):
    await gamification.award_xp(
        user_id=ctx.author.id,
        amount=5,
        reason="command_execution"
    )

    # Check for level up
    if await gamification.check_level_up(ctx.author.id):
        await ctx.send("🎉 Level up!")
```

#### 1.5 OAuth2 Authentication Framework

**Architecture:**

```
auth/
├── __init__.py
├── oauth2.py            # OAuth2 flow implementation
├── tokens.py            # Token management
└── permissions.py       # Permission checking
```

**Flow:**

```
User → /premium command
  ↓
Bot → Sends OAuth2 authorization URL
  ↓
User → Authorizes on Discord
  ↓
Discord → Redirects to callback URL
  ↓
Bot → Exchanges code for token
  ↓
Bot → Stores token securely
  ↓
Bot → Grants premium access
```

---

### 2. Bot Layer

Each bot follows standardized structure:

```
bot-name/
├── main.py                    # Entry point
├── requirements.txt           # Dependencies
├── README.md                 # Documentation
├── .env.example              # Environment template
│
├── src/
│   ├── __init__.py
│   ├── bot.py                # Main bot class
│   ├── config.py             # Bot configuration
│   │
│   ├── commands/             # Command modules
│   │   ├── __init__.py
│   │   ├── core.py           # Core commands
│   │   └── premium.py        # Premium commands
│   │
│   ├── events/               # Event handlers
│   │   ├── __init__.py
│   │   ├── on_message.py
│   │   └── on_member_join.py
│   │
│   ├── views/                # Discord UI components
│   │   ├── __init__.py
│   │   ├── buttons.py
│   │   └── modals.py
│   │
│   └── services/             # Business logic
│       ├── __init__.py
│       └── game_logic.py
│
├── data/                     # Bot data
│   ├── words.json
│   └── config.json
│
└── logs/                     # Logs
    └── bot.log
```

---

## Data Architecture

### Database Schema

```sql
-- Users table (shared across bots)
CREATE TABLE users (
    id BIGINT PRIMARY KEY,          -- Discord user ID
    username TEXT NOT NULL,
    discriminator TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Gamification
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,

    -- Premium
    is_premium BOOLEAN DEFAULT FALSE,
    premium_since TIMESTAMP,
    premium_tier INTEGER DEFAULT 0,

    -- OAuth
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP
);

-- Guilds table
CREATE TABLE guilds (
    id BIGINT PRIMARY KEY,          -- Discord guild ID
    name TEXT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Configuration
    prefix TEXT DEFAULT "!",
    locale TEXT DEFAULT "en-US",

    -- Premium
    is_premium BOOLEAN DEFAULT FALSE,
    premium_tier INTEGER DEFAULT 0
);

-- User stats per bot
CREATE TABLE user_bot_stats (
    user_id BIGINT NOT NULL,
    bot_name TEXT NOT NULL,
    command_count INTEGER DEFAULT 0,
    last_active TIMESTAMP,

    -- Bot-specific stats (JSON)
    stats JSONB,

    PRIMARY KEY (user_id, bot_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    rarity TEXT,              -- common, rare, epic, legendary
    points INTEGER DEFAULT 0,
    icon_url TEXT
);

-- User achievements
CREATE TABLE user_achievements (
    user_id BIGINT NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 100,  -- Percentage

    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- Leaderboards
CREATE TABLE leaderboard_entries (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    guild_id BIGINT,
    category TEXT NOT NULL,     -- xp, commands, wins, etc.
    value INTEGER NOT NULL,
    period TEXT NOT NULL,       -- daily, weekly, monthly, all_time
    period_start DATE NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, guild_id, category, period, period_start)
);
```

### Caching Strategy

**Redis Cache Structure:**

```python
# User cache (hot data)
user:{user_id} → {
    "username": "...",
    "level": 5,
    "xp": 1250,
    "is_premium": true
}
TTL: 1 hour

# Guild configuration
guild:{guild_id}:config → {
    "prefix": "!",
    "locale": "en-US",
    "features": [...]
}
TTL: 1 hour

# Leaderboard cache
leaderboard:{guild_id}:{category}:{period} → [
    {"user_id": 123, "value": 5000, "rank": 1},
    {"user_id": 456, "value": 4500, "rank": 2},
    ...
]
TTL: 5 minutes

# Rate limiting
ratelimit:{user_id}:{command} → count
TTL: based on time_window
```

---

## Integration Architecture

### Discord API Integration

**Pattern:** Event-driven with command handling

```python
# Event listeners
@bot.event
async def on_ready():
    logger.info(f"{bot.user} connected")
    await bot.tree.sync()  # Sync slash commands

@bot.event
async def on_message(message):
    # Process message
    await bot.process_commands(message)

# Slash commands
@app_commands.command()
async def command(interaction: discord.Interaction):
    await interaction.response.send_message("Response")
```

**Rate Limiting Strategy:**

- Respect Discord rate limits (bucket system)
- Implement bot-side rate limiting
- Queue requests during high load
- Retry with exponential backoff

### OpenAI API Integration

**Pattern:** Async API calls with error handling

```python
class AIService:
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def generate(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            return response.choices[0].message.content
        except openai.RateLimitError:
            logger.warning("OpenAI rate limit hit")
            raise
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            raise
```

### Payment Integration

**Architecture:** Webhook-based async processing

```
Payment Flow:
1. User → /subscribe command
2. Bot → Generate Stripe checkout session
3. Bot → Send payment link
4. User → Complete payment on Stripe
5. Stripe → Send webhook to bot server
6. Bot → Verify webhook signature
7. Bot → Update user premium status
8. Bot → Send confirmation to user
```

---

## Security Architecture

### Secrets Management

**Environment Variables:**

```bash
# Required for all bots
DISCORD_TOKEN=bot_token_here

# Optional (if using AI)
OPENAI_API_KEY=sk-...

# Optional (if using premium)
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379/0
```

### Input Validation

**Pattern:** Validate all user input

```python
async def validate_input(value: str, max_length: int = 200):
    # Length check
    if len(value) > max_length:
        raise ValueError(f"Input too long (max {max_length})")

    # SQL injection prevention (using ORM)
    # XSS prevention (Discord handles this)

    # Content filtering
    if contains_profanity(value):
        raise ValueError("Inappropriate content")

    return value
```

### Permission System

**Levels:**

1. **User:** Default permissions
2. **Moderator:** Server moderation commands
3. **Admin:** Server configuration commands
4. **Bot Owner:** All commands including bot management

**Implementation:**

```python
def requires_permission(level: str):
    async def predicate(interaction: discord.Interaction):
        if level == "moderator":
            return check_moderator(interaction.user)
        elif level == "admin":
            return check_admin(interaction.user)
        # ...
    return app_commands.check(predicate)

@app_commands.command()
@requires_permission("admin")
async def config(interaction: discord.Interaction):
    # Admin-only command
    pass
```

---

## Deployment Architecture

### Development Environment

```
Local Development:
- SQLite database
- No Redis (in-memory cache fallback)
- Debug logging enabled
- Hot reload enabled
```

### Production Environment

```
Production Stack:
- PostgreSQL database (managed)
- Redis cache (managed)
- Docker containers on VPS
- Reverse proxy (nginx)
- PM2 or systemd for process management
- Logging to file + Sentry
```

### Deployment Process

```
1. Development → Git push to feature branch
2. GitHub Actions → Run tests
3. Tests pass → Merge to main
4. Main branch → Build Docker image
5. Docker image → Push to registry
6. Production → Pull new image
7. Production → Rolling restart bots
8. Production → Health check
9. Success → Complete deployment
10. Failure → Rollback to previous version
```

---

## Performance Architecture

### Async Operations

**Pattern:** Use async/await everywhere

```python
# Good: Async operations
async def fetch_user_data(user_id: int):
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/users/{user_id}") as resp:
            return await resp.json()

# Bad: Blocking operations
def fetch_user_data_blocking(user_id: int):
    response = requests.get(f"/users/{user_id}")  # Blocks!
    return response.json()
```

### Database Optimization

**Strategies:**

1. **Indexes** on frequently queried columns
2. **Connection pooling** (SQLAlchemy)
3. **Query optimization** (select only needed columns)
4. **Batch operations** where possible

```sql
-- Indexes
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_user_stats_last_active ON user_bot_stats(last_active);
CREATE INDEX idx_leaderboard_composite
    ON leaderboard_entries(guild_id, category, period, period_start);
```

### Caching Strategy

**Cache Hierarchy:**

1. **Memory cache** (fastest, smallest) - Active sessions
2. **Redis cache** (fast, medium) - User data, leaderboards
3. **Database** (slower, largest) - Persistent data

**Cache Invalidation:**

- TTL-based for most data
- Event-based for critical updates
- Manual invalidation for administrative changes

---

## Architecture Decision Records

### ADR-001: Use SQLAlchemy for Database Layer

**Status:** Accepted  
**Date:** 2025-12-21

**Context:**
Need database abstraction for multiple bots accessing shared data.

**Decision:**
Use SQLAlchemy ORM with async support.

**Consequences:**

- Pros: Database-agnostic, type-safe, migration support
- Cons: Learning curve, some performance overhead

### ADR-002: Centralized Gamification System

**Status:** Accepted  
**Date:** 2025-12-21

**Context:**
Want XP/levels to work across all bots in ecosystem.

**Decision:**
Implement shared gamification framework that all bots use.

**Consequences:**

- Pros: Consistent UX, shared leaderboards, easier maintenance
- Cons: Tight coupling, potential single point of failure

### ADR-003: OAuth2 for Premium Features

**Status:** Accepted  
**Date:** 2025-12-21

**Context:**
Need authentication for premium feature access.

**Decision:**
Use Discord OAuth2 for user authentication.

**Consequences:**

- Pros: Seamless UX, secure, Discord-native
- Cons: Requires web server, complex flow

---

## Future Architecture Considerations

1. **Microservices:** Split large bots into microservices if needed
2. **Event Bus:** Use message queue (RabbitMQ) for inter-bot communication
3. **GraphQL API:** Provide unified API for web dashboard
4. **Kubernetes:** Container orchestration for large-scale deployments
5. **Multi-region:** Deploy to multiple regions for low latency

---

## Related Documents

- `docs/PRD.md` - Product requirements
- `SHARED-UTILITIES.md` - Utilities reference
- `DEVELOPMENT-GUIDE.md` - Development workflow

---

**Last Updated:** December 21, 2025  
**Next Review:** February 2026
