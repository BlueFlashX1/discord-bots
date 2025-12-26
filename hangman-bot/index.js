require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { connectDatabase } = require('./database/db');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Connect to database and initialize systems
connectDatabase().then(async (dbType) => {
  console.log(`📊 Database: ${dbType === 'mongodb' ? 'MongoDB' : 'JSON files'}`);

  // Initialize shop system
  const { getDatabase } = require('./database/db');
  const { ShopItem, Player } = getDatabase();
  const ShopSystem = require('./utils/shopSystem');
  const WeeklyReset = require('./utils/weeklyReset');

  const shopSystem = new ShopSystem(ShopItem, Player);
  await shopSystem.initializeShop();

  // Start weekly reset scheduler
  const weeklyReset = new WeeklyReset(Player);
  weeklyReset.start();

}).catch(error => {
  console.error('Database connection error:', error);
});

// Initialize command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property`);
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Loaded event: ${event.name}`);
  }
}

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('🤖 Bot is logging in...'))
  .catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
  });
