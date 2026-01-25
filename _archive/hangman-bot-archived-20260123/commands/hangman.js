const { SlashCommandBuilder } = require('discord.js');
const GameManager = require('../utils/gameManager');
const { getDatabase } = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Start or manage a hangman game')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new hangman game')
        .addStringOption(option =>
          option
            .setName('word')
            .setDescription('The word to guess (other players will not see this)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('guess')
        .setDescription('Guess a letter')
        .addStringOption(option =>
          option
            .setName('letter')
            .setDescription('The letter to guess')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End the current game (starter only)')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'start') {
        await this.handleStart(interaction);
      } else if (subcommand === 'guess') {
        await this.handleGuess(interaction);
      } else if (subcommand === 'end') {
        await this.handleEnd(interaction);
      }
    } catch (error) {
      console.error('Error in hangman command:', error);

      const errorMessage = error.message || 'An error occurred';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `❌ ${errorMessage}`,
          flags: 64 // MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: `❌ ${errorMessage}`,
          flags: 64 // MessageFlags.Ephemeral
        });
      }
    }
  },

  async handleStart(interaction) {
    const word = interaction.options.getString('word');
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Acknowledge immediately (word is secret)
    await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral

    const { Game, Player } = getDatabase();
    const gameManager = new GameManager(Game, Player);

    try {
      // Create game
      const game = await gameManager.createGame(channelId, word, userId, username);

      // Reply to starter (ephemeral)
      await interaction.editReply({
        content: `✅ Game created! Word: **${word}**\n\nWaiting for players to join...`,
        flags: 64 // MessageFlags.Ephemeral
      });

      // Post public waiting room message
      const waitingEmbed = gameManager.createWaitingEmbed(game);
      const joinButton = gameManager.createJoinButton();
      const startButton = gameManager.createStartButton();

      await interaction.channel.send({
        embeds: [waitingEmbed],
        components: [joinButton, startButton]
      });

    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error.message}`,
        flags: 64 // MessageFlags.Ephemeral
      });
    }
  },

  async handleGuess(interaction) {
    const letter = interaction.options.getString('letter').trim();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    await interaction.deferReply();

    const { Game, Player } = getDatabase();
    const gameManager = new GameManager(Game, Player);

    try {
      const result = await gameManager.makeGuess(channelId, userId, username, letter);

      // Game still active
      if (result.game.state === 'active') {
        const embed = gameManager.createGameEmbed(
          result.game,
          result.isCorrect ? '✅ Correct!' : '❌ Wrong!'
        );

        await interaction.editReply({ embeds: [embed] });
      }

      // Game won
      else if (result.game.state === 'won') {
        const embed = gameManager.createGameOverEmbed(result.game, true);

        await interaction.editReply({ embeds: [embed] });
      }

      // Game lost
      else if (result.game.state === 'lost') {
        const embed = gameManager.createGameOverEmbed(result.game, false);

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error.message}`
      });
    }
  },

  async handleEnd(interaction) {
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    await interaction.deferReply();

    const { Game, Player } = getDatabase();
    const gameManager = new GameManager(Game, Player);

    try {
      const game = await gameManager.endGame(channelId, userId);

      await interaction.editReply({
        content: `🛑 Game ended by ${interaction.user.username}.\n\nThe word was: **${game.word}**`
      });

    } catch (error) {
      await interaction.editReply({
        content: `❌ ${error.message}`
      });
    }
  }
};
