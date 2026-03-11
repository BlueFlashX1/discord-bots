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

function parseCsv(input) {
  return [...new Set(String(input || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean))];
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

    // Cleanup stale guild-scoped duplicates so users only see one slash command.
    const deployedGuildIds = parseCsv(process.env.SHADOW_DEPLOYED_GUILD_IDS);
    const commandNames = new Set(commands.map((cmd) => cmd.name));
    let removedGuildDuplicates = 0;

    for (const guildId of deployedGuildIds) {
      const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
      const duplicateGuildCommands = guildCommands.filter((cmd) => commandNames.has(cmd.name));

      for (const cmd of duplicateGuildCommands) {
        await rest.delete(Routes.applicationGuildCommand(clientId, guildId, cmd.id));
        removedGuildDuplicates += 1;
        console.log(`Removed stale guild command /${cmd.name} (${cmd.id}) from guild ${guildId}`);
      }
    }

    if (deployedGuildIds.length) {
      console.log(`Guild duplicate cleanup complete. Removed ${removedGuildDuplicates} command(s).`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
})();
