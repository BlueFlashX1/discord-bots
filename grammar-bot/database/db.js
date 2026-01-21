const fs = require('fs');
const path = require('path');

let mongoose = null;
let connected = false;
let useJSON = false;

// JSON file storage paths
const DATA_DIR = path.join(__dirname, '../data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

/**
 * Connect to MongoDB or fallback to JSON storage
 */
async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (
    mongoUri &&
    mongoUri !== 'undefined' &&
    mongoUri !== 'mongodb://localhost:27017/grammar_bot'
  ) {
    try {
      // Lazy load mongoose only when needed
      if (!mongoose) {
        mongoose = require('mongoose');
      }

      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      connected = true;
      useJSON = false;

      // Set up connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });

      return 'mongodb';
    } catch (error) {
      console.warn('MongoDB connection failed, falling back to JSON storage');
      console.error('Error:', error.message);
      useJSON = true;
      initJSONStorage();
      return 'json';
    }
  } else {
    console.log('No MongoDB URI configured, using JSON storage');
    useJSON = true;
    initJSONStorage();
    return 'json';
  }
}

/**
 * Initialize JSON file storage
 */
function initJSONStorage() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Initialize JSON files if they don't exist
  if (!fs.existsSync(PLAYERS_FILE)) {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));
  }

  console.log('JSON storage initialized');
}

/**
 * Read JSON file
 */
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return {};
  }
}

/**
 * Write JSON file
 */
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

/**
 * JSON-based Player operations (fallback)
 */
const JSONPlayer = {
  async getOrCreate(userId, username) {
    const players = readJSON(PLAYERS_FILE);

    if (!players[userId]) {
      players[userId] = {
        userId,
        username,
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        bestScore: 0,
        totalWordsFound: 0,
        averageWordsPerGame: 0,
        longestWord: '',
        lastPlayed: null,
        createdAt: new Date().toISOString(),
      };
      writeJSON(PLAYERS_FILE, players);
    } else if (players[userId].username !== username) {
      players[userId].username = username;
      writeJSON(PLAYERS_FILE, players);
    }

    return players[userId];
  },

  async findOne(query) {
    const players = readJSON(PLAYERS_FILE);
    return players[query.userId] || null;
  },

  async find(query = {}) {
    const players = readJSON(PLAYERS_FILE);
    return Object.values(players);
  },

  async updateOne(userId, data) {
    const players = readJSON(PLAYERS_FILE);
    if (players[userId]) {
      players[userId] = { ...players[userId], ...data };
      writeJSON(PLAYERS_FILE, players);
    }
  },
};

/**
 * JSON-based Session operations (fallback)
 */
