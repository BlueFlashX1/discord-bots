const { REST, Routes } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`Bot is ready to serve ${client.guilds.cache.size} guild(s).`);

    // Register slash commands
    const commands = [];
    client.commands.forEach(command => {
      commands.push(command.data.toJSON());
    });

    if (commands.length === 0) {
      console.log('No commands to register');
      return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
      console.log(`Registering ${commands.length} slash command(s)...`);

      if (process.env.GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          { body: commands }
        );
        console.log(`Registered commands to guild ${process.env.GUILD_ID}`);
      } else {
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: commands }
        );
        console.log('Registered commands globally');
      }
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  },
};
