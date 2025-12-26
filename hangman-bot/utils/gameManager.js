const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

class GameManager {
  constructor(Game, Player) {
    this.Game = Game;
    this.Player = Player;
  }

  /**
   * Create a new game
   */
  async createGame(channelId, word, starterUserId, starterUsername) {
    // Validate word
    if (!word || word.trim().length === 0) {
      throw new Error('Word cannot be empty');
    }

    if (!/^[a-zA-Z\s]+$/.test(word)) {
      throw new Error('Word can only contain letters and spaces');
    }

    if (word.length < 3) {
      throw new Error('Word must be at least 3 characters long');
    }

    if (word.length > 30) {
      throw new Error('Word must be 30 characters or less');
    }

    // Create game using model
    const game = await this.Game.createGame(channelId, word, starterUserId, starterUsername);

    return game;
  }

  /**
   * Get or create player
   */
  async getPlayer(userId, username) {
    return await this.Player.findOrCreate(userId, username);
  }

  /**
   * Join existing game
   */
  async joinGame(channelId, userId, username) {
    const game = await this.Game.findActiveGame(channelId);

    if (!game) {
      throw new Error('No active game in this channel');
    }

    if (game.state !== 'waiting') {
      throw new Error('Game has already started');
    }

    // Check deadline
    if (game.joinDeadline && new Date() > new Date(game.joinDeadline)) {
      throw new Error('Join period has ended');
    }

    const playerCount = await game.addPlayer(userId, username);

    return { game, playerCount };
  }

  /**
   * Start a game
   */
  async startGame(channelId, userId) {
    const game = await this.Game.findActiveGame(channelId);

    if (!game) {
      throw new Error('No active game in this channel');
    }

    // Only starter can begin the game
    if (game.starterUserId !== userId) {
      throw new Error('Only the game starter can begin the game');
    }

    await game.startGame();

    return game;
  }

  /**
   * Make a guess
   */
  async makeGuess(channelId, userId, username, letter) {
    const game = await this.Game.findActiveGame(channelId);

    if (!game) {
      throw new Error('No active game in this channel');
    }

    if (game.state !== 'active') {
      throw new Error('Game is not active');
    }

    // Check if user is a player
    if (!game.players.some(p => p.userId === userId)) {
      throw new Error('You are not in this game');
    }

    const result = await game.makeGuess(letter);

    // If game ended, update player stats
    if (game.state === 'won' || game.state === 'lost') {
      await this.updatePlayerStats(game);
    }

    return { game, ...result };
  }

  /**
   * End a game (forced by starter)
   */
  async endGame(channelId, userId) {
    const game = await this.Game.findActiveGame(channelId);

    if (!game) {
      throw new Error('No active game in this channel');
    }

    // Only starter can end the game
    if (game.starterUserId !== userId) {
      throw new Error('Only the game starter can end the game');
    }

    await game.endGame('cancelled');

    return game;
  }

  /**
   * Update player statistics after game ends
   */
  async updatePlayerStats(game) {
    if (game.state === 'won') {
      const points = game.calculatePoints();
      const pointsPerPlayer = Math.floor(points / game.players.length);

      for (const playerData of game.players) {
        const player = await this.Player.findOrCreate(playerData.userId, playerData.username);

        await player.addGameResult(
          true, // won
          pointsPerPlayer,
          game.guessedLetters.length,
          game.guessedLetters.filter(l => game.wordLowercase.includes(l)).length
        );
      }
    } else if (game.state === 'lost') {
      for (const playerData of game.players) {
        const player = await this.Player.findOrCreate(playerData.userId, playerData.username);

        await player.addGameResult(
          false, // lost
          0, // no points
          game.guessedLetters.length,
          game.guessedLetters.filter(l => game.wordLowercase.includes(l)).length
        );
      }
    }
  }

  /**
   * Get active games list
   */
  async getActiveGames() {
    // This depends on database type
    if (this.Game.find) {
      return await this.Game.find({
        state: { $in: ['waiting', 'active'] }
      }).sort({ createdAt: -1 });
    }

    return [];
  }

