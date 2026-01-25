const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscription')
    .setDescription('Manage your subscriptions')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new subscription')
        .addStringOption((option) =>
          option.setName('name').setDescription('Subscription name').setRequired(true)
        )
        .addNumberOption((option) =>
          option.setName('amount').setDescription('Monthly or yearly amount').setRequired(true).setMinValue(0)
        )
        .addStringOption((option) =>
          option
            .setName('recurring')
            .setDescription('Recurring period')
            .setRequired(true)
            .addChoices({ name: 'Monthly', value: 'monthly' }, { name: 'Yearly', value: 'yearly' })
        )
        .addStringOption((option) =>
          option.setName('source').setDescription('Link to subscription page').setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('reminder')
            .setDescription('Days before charge to remind you')
            .setRequired(true)
            .addChoices(
              { name: '1 day before', value: 1 },
              { name: '3 days before', value: 3 },
              { name: '1 week before', value: 7 }
            )
        )
        .addStringOption((option) =>
          option
            .setName('last_charged')
            .setDescription('Last charge date (YYYY-MM-DD) - defaults to today')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all your subscriptions')
        .addBooleanOption((option) =>
          option.setName('active_only').setDescription('Show only active subscriptions').setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a subscription')
        .addStringOption((option) =>
          option.setName('id').setDescription('Subscription ID (use /subscription list to find it)').setRequired(true)
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const name = interaction.options.getString('name');
        const amount = interaction.options.getNumber('amount');
        const recurring = interaction.options.getString('recurring');
        const sourceLink = interaction.options.getString('source');
        const reminderDays = interaction.options.getInteger('reminder');
        const lastChargedStr = interaction.options.getString('last_charged');

        let lastCharged = new Date().toISOString();
        if (lastChargedStr) {
          const parsed = new Date(lastChargedStr);
          if (isNaN(parsed.getTime())) {
            return interaction.editReply({
              content: '❌ Invalid date format. Use YYYY-MM-DD',
            });
          }
          lastCharged = parsed.toISOString();
        }

        const subscription = client.subscriptionManager.addSubscription({
          name,
          amount,
          recurring,
          sourceLink,
          reminderDays,
          userId: interaction.user.id,
          lastCharged,
        });

        const nextChargeDate = client.subscriptionManager.calculateNextChargeDate(
          lastCharged,
          recurring
        );
        const reminderDate = client.subscriptionManager.calculateReminderDate(
          nextChargeDate,
          reminderDays
        );

        // Reschedule reminders
        client.reminderScheduler.scheduleAllReminders();

        const embed = new EmbedBuilder()
          .setTitle('✅ Subscription Added')
          .setColor(0x00ff00)
          .addFields(
            { name: '📝 Name', value: subscription.name, inline: true },
            { name: '💰 Amount', value: `$${subscription.amount.toFixed(2)}`, inline: true },
            { name: '🔄 Recurring', value: subscription.recurring.charAt(0).toUpperCase() + subscription.recurring.slice(1), inline: true },
            { name: '📅 Next Charge', value: `<t:${Math.floor(nextChargeDate.getTime() / 1000)}:F>`, inline: true },
            { name: '🔔 Reminder', value: `<t:${Math.floor(reminderDate.getTime() / 1000)}:F>`, inline: true },
            { name: '🔗 Source', value: subscription.sourceLink }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          content: `❌ Error adding subscription: ${error.message}`,
        });
      }
    } else if (subcommand === 'list') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const activeOnly = interaction.options.getBoolean('active_only') ?? true;
        const subscriptions = client.subscriptionManager.getUserSubscriptions(
          interaction.user.id,
          activeOnly
        );

        if (subscriptions.length === 0) {
          return interaction.editReply({
            content: activeOnly
              ? '📭 You have no active subscriptions.'
              : '📭 You have no subscriptions.',
          });
        }

        const totalMonthly = subscriptions
          .filter((s) => s.active && s.recurring === 'monthly')
          .reduce((sum, s) => sum + s.amount, 0);
        const totalYearly = subscriptions
          .filter((s) => s.active && s.recurring === 'yearly')
          .reduce((sum, s) => sum + s.amount, 0);

        const subscriptionList = subscriptions.map((sub) => {
          const nextCharge = client.subscriptionManager.calculateNextChargeDate(
            sub.lastCharged,
            sub.recurring
          );
          const status = sub.active ? '🟢' : '🔴';
          const recurring = sub.recurring === 'monthly' ? 'mo' : 'yr';
          return `${status} **${sub.name}** - $${sub.amount.toFixed(2)}/${recurring}\n   ID: \`${sub.id}\` | Next: <t:${Math.floor(nextCharge.getTime() / 1000)}:D> | [Link](${sub.sourceLink})`;
        });

        const embed = new EmbedBuilder()
          .setTitle('📋 Your Subscriptions')
          .setColor(0x5865f2)
          .setDescription(subscriptionList.join('\n\n'))
          .addFields({
            name: '💰 Totals',
            value: `**Monthly:** $${totalMonthly.toFixed(2)}\n**Yearly:** $${totalYearly.toFixed(2)}`,
            inline: true,
          })
          .setFooter({ text: `Total: ${subscriptions.length} subscription(s)` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          content: `❌ Error listing subscriptions: ${error.message}`,
        });
      }
    } else if (subcommand === 'remove') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const id = interaction.options.getString('id');
        const subscription = client.subscriptionManager.getSubscription(id);

        if (!subscription) {
          return interaction.editReply({
            content: '❌ Subscription not found.',
          });
        }

        if (subscription.userId !== interaction.user.id) {
          return interaction.editReply({
            content: '❌ You can only remove your own subscriptions.',
          });
        }

        client.subscriptionManager.deleteSubscription(id);
        client.reminderScheduler.scheduleAllReminders();

        const embed = new EmbedBuilder()
          .setTitle('✅ Subscription Removed')
          .setDescription(`**${subscription.name}** has been removed.`)
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          content: `❌ Error removing subscription: ${error.message}`,
        });
      }
    }
  },
};
