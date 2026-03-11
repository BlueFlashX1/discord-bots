const { EmbedBuilder } = require('discord.js');

function buildPrivateErrorEmbed(commandName) {
  return new EmbedBuilder()
    .setTitle('Shadow Away Command Error')
    .setDescription(`Command \`/${commandName}\` failed to execute safely.`)
    .setColor(0xff4d6d)
    .setTimestamp(new Date());
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      client.logger.error('Interaction execution failed', error, {
        event: 'shadowaway_interaction_failed',
        commandName: interaction.commandName,
        userId: interaction.user?.id || null,
      });

      const payload = {
        embeds: [buildPrivateErrorEmbed(interaction.commandName)],
        ephemeral: true,
      };

      let deliveredPrivately = false;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).then(() => {
          deliveredPrivately = true;
        }).catch(() => {});
      } else {
        await interaction.reply(payload).then(() => {
          deliveredPrivately = true;
        }).catch(() => {});
      }

      // Fallback: if ephemeral delivery fails, DM only the owner who ran the command.
      if (!deliveredPrivately && client.shadowAwayService?.isOwner?.(interaction.user?.id)) {
        try {
          const ownerUser = await client.users.fetch(interaction.user.id);
          await ownerUser.send({
            embeds: [buildPrivateErrorEmbed(interaction.commandName)],
          });
        } catch (dmError) {
          client.logger.warn('Interaction error fallback DM failed', {
            event: 'shadowaway_interaction_error_dm_failed',
            commandName: interaction.commandName,
            userId: interaction.user?.id || null,
            error: dmError.message,
          });
        }
      }
    }
  },
};
