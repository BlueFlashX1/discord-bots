require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const { validateEnv, validators } = require('../utils/envValidator');
const SubscriptionManager = require('./services/subscriptionManager');
const ReminderScheduler = require('./services/reminderScheduler');

// Initialize logger
const logger = new Logger('subscription-bot');

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

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize command collection
client.commands = new Collection();

// Initialize services
const subscriptionManager = new SubscriptionManager({
  dataPath: path.join(__dirname, 'data', 'subscriptions.json'),
  logger,
});

const reminderScheduler = new ReminderScheduler({
  client,
  subscriptionManager,
  logger,
});

// Store services in client
client.subscriptionManager = subscriptionManager;
client.reminderScheduler = reminderScheduler;

// Load commands
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

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.debug(`Loaded event: ${event.name}`);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  if (client.reminderScheduler) {
    await client.reminderScheduler.stop();
  }
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Login to Discord
client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    logger.info('Bot is logging in...');
    // Start reminder scheduler after bot is ready
    client.once('ready', () => {
      reminderScheduler.start();
    });
  })
  .catch((error) => {
    logger.error('Failed to login', error);
    process.exit(1);
  });
