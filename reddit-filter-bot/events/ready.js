const { REST, Routes, ActivityType } = require('discord.js');
const configManager = require('../services/configManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`Loaded ${client.commands.size} command(s)`);

    const subreddits = configManager.getSubreddits();
    console.log(`Monitoring ${subreddits.length} subreddit(s)`);

    client.user.setActivity('Reddit feeds', { type: ActivityType.Watching });

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
          Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
          { body: commands }
        );
        console.log(`Registered commands to guild ${process.env.GUILD_ID}`);
      } else {
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands }
        );
        console.log('Registered commands globally (may take up to 1 hour to appear)');
      }
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  },
};
