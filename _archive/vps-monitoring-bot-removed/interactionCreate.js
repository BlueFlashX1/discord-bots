module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`, error);
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      }).catch(() => {
        interaction.editReply({
          content: 'There was an error while executing this command!',
        }).catch(() => {});
      });
    }
  },
};
