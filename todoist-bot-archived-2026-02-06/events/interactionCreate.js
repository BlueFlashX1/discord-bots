module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client, todoistService) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction, client, todoistService);
      } catch (error) {
        console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
      }
      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, client, todoistService);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const reply = {
        content: '❌ There was an error while executing this command!',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
