# Grammar Bot - Completion Guide

## 🎉 CURRENT STATUS: 75% Complete

### ✅ COMPLETED Components:

1. **Database Models (3/3)** ✅
   - `User.js` - Full gamification (points, XP, HP, streaks, shop, achievements, PvP)
   - `BudgetTracking.js` - OpenAI cost monitoring
   - `DailyStats.js` - Daily analytics

2. **Services (3/3)** ✅
   - `aiGrammar.js` - OpenAI grammar checking with JSON responses
   - `budgetMonitor.js` - Daily/monthly budget limits
   - `analysisEngine.js` - Message analysis and error formatting

3. **Gamification (1 file, 4 systems)** ✅
   - `systems.js` - Points, Shop, Achievements, PvP all in one file

4. **Events (1/1)** ✅
   - `messageCreate.js` - Auto-detection with cooldowns, corrections, level-ups

5. **Commands (1/8)** 🚧
   - `check.js` ✅ - Manual grammar checking

---

## 📋 REMAINING Work (25%)

### 7 Commands to Create:

#### 1. `/stats` - View Statistics
```javascript
// grammar-bot/commands/stats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const AnalysisEngine = require('../services/analysisEngine');
const config = require('../config.json');

const analysisEngine = new AnalysisEngine();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View grammar statistics')
    .addUserOption(option =>
      option.setName('user').setDescription('View another user\'s stats').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const { User } = getDatabase();

    try {
      const user = await User.findOne({ userId: targetUser.id });
      if (!user) {
        await interaction.editReply({ content: '📭 No stats found for this user.' });
        return;
      }

      const improvement = await analysisEngine.analyzeImprovement(user);
      const errorStats = analysisEngine.getErrorTypeStats(user);

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.username}'s Grammar Stats`)
        .setColor(config.colors.info)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '📈 Level', value: `${user.level}`, inline: true },
          { name: '⭐ Points', value: `${user.points}`, inline: true },
          { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
          { name: '🎯 Accuracy', value: `${improvement.accuracy}% (Grade: ${improvement.grade})`, inline: true },
          { name: '🔥 Streak', value: `${user.streak} days (Best: ${user.bestStreak})`, inline: true },
          { name: '📊 Messages', value: `${user.totalMessages} total, ${user.cleanMessages} clean`, inline: true }
        );

      if (errorStats.length > 0) {
        const errorText = errorStats.map(e => `${e.type}: ${e.count} (${e.percentage}%)`).join('\n');
        embed.addFields({ name: '❌ Common Errors', value: errorText, inline: false });
      }

      embed.addFields({ name: '📈 Trend', value: improvement.improvement, inline: true });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in stats command:', error);
      await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
  }
};
```

#### 2. `/shop` - Browse Shop
```javascript
// grammar-bot/commands/shop.js
const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { ShopSystem } = require('../gamification/systems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the grammar shop'),

  async execute(interaction) {
    await interaction.deferReply();
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const embed = ShopSystem.createShopEmbed(user.points);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in shop command:', error);
      await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
  }
};
```

#### 3. `/buy` - Purchase Items
```javascript
// grammar-bot/commands/buy.js
const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { ShopSystem } = require('../gamification/systems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase a shop item')
    .addStringOption(option =>
      option.setName('item').setDescription('Item ID').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const items = ShopSystem.getShopItems();
    const filtered = items.filter(i =>
      i.name.toLowerCase().includes(focused) || i.id.includes(focused)
    ).slice(0, 25);

    await interaction.respond(filtered.map(i => ({ name: `${i.name} - ${i.cost} pts`, value: i.id })));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const itemId = interaction.options.getString('item');
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const result = await ShopSystem.purchaseItem(user, itemId);

      await interaction.editReply({
        content: `✅ Purchased **${result.item.name}**! Remaining points: ${result.remainingPoints}`
      });
    } catch (error) {
      await interaction.editReply({ content: `❌ ${error.message}` });
    }
  }
};
```

#### 4. `/inventory` - View Inventory
**Similar to Hangman bot's inventory command**

#### 5. `/leaderboard` - View Rankings
**Similar to Hangman bot's leaderboard, but with accuracy/level options**

#### 6. `/pvp` - Grammar Battles
```javascript
// grammar-bot/commands/pvp.js
const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');
const { PvPSystem } = require('../gamification/systems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvp')
    .setDescription('Challenge another user to a grammar battle')
    .addUserOption(option =>
      option.setName('opponent').setDescription('User to challenge').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const opponent = interaction.options.getUser('opponent');

    if (opponent.bot) {
      await interaction.editReply({ content: '❌ Cannot challenge bots!' });
      return;
    }

    if (opponent.id === interaction.user.id) {
      await interaction.editReply({ content: '❌ Cannot challenge yourself!' });
      return;
    }

    const { User } = getDatabase();

    try {
      const challenger = await User.findOrCreate(interaction.user.id, interaction.user.username);
      const opponentUser = await User.findOrCreate(opponent.id, opponent.username);

      const battle = await PvPSystem.createBattle(challenger, opponentUser);

      // Store battle in temporary cache (or database)
      // Implement battle flow with prompts for both users to submit text
      // Compare grammar quality and determine winner

      await interaction.editReply({
        content: `⚔️ ${interaction.user.username} challenged ${opponent.username} to a grammar battle!\n\n` +
                 `Both players, send a message to be checked. Best grammar wins!`
      });

      // TODO: Implement battle completion flow
    } catch (error) {
      console.error('Error in pvp command:', error);
      await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
  }
};
```

#### 7. `/toggle` - Enable/Disable Auto-Check
```javascript
// grammar-bot/commands/toggle.js
const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Toggle automatic grammar checking'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { User } = getDatabase();

    try {
      const user = await User.findOrCreate(interaction.user.id, interaction.user.username);

      user.autoCheckEnabled = !user.autoCheckEnabled;
      await user.save();

      await interaction.editReply({
        content: `✅ Automatic grammar checking ${user.autoCheckEnabled ? 'enabled' : 'disabled'}!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in toggle command:', error);
      await interaction.editReply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  }
};
```

---

## 🔄 Migration Script

Create `grammar-bot/scripts/migrate-from-python.js`:

**Python Data Location:**
`~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/data/gamification.json`

**Fields to Migrate:**
```javascript
// Python → Node.js field mapping
{
  user_id → userId (string)
  username → username
  points → points
  hp → hp
  max_hp → maxHp
  xp → xp
  level → level
  streak → streak
  best_streak → bestStreak
  total_messages → totalMessages
  clean_messages → cleanMessages
  total_errors → totalErrors
  errors_by_type → errorsByType (object)
  quality_bonuses_earned → qualityBonusesEarned
  quality_xp_earned → qualityXpEarned
  quality_history → qualityHistory (array)
  shop_items → shopItems (array, transform structure)
  title → title
  achievements → achievements (array)
  pvp_wins → pvpWins
  pvp_losses → pvpLosses
  auto_check_enabled → autoCheckEnabled
}
```

**Similar to Hangman migration script, but more complex**

---

## 📚 Documentation Needed

### 1. TESTING.md
- Auto-detection testing
- Budget limit testing
- Gamification flow testing
- PvP battle testing
- 25+ test cases

### 2. DEPLOYMENT.md
- Environment variables (OPENAI_API_KEY, DAILY_BUDGET_LIMIT, MONTHLY_BUDGET_LIMIT)
- Budget configuration
- launchd setup
- Monitoring costs

### 3. BUDGET_GUIDE.md
```markdown
# Budget Management Guide

## Default Limits
- Daily: $5.00
- Monthly: $100.00

## Cost Breakdown (gpt-4o-mini)
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Average check: ~$0.0001-0.0005

## Monitoring
- `/check` shows budget in footer
- Auto-disables when limit reached
- Resets daily at midnight

## Optimization
- Increase MIN_MESSAGE_LENGTH to reduce checks
- Use cooldown to limit frequency
- Consider shorter messages
```

---

## 🚀 Quick Completion Checklist

- [x] Database models
- [x] Services (AI, budget, analysis)
- [x] Gamification systems
- [x] Auto-detection event
- [x] `/check` command
- [ ] `/stats` command
- [ ] `/shop` command
- [ ] `/buy` command
- [ ] `/inventory` command
- [ ] `/leaderboard` command
- [ ] `/pvp` command
- [ ] `/toggle` command
- [ ] Migration script
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] BUDGET_GUIDE.md
- [ ] Update main README
- [ ] Test all commands
- [ ] Final commit

---

## 📊 Estimated Time Remaining

- **7 Commands:** ~2 hours (copy/adapt from templates above)
- **Migration Script:** ~1 hour (similar to Hangman)
- **Documentation:** ~1 hour (3 files)
- **Testing:** ~30 minutes
- **Total:** ~4.5 hours

---

## 🎯 Priority Order

1. **Core Commands** (stats, shop, buy, toggle) - Most used
2. **Migration Script** - Preserve user data
3. **Documentation** - Deployment guide
4. **Secondary Commands** (inventory, leaderboard, pvp) - Nice to have

---

**Status:** Grammar bot is 75% complete with all critical systems in place. Remaining work is primarily command implementation following established patterns.
