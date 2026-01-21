const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BudgetMonitor = require('../services/budgetMonitor');

const budgetMonitor = new BudgetMonitor();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('budget')
    .setDescription('View OpenAI API budget usage and statistics'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const status = await budgetMonitor.getBudgetStatus();
      const monthlyStatus = await budgetMonitor.getMonthlyBudgetStatus();
      const suggestions = await budgetMonitor.getSuggestions();

      if (!status) {
        return await interaction.editReply({
          content: 'Error: Unable to retrieve budget status. Please try again later.',
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('OpenAI API Budget Status')
        .setColor(
          status.budgetExceeded ? 0xff0000 : status.usagePercentage > 80 ? 0xffaa00 : 0x00ff00
        )
        .setTimestamp()
        .addFields(
          {
            name: 'Daily Budget',
            value:
              `$${status.totalCost.toFixed(4)} / $${status.budgetLimit.toFixed(2)}\n` +
              `${status.usagePercentage.toFixed(1)}% used\n` +
              `Remaining: $${status.remainingBudget.toFixed(2)}`,
            inline: true,
          },
          {
            name: 'Monthly Budget',
            value: monthlyStatus
              ? `$${monthlyStatus.totalCost.toFixed(2)} / $${monthlyStatus.budgetLimit.toFixed(
                  2
                )}\n` +
                `${monthlyStatus.usagePercentage}% used\n` +
                `Remaining: $${monthlyStatus.remainingBudget.toFixed(2)}`
              : 'Not available',
            inline: true,
          },
          {
            name: "Today's Activity",
            value:
              `Requests: ${status.totalRequests}\n` +
              `Successful: ${status.successfulRequests}\n` +
              `Failed: ${status.failedRequests}\n` +
              `Tokens: ${status.totalTokens.toLocaleString()}`,
            inline: true,
          },
          {
            name: 'Averages',
            value:
              `Cost/Request: ${budgetMonitor.formatCost(status.costPerRequest)}\n` +
              `Tokens/Request: ${status.avgTokensPerRequest.toLocaleString()}`,
            inline: true,
          },
          {
            name: 'Status',
            value: status.budgetExceeded
              ? 'Budget exceeded - checking disabled'
              : status.usagePercentage > 80
              ? 'Warning - approaching limit'
              : 'Normal operation',
            inline: true,
          }
        );

      if (suggestions && suggestions.length > 0) {
        const suggestionsText = suggestions
          .map((s) => {
            const icon =
              s.type === 'critical'
                ? '🔴'
                : s.type === 'warning'
                ? '🟡'
                : s.type === 'error'
                ? '❌'
                : '💡';
            return `${icon} ${s.message}`;
          })
          .join('\n');
        embed.addFields({
          name: 'Suggestions',
          value: suggestionsText,
          inline: false,
        });
      }

      if (monthlyStatus && monthlyStatus.daysTracked > 0) {
        embed.setFooter({
          text: `Monthly average: $${monthlyStatus.avgCostPerDay}/day over ${monthlyStatus.daysTracked} days`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Budget command error:', error);
      await interaction.editReply({
        content: 'Error retrieving budget status: ' + error.message,
      });
    }
  },
};
