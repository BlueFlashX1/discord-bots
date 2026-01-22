require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const TodoistService = require('./services/todoist');
const SyncService = require('./services/sync');
const DailyOverview = require('./services/dailyOverview');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize services
const todoistService = new TodoistService(process.env.TODOIST_API_TOKEN);
const syncService = new SyncService(client, todoistService);
const dailyOverview = new DailyOverview(client, todoistService);

// Initialize command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
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
      client.once(event.name, (...args) => event.execute(...args, client, todoistService));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client, todoistService));
    }
  }
}

// Store services in client for command access
client.todoistService = todoistService;
client.syncService = syncService;
client.dailyOverview = dailyOverview;

// Initialize user preferences
const userPreferences = require('./services/userPreferences');
client.userPreferences = userPreferences;

// Start sync service
syncService.start();

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('\nShutting down gracefully...');

  // Stop sync service
  syncService.stop();

  // Destroy Discord client
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
