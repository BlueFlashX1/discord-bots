#!/usr/bin/env node

/**
 * Hangman Bot - Python to Node.js Data Migration Script
 *
 * Migrates player statistics from Python JSON files to Node.js database
 * (MongoDB or JSON fallback)
 *
 * Usage:
 *   node migrate-from-python.js [options]
 *
 * Options:
 *   --dry-run     Preview changes without writing
 *   --yes         Skip confirmation prompts
 *   --verbose     Show detailed output
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Database setup
const { connectDatabase, getDatabase } = require('../database/db');

// Configuration
const PYTHON_DATA_PATH = path.join(
  process.env.HOME,
  'Documents/DEVELOPMENT/Python-projects/active/discord-bots/bots/hangman-bot/data/player_stats.json'
);

const BACKUP_DIR = path.join(__dirname, '../backups');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const autoConfirm = args.includes('--yes');
const verbose = args.includes('--verbose');

// Stats tracking
const stats = {
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0
};

/**
 * Main migration function
 */
async function migrate() {
  console.log('🎮 Hangman Bot - Data Migration');
  console.log('================================\n');

  try {
    // 1. Load Python data
    console.log('📂 Loading Python data...');
    const pythonData = loadPythonData();

    if (!pythonData || !pythonData.players) {
      console.error('❌ No player data found in Python file');
      process.exit(1);
    }

    const playerIds = Object.keys(pythonData.players);
    stats.total = playerIds.length;

    console.log(`✅ Found ${stats.total} player(s) to migrate\n`);

    // Show sample data
    if (playerIds.length > 0) {
      const sampleId = playerIds[0];
      const sample = pythonData.players[sampleId];
      console.log('📊 Sample player data:');
      console.log(JSON.stringify(sample, null, 2));
      console.log();
    }

    // 2. Create backup
    if (!isDryRun) {
      console.log('💾 Creating backup...');
      createBackup(pythonData);
      console.log('✅ Backup created\n');
    }

    // 3. Confirm migration
    if (!autoConfirm && !isDryRun) {
      const confirmed = await confirm(
        `Migrate ${stats.total} player(s) to Node.js database?`
      );

      if (!confirmed) {
        console.log('❌ Migration cancelled');
        process.exit(0);
      }
    }

    // 4. Connect to database
    console.log('🔌 Connecting to database...');
    const dbType = await connectDatabase();
    console.log(`✅ Connected to ${dbType}\n`);

    const { Player } = getDatabase();

    // 5. Migrate each player
    console.log('🚀 Starting migration...\n');

    for (const userId of playerIds) {
      const pythonPlayer = pythonData.players[userId];

      try {
        await migratePlayer(Player, userId, pythonPlayer);
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error migrating player ${userId}:`, error.message);

        if (verbose) {
          console.error(error);
        }
      }
    }

    // 6. Show summary
    console.log('\n📊 Migration Summary');
    console.log('====================');
    console.log(`Total players: ${stats.total}`);
    console.log(`✅ Created: ${stats.created}`);
    console.log(`🔄 Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made');
    } else {
      console.log('\n✅ Migration completed!');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Load Python JSON data
 */
function loadPythonData() {
  try {
    if (!fs.existsSync(PYTHON_DATA_PATH)) {
      console.error(`❌ Python data file not found: ${PYTHON_DATA_PATH}`);
      return null;
    }

    const raw = fs.readFileSync(PYTHON_DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Error loading Python data:', error.message);
    return null;
  }
}

/**
 * Create backup of Python data
 */
function createBackup(data) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `player_stats_${timestamp}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    console.log(`📁 Backup saved: ${backupPath}`);
  } catch (error) {
    console.error('⚠️  Backup failed:', error.message);
  }
}

/**
 * Migrate a single player
 */
async function migratePlayer(Player, userId, pythonPlayer) {
  if (verbose) {
    console.log(`\n📝 Migrating player: ${pythonPlayer.username} (${userId})`);
  }

  // Transform Python data to Node.js format
  const nodeData = {
    userId: String(userId),
    username: pythonPlayer.username || `User${userId}`,
    weeklyPoints: pythonPlayer.weekly_points || 0,
    totalPoints: pythonPlayer.total_points || 0,
    gamesPlayed: pythonPlayer.games_played || 0,
    gamesWon: pythonPlayer.games_won || 0,
    lettersGuessed: 0, // Not tracked in Python version
    correctGuesses: 0, // Not tracked in Python version
    shopItems: transformShopItems(pythonPlayer.shop_items || []),
    activePrefix: transformPrefix(pythonPlayer.prefix),
    activeTheme: pythonPlayer.theme === 'default' ? null : pythonPlayer.theme,
    lastWeeklyReset: pythonPlayer.last_reset
      ? new Date(pythonPlayer.last_reset)
      : getLastMonday(new Date()),
    createdAt: pythonPlayer.joined_at
      ? new Date(pythonPlayer.joined_at)
      : new Date(),
    lastActive: pythonPlayer.last_game
      ? new Date(pythonPlayer.last_game)
      : new Date()
  };

  if (verbose) {
    console.log('  Python data:', JSON.stringify(pythonPlayer, null, 2));
    console.log('  Node data:', JSON.stringify(nodeData, null, 2));
  }

  if (isDryRun) {
    console.log(`✓ [DRY RUN] Would migrate: ${nodeData.username}`);
    stats.created++;
    return;
  }

  // Check if player exists
  let existing;

  if (Player.findOne) {
    // MongoDB
    existing = await Player.findOne({ userId: nodeData.userId });
  } else if (Player.players) {
    // JSON mode
    existing = Player.players[nodeData.userId];
  }

  if (existing) {
    // Update existing player
    if (Player.updateOne) {
      // MongoDB
      await Player.updateOne({ userId: nodeData.userId }, nodeData);
    } else if (Player.players) {
      // JSON mode
      Player.players[nodeData.userId] = { ...Player.players[nodeData.userId], ...nodeData };
      Player.saveData();
    }

    stats.updated++;
    console.log(`🔄 Updated: ${nodeData.username}`);
  } else {
    // Create new player
    if (Player.create) {
      // MongoDB
      await Player.create(nodeData);
    } else if (Player.players) {
      // JSON mode
      Player.players[nodeData.userId] = nodeData;
      Player.saveData();
    }

    stats.created++;
    console.log(`✅ Created: ${nodeData.username}`);
  }
}

/**
 * Transform shop items from Python format
 */
function transformShopItems(pythonItems) {
  if (!Array.isArray(pythonItems)) return [];

  return pythonItems.map(item => {
    if (typeof item === 'string') {
      // Old format: just item ID
      return {
        itemId: item,
        name: item,
        purchasedAt: new Date()
      };
    } else if (typeof item === 'object') {
      // New format: full object
      return {
        itemId: item.item_id || item.itemId,
        name: item.name || item.item_id,
        purchasedAt: item.purchased_at ? new Date(item.purchased_at) : new Date()
      };
    }

    return null;
  }).filter(Boolean);
}

/**
 * Transform prefix emoji to item ID
 */
function transformPrefix(pythonPrefix) {
  if (!pythonPrefix || pythonPrefix === '🎮') return null;

  const prefixMap = {
    '🔥': 'fire_prefix',
    '⭐': 'star_prefix',
    '👑': 'crown_prefix'
  };

  return prefixMap[pythonPrefix] || null;
}

/**
 * Get last Monday 00:00
 */
function getLastMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Prompt user for confirmation
 */
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Run migration
migrate();