const JSONSession = {
  async create(sessionData) {
    const sessions = readJSON(SESSIONS_FILE);
    const sessionId = Date.now().toString();

    sessions[sessionId] = {
      ...sessionData,
      _id: sessionId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    writeJSON(SESSIONS_FILE, sessions);
    return sessions[sessionId];
  },

  async getActiveSession(channelId) {
    const sessions = readJSON(SESSIONS_FILE);

    for (const session of Object.values(sessions)) {
      if (session.channelId === channelId && session.active) {
        return session;
      }
    }

    return null;
  },

  async updateOne(sessionId, data) {
    const sessions = readJSON(SESSIONS_FILE);
    if (sessions[sessionId]) {
      sessions[sessionId] = { ...sessions[sessionId], ...data };
      writeJSON(SESSIONS_FILE, sessions);
    }
  },

  async cleanupExpired() {
    const sessions = readJSON(SESSIONS_FILE);
    const cutoff = Date.now() - 3600000; // 1 hour ago

    for (const [id, session] of Object.entries(sessions)) {
      if (session.active && new Date(session.startTime).getTime() < cutoff) {
        sessions[id].active = false;
        sessions[id].endTime = new Date().toISOString();
      }
    }

    writeJSON(SESSIONS_FILE, sessions);
  },
};

/**
 * Check if using JSON storage
 */
function isUsingJSON() {
  return useJSON;
}

/**
 * Get database models (MongoDB or JSON fallback)
 * Must be called after connectDatabase()
 */
function getDatabase() {
  if (useJSON) {
    // Return JSON-based User model
    const User = {
      async findOrCreate(userId, username) {
        const players = readJSON(PLAYERS_FILE);
        if (!players[userId]) {
          players[userId] = {
            userId,
            username,
            points: 100,
            hp: 100,
            maxHp: 100,
            xp: 0,
            level: 1,
            accuracy: 0,
            streak: 0,
            bestStreak: 0,
            totalMessages: 0,
            cleanMessages: 0,
            totalErrors: 0,
            errorsByType: {},
            qualityBonusesEarned: 0,
            qualityHistory: [],
            pvpWins: 0,
            pvpLosses: 0,
            pvpDraws: 0,
            inventory: [],
            achievements: [],
            autoCheckEnabled: true,
            createdAt: new Date().toISOString(),
            save: async function () {
              const players = readJSON(PLAYERS_FILE);
              players[this.userId] = this;
              writeJSON(PLAYERS_FILE, players);
            },
            addMessageResult: async function (hasErrors, errorCount, errorTypes = []) {
              this.totalMessages = (this.totalMessages || 0) + 1;
              if (!hasErrors) {
                this.cleanMessages = (this.cleanMessages || 0) + 1;
              }
              if (hasErrors) {
                this.totalErrors = (this.totalErrors || 0) + errorCount;
                this.streak = 0;
                errorTypes.forEach((type) => {
                  if (!this.errorsByType) this.errorsByType = {};
                  this.errorsByType[type] = (this.errorsByType[type] || 0) + 1;
                });
              } else {
                this.streak = (this.streak || 0) + 1;
                if (this.streak > (this.bestStreak || 0)) {
                  this.bestStreak = this.streak;
                }
              }
              await this.save();
            },
            awardQualityBonus: async function (messageLength) {
              const bonus = Math.min(Math.floor(messageLength / 10), 20);
              const bonusXp = Math.floor(bonus / 2);
              this.points = (this.points || 100) + bonus;
              this.xp = (this.xp || 0) + bonusXp;
              this.qualityBonusesEarned = (this.qualityBonusesEarned || 0) + 1;
              if (!this.qualityHistory) this.qualityHistory = [];
              this.qualityHistory.push({
                bonusPoints: bonus,
                bonusXp: bonusXp,
                timestamp: new Date().toISOString(),
              });
              if (this.qualityHistory.length > 100) {
                this.qualityHistory = this.qualityHistory.slice(-100);
              }
              const oldLevel = this.level || 1;
              const newLevel = Math.floor(1 + Math.sqrt((this.xp || 0) / 100));
              if (newLevel > oldLevel) {
                this.level = newLevel;
                this.maxHp = (this.maxHp || 100) + 10;
                this.hp = this.maxHp;
                this.points = (this.points || 100) + 50;
                await this.save();
                return { bonusPoints: bonus, bonusXp: bonusXp, newLevel, leveledUp: true };
              }
              await this.save();
              return { bonusPoints: bonus, bonusXp: bonusXp, newLevel: oldLevel, leveledUp: false };
            },
            checkLevelUp: async function () {
              const newLevel = Math.floor(1 + Math.sqrt((this.xp || 0) / 100));
              if (newLevel > (this.level || 1)) {
                const oldLevel = this.level || 1;
                this.level = newLevel;
                this.points = (this.points || 100) + 50;
                this.maxHp = (this.maxHp || 100) + 10;
                this.hp = this.maxHp;
                await this.save();
                return { leveledUp: true, oldLevel, newLevel };
              }
              return { leveledUp: false };
            },
            recordPvpResult: async function (result) {
              if (result === 'win') {
                this.pvpWins += 1;
                this.points += 50;
                this.xp += 25;
              } else if (result === 'loss') {
                this.pvpLosses += 1;
              } else if (result === 'draw') {
                this.pvpDraws += 1;
                this.points += 10;
              }
              await this.save();
            },
          };
          writeJSON(PLAYERS_FILE, players);
        } else if (players[userId].username !== username) {
          players[userId].username = username;
          writeJSON(PLAYERS_FILE, players);
        }
        const user = players[userId];
        // Initialize missing fields for existing users
        if (user.totalMessages === undefined) user.totalMessages = 0;
        if (user.cleanMessages === undefined) user.cleanMessages = 0;
        if (user.totalErrors === undefined) user.totalErrors = 0;
        if (!user.errorsByType) user.errorsByType = {};
        if (user.qualityBonusesEarned === undefined) user.qualityBonusesEarned = 0;
        if (!user.qualityHistory) user.qualityHistory = [];
        if (user.autoCheckEnabled === undefined) user.autoCheckEnabled = true;

        // Add save method if missing
        if (!user.save) {
          user.save = async function () {
            const players = readJSON(PLAYERS_FILE);
            players[this.userId] = this;
            writeJSON(PLAYERS_FILE, players);
          };
        }
        // Add addMessageResult method if missing
        if (!user.addMessageResult) {
          user.addMessageResult = async function (hasErrors, errorCount, errorTypes = []) {
            this.totalMessages = (this.totalMessages || 0) + 1;
            if (!hasErrors) {
              this.cleanMessages = (this.cleanMessages || 0) + 1;
            }
            if (hasErrors) {
              this.totalErrors = (this.totalErrors || 0) + errorCount;
              this.streak = 0;
              errorTypes.forEach((type) => {
                if (!this.errorsByType) this.errorsByType = {};
                this.errorsByType[type] = (this.errorsByType[type] || 0) + 1;
              });
            } else {
              this.streak = (this.streak || 0) + 1;
              if (this.streak > (this.bestStreak || 0)) {
                this.bestStreak = this.streak;
              }
            }
            await this.save();
          };
        }
        // Add awardQualityBonus method if missing
        if (!user.awardQualityBonus) {
          user.awardQualityBonus = async function (messageLength) {
            const bonus = Math.min(Math.floor(messageLength / 10), 20);
            const bonusXp = Math.floor(bonus / 2);
            this.points = (this.points || 100) + bonus;
            this.xp = (this.xp || 0) + bonusXp;
            this.qualityBonusesEarned = (this.qualityBonusesEarned || 0) + 1;
            if (!this.qualityHistory) this.qualityHistory = [];
            this.qualityHistory.push({
              bonusPoints: bonus,
              bonusXp: bonusXp,
              timestamp: new Date().toISOString(),
            });
            if (this.qualityHistory.length > 100) {
              this.qualityHistory = this.qualityHistory.slice(-100);
            }
            const oldLevel = this.level || 1;
            const newLevel = Math.floor(1 + Math.sqrt((this.xp || 0) / 100));
            if (newLevel > oldLevel) {
              this.level = newLevel;
              this.maxHp = (this.maxHp || 100) + 10;
              this.hp = this.maxHp;
              this.points = (this.points || 100) + 50;
              await this.save();
              return { bonusPoints: bonus, bonusXp: bonusXp, newLevel, leveledUp: true };
            }
            await this.save();
            return { bonusPoints: bonus, bonusXp: bonusXp, newLevel: oldLevel, leveledUp: false };
          };
        }
        // Add checkLevelUp method if missing
        if (!user.checkLevelUp) {
          user.checkLevelUp = async function () {
            const newLevel = Math.floor(1 + Math.sqrt((this.xp || 0) / 100));
            if (newLevel > (this.level || 1)) {
              const oldLevel = this.level || 1;
              this.level = newLevel;
              this.points = (this.points || 100) + 50;
              this.maxHp = (this.maxHp || 100) + 10;
              this.hp = this.maxHp;
              await this.save();
              return { leveledUp: true, oldLevel, newLevel };
            }
            return { leveledUp: false };
          };
        }
        // Add purchaseItem method if missing
        if (!user.purchaseItem) {
          user.purchaseItem = async function (itemId, itemName, cost) {
            if ((this.points || 100) < cost) {
              throw new Error('Insufficient points');
            }
            this.points = (this.points || 100) - cost;
            if (!this.inventory) this.inventory = [];
            if (!this.shopItems) this.shopItems = [];
            const itemData = { itemId, itemName, purchasedAt: new Date().toISOString() };
            this.inventory.push(itemData);
            this.shopItems.push(itemData);
            await this.save();
            return { remainingPoints: this.points, item: { id: itemId, name: itemName } };
          };
        }
        // Add unlockAchievement method if missing
        if (!user.unlockAchievement) {
          user.unlockAchievement = async function (achievementId, achievementName) {
            if (!this.achievements) this.achievements = [];
            if (
              this.achievements.some((a) => {
                const achId = typeof a === 'string' ? a : a.achievementId;
                return achId === achievementId;
              })
            ) {
              return false;
            }
            this.achievements.push({
              achievementId,
              achievementName,
              unlockedAt: new Date().toISOString(),
            });
            this.points = (this.points || 100) + 100;
            this.xp = (this.xp || 0) + 50;
            await this.checkLevelUp();
            await this.save();
            return true;
          };
        }
        // Initialize shopItems if missing
        if (!user.shopItems) {
          user.shopItems = user.inventory || [];
        }
        if (!user.recordPvpResult) {
          user.recordPvpResult = async function (result) {
            if (result === 'win') {
              this.pvpWins = (this.pvpWins || 0) + 1;
              this.points = (this.points || 100) + 50;
              this.xp = (this.xp || 0) + 25;
            } else if (result === 'loss') {
              this.pvpLosses = (this.pvpLosses || 0) + 1;
            } else if (result === 'draw') {
              this.pvpDraws = (this.pvpDraws || 0) + 1;
              this.points = (this.points || 100) + 10;
            }
            await this.save();
          };
        }
        return user;
      },
      async find() {
        return Object.values(readJSON(PLAYERS_FILE));
      },
      async findOne(query) {
        const players = readJSON(PLAYERS_FILE);
        return players[query.userId] || null;
      },
    };
    return { User };
  } else {
    // Return MongoDB models (lazy load to avoid mongoose error)
    try {
      const User = require('./models/User');
      return { User };
    } catch (error) {
      console.error('Error loading MongoDB models:', error);
      // Fallback to JSON
      useJSON = true;
      initJSONStorage();
      return getDatabase();
    }
  }
}

module.exports = {
  connectDatabase,
  isUsingJSON,
  getDatabase,
  JSONPlayer,
  JSONSession,
};
