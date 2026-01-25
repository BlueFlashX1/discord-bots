const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BudgetMonitor = require('../services/budgetMonitor');

const budgetMonitor = new BudgetMonitor();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('budget')
    .setDescription('View OpenAI API budget usage and statistics'),
  async execute(interaction) {
    let deferred = false;
    try {
      console.log('[Budget Command] Command executed');
      console.log('[Budget Command] Interaction state - replied:', interaction.replied, 'deferred:', interaction.deferred);

      // Try to defer reply immediately to prevent interaction timeout
      // If defer fails (interaction expired/invalid), we'll reply immediately
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.deferReply();
          deferred = true;
          console.log('[Budget Command] Reply deferred successfully');
        } catch (deferError) {
          console.error('[Budget Command] Failed to defer reply:', deferError.message);
          console.error('[Budget Command] Defer error code:', deferError.code);
          // If defer fails with 10062 (Unknown interaction), interaction has expired
          if (deferError.code === 10062) {
            console.error('[Budget Command] Interaction expired - cannot respond');
            // Interaction is expired, we can't do anything
            return;
          }
          // For other errors, we'll try to reply immediately after getting data
          deferred = false;
        }
      } else {
        console.log('[Budget Command] Interaction already replied/deferred, skipping defer');
        deferred = true;
      }

      console.log('[Budget Command] Calling getBudgetStatus()...');
      let status;
      try {
        status = await budgetMonitor.getBudgetStatus();
        console.log('[Budget Command] getBudgetStatus() returned:', status ? 'Success' : 'Null/Undefined');
        if (status) {
          console.log('[Budget Command] Status keys:', Object.keys(status));
          console.log('[Budget Command] Status date:', status.date);
          console.log('[Budget Command] Status totalCost:', status.totalCost);
        }
      } catch (statusError) {
        console.error('[Budget Command] Exception in getBudgetStatus():', statusError);
        console.error('[Budget Command] Status error stack:', statusError.stack);
        // Create a default status on error
        status = {
          date: new Date().toISOString().split('T')[0],
          totalCost: 0,
          budgetLimit: parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00'),
          remainingBudget: parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00'),
          usagePercentage: 0,
          budgetExceeded: false,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokens: 0,
          costPerRequest: 0,
          avgTokensPerRequest: 0
        };
        console.log('[Budget Command] Using default status due to error');
      }

      // Ensure status is always valid with all required properties
      if (!status || typeof status !== 'object') {
        console.error('[Budget Command] ERROR: status is null, undefined, or not an object');
        console.error('[Budget Command] Status type:', typeof status);
        console.error('[Budget Command] Status value:', status);
        status = null; // Force recreation
      }

      // Validate and ensure all required properties exist
      const requiredProps = ['date', 'totalCost', 'budgetLimit', 'remainingBudget', 'usagePercentage', 
                             'budgetExceeded', 'totalRequests', 'successfulRequests', 'failedRequests', 
                             'totalTokens', 'costPerRequest', 'avgTokensPerRequest'];
      const missingProps = requiredProps.filter(prop => status === null || status === undefined || !(prop in status));
      
      if (missingProps.length > 0 || !status) {
        console.error('[Budget Command] Status missing required properties:', missingProps);
        // Create a complete default status
        status = {
          date: new Date().toISOString().split('T')[0],
          totalCost: 0,
          budgetLimit: parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00'),
          remainingBudget: parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00'),
          usagePercentage: 0,
          budgetExceeded: false,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokens: 0,
          costPerRequest: 0,
          avgTokensPerRequest: 0
        };
        console.log('[Budget Command] Created complete default status as fallback');
      }

      // Ensure all numeric values are valid numbers
      status.totalCost = Number(status.totalCost) || 0;
      status.budgetLimit = Number(status.budgetLimit) || parseFloat(process.env.DAILY_BUDGET_LIMIT || '5.00');
      status.remainingBudget = Number(status.remainingBudget) || status.budgetLimit;
      status.usagePercentage = Number(status.usagePercentage) || 0;
      status.totalRequests = Number(status.totalRequests) || 0;
      status.successfulRequests = Number(status.successfulRequests) || 0;
      status.failedRequests = Number(status.failedRequests) || 0;
      status.totalTokens = Number(status.totalTokens) || 0;
      status.costPerRequest = Number(status.costPerRequest) || 0;
      status.avgTokensPerRequest = Number(status.avgTokensPerRequest) || 0;
      status.budgetExceeded = Boolean(status.budgetExceeded);
      status.date = String(status.date || new Date().toISOString().split('T')[0]);

      let monthlyStatus = null;
      try {
        monthlyStatus = await budgetMonitor.getMonthlyBudgetStatus();
        console.log('[Budget Command] getMonthlyBudgetStatus() returned:', monthlyStatus ? 'Success' : 'Null');
      } catch (monthlyError) {
        console.error('[Budget Command] Error getting monthly status:', monthlyError.message);
        monthlyStatus = null; // Gracefully handle monthly status failure
      }

      let suggestions = [];
      try {
        suggestions = await budgetMonitor.getSuggestions();
        console.log('[Budget Command] getSuggestions() returned:', Array.isArray(suggestions) ? `${suggestions.length} suggestions` : 'Not array');
        if (!Array.isArray(suggestions)) {
          suggestions = [];
        }
      } catch (suggestionsError) {
        console.error('[Budget Command] Error getting suggestions:', suggestionsError.message);
        suggestions = []; // Gracefully handle suggestions failure
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

      // Send the response - use editReply if deferred, otherwise reply immediately
      try {
        if (deferred || interaction.deferred || interaction.replied) {
          // Interaction was deferred, use editReply
          await interaction.editReply({ embeds: [embed] });
          console.log('[Budget Command] Successfully sent embed via editReply');
        } else {
          // Interaction not deferred, use reply
          await interaction.reply({ embeds: [embed] });
          console.log('[Budget Command] Successfully sent embed via reply');
        }
      } catch (sendError) {
        console.error('[Budget Command] Failed to send embed:', sendError.message);
        console.error('[Budget Command] Send error code:', sendError.code);
        
        // If interaction expired (10062) or already acknowledged (40060), we can't do anything
        if (sendError.code === 10062) {
          console.error('[Budget Command] Interaction expired (10062) - cannot send response');
          return; // Exit gracefully - interaction is gone
        }
        
        if (sendError.code === 40060) {
          // Interaction already acknowledged - try followUp
          console.warn('[Budget Command] Interaction already acknowledged, trying followUp');
          try {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            console.log('[Budget Command] Successfully sent embed via followUp');
          } catch (followUpError) {
            console.error('[Budget Command] Failed to followUp:', followUpError.message);
            console.error('[Budget Command] FollowUp error code:', followUpError.code);
            // If followUp also fails with 10062, interaction is completely expired
            if (followUpError.code === 10062) {
              console.error('[Budget Command] Interaction expired - cannot send any response');
              return;
            }
          }
        } else {
          // Other error - try followUp as last resort
          try {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            console.log('[Budget Command] Successfully sent embed via followUp (fallback)');
          } catch (followUpError) {
            console.error('[Budget Command] Failed to followUp:', followUpError.message);
            console.error('[Budget Command] FollowUp error code:', followUpError.code);
          }
        }
      }
    } catch (error) {
      console.error('[Budget Command] Fatal error in budget command:', error);
      console.error('[Budget Command] Error name:', error.name);
      console.error('[Budget Command] Error message:', error.message);
      console.error('[Budget Command] Error stack:', error.stack);
      console.error('[Budget Command] Error code:', error.code);

      // Only try to reply if interaction is still valid
      try {
        const errorMessage = 'Error: Unable to retrieve budget status. Please try again later.';
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: errorMessage,
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error('[Budget Command] Failed to send error message:', replyError.message);
        console.error('[Budget Command] Reply error code:', replyError.code);
        // Interaction may have expired, can't do anything about it
      }
    }
  },
};
