require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command data
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    // Deploy globally (available in all servers)
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`✅ Successfully deployed ${data.length} commands globally`);
    console.log('Commands will be available in all servers after a few minutes.');

    console.log('📝 Deployed commands:', data.map(cmd => cmd.name).join(', '));

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
