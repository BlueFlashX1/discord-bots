require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const YouTubeMonitor = require('./services/youtubeMonitor');
const YouTubeService = require('./services/youtubeService');
const ApiQuotaManager = require('./services/apiQuotaManager');
const ChannelManager = require('./services/channelManager');

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
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`Loaded event: ${event.name}`);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Bot is logging in...'))
  .catch((error) => {
    console.error('Failed to login:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (youtubeMonitor) {
    await youtubeMonitor.stop();
  }
  client.destroy();
  process.exit(0);
});
