require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and CLIENT_ID are required for command deployment.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsPath).filter((name) => name.endsWith('.js'));

for (const file of files) {
  const command = require(path.join(commandsPath, file));
  if (!command.data || !command.execute) {
    console.warn(`Skipping ${file} (missing data/execute).`);
    continue;
  }
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} shadow-away command(s)...`);
    const deployed = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`Deployed ${deployed.length} command(s) globally.`);
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
})();
