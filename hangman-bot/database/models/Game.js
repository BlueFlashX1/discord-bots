const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  word: {
    type: String,
    required: true
  },
  wordLowercase: {
    type: String,
    required: true
  },
  // Game state
  state: {
    type: String,
    enum: ['waiting', 'active', 'won', 'lost'],
    default: 'waiting'
  },
  // Players
  starterUserId: {
    type: String,
    required: true
  },
  starterUsername: {
    type: String,
    required: true
  },
  players: [{
    userId: String,
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Game progress
  guessedLetters: [{
    type: String,
    lowercase: true
  }],
  mistakeCount: {
    type: Number,
    default: 0
  },
  maxMistakes: {
    type: Number,
    default: 6
  },
  // Hints
  hintsUsed: {
    type: Number,
    default: 0
  },
  lastHint: {
    type: String,
    default: null
  },
  // Timing
  startedAt: {
    type: Date,
    default: null
  },
  joinDeadline: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Instance method: Add player
gameSchema.methods.addPlayer = async function(userId, username) {
  if (this.state !== 'waiting') {
    throw new Error('Game has already started');
  }

  if (this.players.length >= 4) {
    throw new Error('Game is full (max 4 players)');
  }

  if (this.players.some(p => p.userId === userId)) {
    throw new Error('Already joined this game');
  }

  this.players.push({
    userId,
    username,
    joinedAt: new Date()
  });

  await this.save();

  return this.players.length;
};

// Instance method: Start game
gameSchema.methods.startGame = async function() {
  if (this.state !== 'waiting') {
    throw new Error('Game already started');
  }

  if (this.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }

  this.state = 'active';
  this.startedAt = new Date();

  await this.save();

  return true;
};

// Instance method: Make guess
gameSchema.methods.makeGuess = async function(letter) {
  if (this.state !== 'active') {
    throw new Error('Game is not active');
  }

  letter = letter.toLowerCase();

  if (!/^[a-z]$/.test(letter)) {
    throw new Error('Must be a single letter');
  }

  if (this.guessedLetters.includes(letter)) {
    throw new Error('Letter already guessed');
  }

  this.guessedLetters.push(letter);

  const isCorrect = this.wordLowercase.includes(letter);

  if (!isCorrect) {
    this.mistakeCount += 1;
  }

  // Check win/loss conditions
  if (this.mistakeCount >= this.maxMistakes) {
    this.state = 'lost';
    this.endedAt = new Date();
  } else if (this.isWordRevealed()) {
    this.state = 'won';
    this.endedAt = new Date();
  }

  await this.save();

  return {
    letter,
    isCorrect,
    mistakeCount: this.mistakeCount,
    maxMistakes: this.maxMistakes,
    gameState: this.state,
    display: this.getDisplay()
  };
};

// Instance method: Check if word is fully revealed
gameSchema.methods.isWordRevealed = function() {
  for (const letter of this.wordLowercase) {
    if (!this.guessedLetters.includes(letter)) {
      return false;
    }
  }
  return true;
};

// Instance method: Get display string
gameSchema.methods.getDisplay = function() {
  return this.word
    .split('')
    .map(char => {
      if (char === ' ') return ' ';
      if (!/[a-zA-Z]/.test(char)) return char;
      return this.guessedLetters.includes(char.toLowerCase()) ? char : '_';
    })
    .join(' ');
};

// Instance method: Get hangman visual
gameSchema.methods.getHangmanVisual = function() {
  const stages = [
    // 0 mistakes
    `
     ___
    |   |
    |
    |
    |
    |_____
    `,
    // 1 mistake
    `
     ___
    |   |
    |   O
    |
    |
    |_____
    `,
    // 2 mistakes
    `
     ___
    |   |
    |   O
    |   |
    |
    |_____
    `,
    // 3 mistakes
    `
     ___
    |   |
    |   O
    |  /|
    |
    |_____
    `,
    // 4 mistakes
    `
     ___
    |   |
    |   O
    |  /|\\
    |
    |_____
    `,
    // 5 mistakes
    `
     ___
    |   |
    |   O
    |  /|\\
    |  /
    |_____
    `,
    // 6 mistakes (game over)
    `
     ___
    |   |
    |   O
    |  /|\\
    |  / \\
    |_____
    `
  ];

  return stages[Math.min(this.mistakeCount, 6)];
};

// Instance method: Calculate points
gameSchema.methods.calculatePoints = function() {
  if (this.state !== 'won') return 0;

  const basePoints = 100;
  const letterBonus = this.word.length * 10;
  const mistakePenalty = this.mistakeCount * 15;

  return Math.max(0, basePoints + letterBonus - mistakePenalty);
};

// Instance method: End game (forced)
gameSchema.methods.endGame = async function(reason = 'cancelled') {
  this.state = 'lost';
  this.endedAt = new Date();
  await this.save();
  return true;
};

// Static method: Create new game
gameSchema.statics.createGame = async function(channelId, word, starterUserId, starterUsername) {
  // Check for existing game in channel
  const existing = await this.findOne({ channelId, state: { $in: ['waiting', 'active'] } });
  if (existing) {
    throw new Error('A game is already active in this channel');
  }

  const game = await this.create({
    channelId,
    word,
    wordLowercase: word.toLowerCase(),
    starterUserId,
    starterUsername,
    players: [{
      userId: starterUserId,
      username: starterUsername,
      joinedAt: new Date()
    }],
    state: 'waiting',
    guessedLetters: [],
    mistakeCount: 0,
    maxMistakes: 6,
    hintsUsed: 0,
    joinDeadline: new Date(Date.now() + 60000) // 1 minute to join
  });

  return game;
};

// Static method: Find active game in channel
gameSchema.statics.findActiveGame = async function(channelId) {
  return this.findOne({
    channelId,
    state: { $in: ['waiting', 'active'] }
  });
};

// Static method: Cleanup old games
gameSchema.statics.cleanupOldGames = async function(olderThanHours = 24) {
  const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));

  const result = await this.deleteMany({
    createdAt: { $lt: cutoff },
    state: { $in: ['won', 'lost'] }
  });

  return result.deletedCount;
};

