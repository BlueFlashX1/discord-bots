require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configManager = require('./services/configManager');
const scheduler = require('./services/scheduler');
const statusUpdater = require('./services/statusUpdater');
const serviceLogger = require('./services/logger');
const Logger = require('../utils/logger');
const { validateEnv, validators } = require('../utils/envValidator');

// Initialize structured logger
const logger = new Logger('command-control-bot');

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

// Load and validate config on startup
try {
  configManager.loadConfig();
  logger.info('Config loaded successfully');
} catch (error) {
  logger.error('Failed to load config', error);
  process.exit(1);
}

// Start config file watcher for hot-reload
configManager.startWatching((newConfig) => {
  logger.info(`Config hot-reloaded: ${newConfig.commands.length} commands`);
});

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
  }
}

// Initialize scheduler with Discord client once ready
client.once('ready', () => {
  // Load notification channel from user preferences (set via /settings channel)
  const userPreferences = require('./services/userPreferences');
  const notificationChannelId = userPreferences.getNotificationChannel();

  // Fallback to env var for backward compatibility
  const envChannelId = process.env.SCHEDULER_CHANNEL_ID;
  const channelId = notificationChannelId || envChannelId;

  if (channelId) {
    scheduler.setDiscordClient(client, channelId);
    logger.info(`Scheduler notifications will be sent to channel ${channelId}`);
  } else {
    logger.info('No notification channel set - use /settings channel to configure');
  }
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');

  // Stop all scheduled jobs
  scheduler.stopAll();

  // Stop config file watcher
  configManager.stopWatching();

  // Stop all status update intervals
  statusUpdater.stopAll();

  // Cleanup cooldown cleanup interval
  const interactionCreateEvent = require('./events/interactionCreate');
  if (interactionCreateEvent.stopCooldownCleanup) {
    interactionCreateEvent.stopCooldownCleanup();
  }

  // Destroy Discord client
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  logger.error('Failed to login', error);
  process.exit(1);
});
