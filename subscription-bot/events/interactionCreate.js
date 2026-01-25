module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('sub_continue_')) {
        const subscriptionId = customId.replace('sub_continue_', '');
        await interaction.deferUpdate();
        await client.reminderScheduler.handleContinue(subscriptionId, interaction.user.id);
        await interaction.editReply({
          content: '✅ You chose to continue. You\'ll receive a confirmation reminder 1 day before the charge.',
          components: [],
        });
        return;
      }

      if (customId.startsWith('sub_confirm_')) {
        const subscriptionId = customId.replace('sub_confirm_', '');
        const subscription = client.subscriptionManager.getSubscription(subscriptionId);
        if (!subscription || subscription.userId !== interaction.user.id) {
          return interaction.reply({
            content: '❌ Subscription not found or you don\'t have permission.',
            ephemeral: true,
          });
        }

        await interaction.deferUpdate();
        const nextChargeDate = client.subscriptionManager.calculateNextChargeDate(
          subscription.lastCharged,
          subscription.recurring
        );
        await client.reminderScheduler.confirmAndReschedule(subscription, nextChargeDate);
        await interaction.editReply({
          content: '✅ Subscription confirmed and rescheduled!',
          components: [],
        });
        return;
      }

      if (customId.startsWith('sub_cancel_')) {
        const subscriptionId = customId.replace('sub_cancel_', '');
        await interaction.deferUpdate();
        await client.reminderScheduler.handleCancel(subscriptionId, interaction.user.id);
        await interaction.editReply({
          content: '❌ Subscription cancelled. Check your DMs for the cancellation link.',
          components: [],
        });
        return;
      }
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`, error);
        const replyOptions = {
          content: 'There was an error while executing this command!',
          ephemeral: true,
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(replyOptions).catch(() => {});
        } else {
          await interaction.reply(replyOptions).catch(() => {});
        }
      }
    }
  },
};
