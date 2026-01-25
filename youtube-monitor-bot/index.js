require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const YouTubeMonitor = require('./services/youtubeMonitor');
const YouTubeService = require('./services/youtubeService');
const ApiQuotaManager = require('./services/apiQuotaManager');
const ChannelManager = require('./services/channelManager');
const Logger = require('../utils/logger');
const { validateEnv, validators } = require('../utils/envValidator');

// Initialize logger
const logger = new Logger('youtube-monitor-bot');

// Validate environment variables
try {
  validateEnv({
    DISCORD_TOKEN: {
      required: true,
      validator: validators.discordToken,
      errorMessage: 'DISCORD_TOKEN is required and must be a valid Discord bot token',
    },
    YOUTUBE_API_KEY: {
      required: true,
      errorMessage: 'YOUTUBE_API_KEY is required',
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

// Initialize services
const apiQuotaManager = new ApiQuotaManager();
const channelManager = new ChannelManager();
const youtubeService = new YouTubeService(process.env.YOUTUBE_API_KEY, apiQuotaManager);
const youtubeMonitor = new YouTubeMonitor(client, youtubeService, channelManager, apiQuotaManager);

// Store services in client
client.youtubeService = youtubeService;
client.youtubeMonitor = youtubeMonitor;
client.channelManager = channelManager;
client.apiQuotaManager = apiQuotaManager;

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

// Login
client
  .login(process.env.DISCORD_TOKEN)
  .then(() => logger.info('Bot is logging in...'))
  .catch((error) => {
    logger.error('Failed to login', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  if (youtubeMonitor) {
    await youtubeMonitor.stop();
    logger.info('YouTube monitor stopped');
  }
  client.destroy();
  process.exit(0);
});
