require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ProblemService = require('./services/problemService');
const ProgressService = require('./services/progressService');
const CodeValidator = require('./services/codeValidator');
const SubmissionArchive = require('./services/submissionArchive');
const UserPreferences = require('./services/userPreferences');
const CodewarsProgress = require('./services/codewarsProgress');
const ProblemAutoPoster = require('./services/problemAutoPoster');
const FileGenerator = require('./services/fileGenerator');
const Logger = require('../utils/logger');
const { validateEnv, validators } = require('../utils/envValidator');

// Initialize logger
const logger = new Logger('coding-practice-bot');

// Validate environment variables
try {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token || !validators.discordToken(token)) {
    logger.error('DISCORD_TOKEN or DISCORD_BOT_TOKEN is required and must be a valid Discord bot token');
    process.exit(1);
  }
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
const problemService = new ProblemService();
const progressService = new ProgressService();
const codeValidator = new CodeValidator();
const submissionArchive = new SubmissionArchive();
const userPreferences = new UserPreferences();
const codewarsProgress = new CodewarsProgress();
const fileGenerator = new FileGenerator();
const problemAutoPoster = new ProblemAutoPoster(
  client,
  problemService,
  progressService,
  userPreferences,
  codewarsProgress
);

// Store services in client
client.problemService = problemService;
client.progressService = progressService;
client.codeValidator = codeValidator;
client.submissionArchive = submissionArchive;
client.userPreferences = userPreferences;
client.codewarsProgress = codewarsProgress;
client.fileGenerator = fileGenerator;
client.problemAutoPoster = problemAutoPoster;

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
  .login(process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN)
  .then(() => logger.info('Bot is logging in...'))
  .catch((error) => {
    logger.error('Failed to login', error);
    process.exit(1);
  });

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');

  // Stop auto-poster if running
  if (client.problemAutoPoster && client.problemAutoPoster.isActive()) {
    client.problemAutoPoster.stop();
  }

  // Destroy Discord client
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
