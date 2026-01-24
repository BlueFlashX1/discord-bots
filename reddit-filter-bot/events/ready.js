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
    const appId = client.user.id;

    try {
      for (const [guildId] of client.guilds.cache) {
        try {
          await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: [] });
        } catch (err) {
          console.warn(`Could not clear guild ${guildId} commands:`, err.message);
        }
      }
      if (client.guilds.cache.size > 0) {
        console.log('Cleared guild-specific commands (avoids duplicates with global).');
      }

      console.log(`Registering ${commands.length} slash command(s) globally...`);
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log('Registered commands globally.');
      console.log('Commands will be available in all servers after a few minutes.');
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  },
};
