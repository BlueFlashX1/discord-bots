require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { RedditMonitor } = require('./services/redditMonitor');
const configManager = require('./services/configManager');

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
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
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
    console.log(`Loaded event: ${event.name}`);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);

  const subreddits = configManager.getSubreddits();
  console.log(`Monitoring ${subreddits.length} subreddit(s)`);

  redditMonitor = new RedditMonitor(config, client);
  await redditMonitor.start();
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Bot is logging in...'))
  .catch((error) => {
    console.error('Failed to login:', error);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (redditMonitor) {
    await redditMonitor.stop();
  }
  client.destroy();
  process.exit(0);
});
