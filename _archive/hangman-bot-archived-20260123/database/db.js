const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

  if (mongoUri && mongoUri !== 'undefined' && mongoUri.trim() !== '') {
    try {
      // Set connection options for better error handling
      const options = {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      };

      await mongoose.connect(mongoUri, options);
      console.log('✅ Connected to MongoDB');
      connected = true;
      useJSON = false;

      // Set up connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        // Don't switch to JSON on runtime errors, just log
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected - will attempt to reconnect');
      });

      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB reconnected');
        connected = true;
        useJSON = false;
      });

      // Verify connection is actually working
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB connection verified');

      return 'mongodb';
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed, falling back to JSON storage');
      console.error('Error:', error.message);
      useJSON = true;
      initJSONStorage();
      return 'json';
    }
  } else {
    console.log('ℹ️ No MongoDB URI configured, using JSON storage');
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

  console.log('✅ JSON storage initialized');
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
        createdAt: new Date().toISOString()
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
  }
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
      createdAt: new Date().toISOString()
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
  }
};

/**
 * Check if using JSON storage
 */
function isUsingJSON() {
  return useJSON;
}

/**
 * Get database models (MongoDB) or JSON fallbacks
 */
function getDatabase() {
  if (isUsingJSON()) {
    // Return JSON-based models
    return {
      ShopItem: JSONPlayer, // Using JSONPlayer as fallback for ShopItem operations
      Player: JSONPlayer,
      Session: JSONSession
    };
  } else {
    // Return MongoDB models
    try {
      return {
        ShopItem: require('./models/ShopItem'),
        Player: require('./models/Player'),
        Session: require('./models/Session')
      };
    } catch (error) {
      // If models don't exist, fall back to JSON
      console.warn('MongoDB models not found, falling back to JSON storage');
      return {
        ShopItem: JSONPlayer,
        Player: JSONPlayer,
        Session: JSONSession
      };
    }
  }
}

module.exports = {
  connectDatabase,
  isUsingJSON,
  JSONPlayer,
  JSONSession,
  getDatabase
};
