#!/usr/bin/env node

/**
 * Migration script from Python Grammar Bot to Node.js Grammar Bot
 *
 * Usage:
 *   node scripts/migrate-from-python.js [path-to-gamification.json]
 *
 * Default path:
 *   ~/Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/data/gamification.json
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');

const DEFAULT_PYTHON_DATA = path.join(
  process.env.HOME,
  'Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/grammar-teacher-bot/data/gamification.json'
);

class GrammarMigration {
  constructor(pythonDataPath) {
    this.pythonDataPath = pythonDataPath || DEFAULT_PYTHON_DATA;
    this.stats = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0
    };
  }

  async migrate() {
    console.log('🔄 Starting Grammar Bot Migration from Python to Node.js\n');
    console.log(`📂 Reading from: ${this.pythonDataPath}\n`);

    // Check if file exists
    if (!fs.existsSync(this.pythonDataPath)) {
      throw new Error(`Python data file not found at: ${this.pythonDataPath}`);
    }

    // Read Python data
    const pythonData = JSON.parse(fs.readFileSync(this.pythonDataPath, 'utf8'));
    this.stats.total = Object.keys(pythonData).length;
    console.log(`📊 Found ${this.stats.total} users to migrate\n`);

    // Connect to database
    const { User } = getDatabase();

    // Migrate each user
    for (const [userId, userData] of Object.entries(pythonData)) {
      try {
        await this.migrateUser(User, userId, userData);
        this.stats.migrated++;
        console.log(`✅ Migrated user ${userData.username || userId} (${this.stats.migrated}/${this.stats.total})`);
      } catch (error) {
        this.stats.errors++;
        console.error(`❌ Error migrating user ${userId}: ${error.message}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total users: ${this.stats.total}`);
    console.log(`  ✅ Migrated: ${this.stats.migrated}`);
    console.log(`  ⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`  ❌ Errors: ${this.stats.errors}`);
    console.log('\n✨ Migration complete!\n');
  }

  async migrateUser(User, userId, pythonUser) {
    // Check if user already exists
    const existingUser = await User.findOne({ userId: userId.toString() });
    if (existingUser) {
      this.stats.skipped++;
      console.log(`⏭️  Skipped existing user ${pythonUser.username || userId}`);
      return;
    }

    // Map Python data to Node.js schema
    const nodeUser = new User({
      userId: userId.toString(),
      username: pythonUser.username || 'Unknown',

      // Gamification stats
      points: pythonUser.points || 0,
      xp: pythonUser.xp || 0,
      level: pythonUser.level || 1,
      hp: pythonUser.hp || 100,
      maxHp: pythonUser.max_hp || 100,

      // Streaks
      streak: pythonUser.streak || 0,
      bestStreak: pythonUser.best_streak || pythonUser.streak || 0,
      lastMessageDate: pythonUser.last_message_date ? new Date(pythonUser.last_message_date) : null,

      // Message stats
      totalMessages: pythonUser.total_messages || 0,
      cleanMessages: pythonUser.clean_messages || 0,
      totalErrors: pythonUser.total_errors || 0,
      errorsByType: pythonUser.errors_by_type || {},

      // Quality tracking
      qualityBonusesEarned: pythonUser.quality_bonuses_earned || 0,
      qualityXpEarned: pythonUser.quality_xp_earned || 0,
      qualityHistory: (pythonUser.quality_history || []).map(q => ({
        accuracy: q.accuracy,
        date: new Date(q.date)
      })),

      // Shop items
      shopItems: this.migrateShopItems(pythonUser.shop_items || []),
      title: pythonUser.title || null,

      // Achievements
      achievements: pythonUser.achievements || [],

      // PvP
      pvpWins: pythonUser.pvp_wins || 0,
      pvpLosses: pythonUser.pvp_losses || 0,

      // Settings
      autoCheckEnabled: pythonUser.auto_check_enabled !== false, // Default true

      // Timestamps
      createdAt: pythonUser.created_at ? new Date(pythonUser.created_at) : new Date(),
      updatedAt: new Date()
    });

    await nodeUser.save();
  }

  migrateShopItems(pythonItems) {
    if (!Array.isArray(pythonItems)) return [];

    return pythonItems.map(item => {
      // Python items might have different structure
      if (typeof item === 'string') {
        // Legacy format: just item names
        return {
          id: item.toLowerCase().replace(/\s+/g, '_'),
          name: item,
          type: 'cosmetic',
          cost: 0,
          description: 'Migrated item',
          purchasedAt: new Date()
        };
      }

      // Modern format: full item objects
      return {
        id: item.id || item.name.toLowerCase().replace(/\s+/g, '_'),
        name: item.name || 'Unknown Item',
        type: item.type || 'cosmetic',
        cost: item.cost || 0,
        description: item.description || 'Migrated item',
        purchasedAt: item.purchased_at ? new Date(item.purchased_at) : new Date()
      };
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const pythonDataPath = args[0];

  try {
    // Connect to MongoDB
    const dbPath = process.env.MONGODB_URI || 'mongodb://localhost:27017/grammar_bot';
    await mongoose.connect(dbPath);
    console.log('✅ Connected to MongoDB\n');

    // Run migration
    const migration = new GrammarMigration(pythonDataPath);
    await migration.migrate();

    // Disconnect
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { GrammarMigration };
