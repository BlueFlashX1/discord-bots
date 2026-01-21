module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      const setupStarter = client.commands.get('setup-starter');
      if (setupStarter && setupStarter.handleButton) {
        try {
          const handled = await setupStarter.handleButton(interaction);
          if (handled) return;
        } catch (error) {
          console.error('Button handler error:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Error handling button.', ephemeral: true });
          }
        }
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);

      const reply = {
        content: 'There was an error executing this command.',
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