  /**
   * Create game embed
   */
  createGameEmbed(game, title = '🎮 Hangman Game') {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(config.colors.game);

    // Word display
    const display = game.getDisplay ? game.getDisplay() : this.getDisplayFromGame(game);
    embed.addFields({
      name: '📝 Word',
      value: `\`\`\`${display}\`\`\``,
      inline: false
    });

    // Hangman visual
    const visual = game.getHangmanVisual ? game.getHangmanVisual() : this.getHangmanVisual(game.mistakeCount);
    embed.addFields({
      name: '🎭 Hangman',
      value: `\`\`\`${visual}\`\`\``,
      inline: false
    });

    // Guessed letters
    if (game.guessedLetters && game.guessedLetters.length > 0) {
      const guessed = game.guessedLetters.join(', ').toUpperCase();
      embed.addFields({
        name: '🔤 Guessed Letters',
        value: guessed,
        inline: false
      });
    }

    // Mistakes
    embed.addFields({
      name: '❌ Mistakes',
      value: `${game.mistakeCount}/${game.maxMistakes}`,
      inline: true
    });

    // Players
    if (game.players && game.players.length > 0) {
      const playerList = game.players.map(p => p.username).join(', ');
      embed.addFields({
        name: '👥 Players',
        value: playerList,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Create waiting room embed
   */
  createWaitingEmbed(game) {
    const embed = new EmbedBuilder()
      .setTitle('🎮 Hangman Game - Waiting for Players')
      .setDescription(`**Started by:** ${game.starterUsername}\n\n` +
        `Players need to join before the game can start!\n` +
        `**Min:** ${config.game.minPlayers} | **Max:** ${config.game.maxPlayers}`)
      .setColor(config.colors.info);

    const playerList = game.players.map((p, i) => `${i + 1}. ${p.username}`).join('\n');
    embed.addFields({
      name: `👥 Players (${game.players.length}/${config.game.maxPlayers})`,
      value: playerList || 'No players yet',
      inline: false
    });

    const display = game.getDisplay ? game.getDisplay() : this.getDisplayFromGame(game);
    embed.addFields({
      name: '📝 Word Length',
      value: `\`${display}\` (${game.word.length} letters)`,
      inline: false
    });

    return embed;
  }

  /**
   * Create game over embed
   */
  createGameOverEmbed(game, won) {
    const embed = new EmbedBuilder()
      .setTitle(won ? '🎉 Game Won!' : '💀 Game Over!')
      .setColor(won ? config.colors.success : config.colors.error);

    embed.addFields({
      name: '📝 The Word Was',
      value: `**${game.word}**`,
      inline: false
    });

    if (won) {
      const points = game.calculatePoints();
      const pointsPerPlayer = Math.floor(points / game.players.length);

      embed.addFields({
        name: '🏆 Points Earned',
        value: `${pointsPerPlayer} points per player`,
        inline: true
      });

      embed.addFields({
        name: '❌ Mistakes',
        value: `${game.mistakeCount}/${game.maxMistakes}`,
        inline: true
      });
    }

    const playerList = game.players.map(p => p.username).join(', ');
    embed.addFields({
      name: '👥 Players',
      value: playerList,
      inline: false
    });

    return embed;
  }

  /**
   * Create join button
   */
  createJoinButton() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hangman_join')
        .setLabel('Join Game')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎮')
    );
  }

  /**
   * Create start button
   */
  createStartButton() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hangman_start')
        .setLabel('Start Game')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
    );
  }

  /**
   * Helper: Get display from game object (for JSON mode)
   */
  getDisplayFromGame(game) {
    return game.word
      .split('')
      .map(char => {
        if (char === ' ') return ' ';
        if (!/[a-zA-Z]/.test(char)) return char;
        return game.guessedLetters.includes(char.toLowerCase()) ? char : '_';
      })
      .join(' ');
  }

  /**
   * Helper: Get hangman visual (for JSON mode)
   */
  getHangmanVisual(mistakeCount) {
    const stages = [
      `
     ___
    |   |
    |
    |
    |
    |_____
      `,
      `
     ___
    |   |
    |   O
    |
    |
    |_____
      `,
      `
     ___
    |   |
    |   O
    |   |
    |
    |_____
      `,
      `
     ___
    |   |
    |   O
    |  /|
    |
    |_____
      `,
      `
     ___
    |   |
    |   O
    |  /|\\
    |
    |_____
      `,
      `
     ___
    |   |
    |   O
    |  /|\\
    |  /
    |_____
      `,
      `
     ___
    |   |
    |   O
    |  /|\\
    |  / \\
    |_____
      `
    ];

    return stages[Math.min(mistakeCount, 6)];
  }
}

module.exports = GameManager;
