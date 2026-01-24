require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { RedditMonitor } = require('./services/redditMonitor');
const configManager = require('./services/configManager');
const Logger = require('../utils/logger');
const { validateEnv, validators } = require('../utils/envValidator');

// Initialize logger
const logger = new Logger('reddit-filter-bot');

// Validate environment variables
try {
  validateEnv({
    DISCORD_TOKEN: {
      required: true,
      validator: validators.discordToken,
      errorMessage: 'DISCORD_TOKEN is required and must be a valid Discord bot token',
    },
  }, logger);
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const config = configManager.loadConfig();
let redditMonitor = null;

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
    }
  }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client, config));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client, config));
    }
    logger.debug(`Loaded event: ${event.name}`);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
});

client.once('ready', async () => {
  logger.info(`Discord bot logged in as ${client.user.tag}`);

  const subreddits = configManager.getSubreddits();
  logger.info(`Monitoring ${subreddits.length} subreddit(s)`);

  redditMonitor = new RedditMonitor(config, client);
  await redditMonitor.start();
  logger.info('Reddit monitor started');
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => logger.info('Bot is logging in...'))
  .catch((error) => {
    logger.error('Failed to login', error);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  if (redditMonitor) {
    await redditMonitor.stop();
    logger.info('Reddit monitor stopped');
  }
  client.destroy();
  process.exit(0);
});