// Virtual: Time elapsed
gameSchema.virtual('timeElapsed').get(function() {
  if (!this.startedAt) return 0;
  const end = this.endedAt || new Date();
  return Math.floor((end - this.startedAt) / 1000);
});

// Ensure virtuals are included in JSON
gameSchema.set('toJSON', { virtuals: true });
gameSchema.set('toObject', { virtuals: true });

// JSON-file based storage (fallback)
class GameJSON {
  constructor(dataPath) {
    this.dataPath = dataPath || './data/games.json';
    this.games = this.loadData();
  }

  loadData() {
    const fs = require('fs');

    try {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading games data:', error);
    }

    return {};
  }

  saveData() {
    const fs = require('fs');
    const path = require('path');

    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.games, null, 2));
    } catch (error) {
      console.error('Error saving games data:', error);
    }
  }

  async createGame(channelId, word, starterUserId, starterUsername) {
    // Check for existing game
    const existing = this.findActiveGame(channelId);
    if (existing) {
      throw new Error('A game is already active in this channel');
    }

    this.games[channelId] = {
      channelId,
      word,
      wordLowercase: word.toLowerCase(),
      starterUserId,
      starterUsername,
      players: [{
        userId: starterUserId,
        username: starterUsername,
        joinedAt: new Date().toISOString()
      }],
      state: 'waiting',
      guessedLetters: [],
      mistakeCount: 0,
      maxMistakes: 6,
      hintsUsed: 0,
      joinDeadline: new Date(Date.now() + 60000).toISOString(),
      createdAt: new Date().toISOString()
    };

    this.saveData();
    return this.games[channelId];
  }

  findActiveGame(channelId) {
    const game = this.games[channelId];
    if (game && (game.state === 'waiting' || game.state === 'active')) {
      return game;
    }
    return null;
  }

  async findOne(query) {
    if (query.channelId) {
      return this.findActiveGame(query.channelId);
    }
    return null;
  }

  async deleteOne(query) {
    if (query.channelId && this.games[query.channelId]) {
      delete this.games[query.channelId];
      this.saveData();
      return true;
    }
    return false;
  }
}

module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);
module.exports.GameJSON = GameJSON;
