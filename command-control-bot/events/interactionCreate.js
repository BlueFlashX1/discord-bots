const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const processManager = require('../services/processManager');
const statusUpdater = require('../services/statusUpdater');
const configManager = require('../services/configManager');
const logger = require('../services/logger');

async function startCommand(interaction, commandId, userId, adminIds) {
  logger.debug('startCommand called', { commandId, userId, guildId: interaction.guildId });

  await interaction.deferReply({ ephemeral: false });

  const commandConfig = configManager.getCommand(commandId);
  if (!commandConfig) {
    logger.warn('Command not found in config', { commandId });
    return interaction.editReply({
      content: 'Command not found in configuration.',
    });
  }

  logger.debug('Creating initial embed', { commandId, label: commandConfig.label });

  // Create initial status message
  const initialEmbed = new EmbedBuilder()
    .setTitle(`${commandConfig.label} - STARTING`)
    .setDescription(commandConfig.description || 'Process is starting...')
    .setColor(0x3498db);

  const statusMessage = await interaction.editReply({
    embeds: [initialEmbed],
  });

  logger.debug('Starting process via processManager', { commandId });

  // Start process
  const processId = await processManager.startProcess(
    commandConfig,
    statusMessage,
    userId,
    adminIds
  );

  // Store adminIds in process data for button checks
  const processData = processManager.getProcess(processId);
  processData.adminIds = adminIds;

  // Start status updates
  await statusUpdater.startUpdating(processId);

  logger.info('Process started via interaction', {
    processId,
    commandId,
    userId,
    guildId: interaction.guildId,
  });
}

// Rate limiting for interactions (prevent spam)
const interactionCooldowns = new Map();
const COOLDOWN_DURATION = 1000; // 1 second cooldown per user

function checkCooldown(userId, customId) {
  const key = `${userId}-${customId}`;
  const lastUsed = interactionCooldowns.get(key);
  const now = Date.now();

  if (lastUsed && now - lastUsed < COOLDOWN_DURATION) {
    return false; // Still on cooldown
  }

  interactionCooldowns.set(key, now);
  return true; // Not on cooldown
}

// Clean up old cooldown entries periodically - track interval for cleanup
let cooldownCleanupInterval = null;

function startCooldownCleanup() {
  if (cooldownCleanupInterval) return; // Already started

  cooldownCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of interactionCooldowns.entries()) {
      if (now - timestamp > COOLDOWN_DURATION * 2) {
        interactionCooldowns.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

function stopCooldownCleanup() {
  if (cooldownCleanupInterval) {
    clearInterval(cooldownCleanupInterval);
    cooldownCleanupInterval = null;
  }
}

// Start cleanup on module load
startCooldownCleanup();

// Export cleanup function for graceful shutdown
module.exports.stopCooldownCleanup = stopCooldownCleanup;

// Helper function to build control panel embed and components
function buildControlPanel(config) {
  const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
  } = require('discord.js');
  const categories = configManager.getCategories();
  const components = [];

  const embed = new EmbedBuilder()
    .setTitle('Command Control Panel')
    .setDescription('Select a command to execute')
    .setColor(0x3498db)
    .setTimestamp();

  if (categories.size > 1) {
    let categoryList = '';
    categories.forEach((cmds, category) => {
      categoryList += `**${category}** (${cmds.length} commands)\n`;
    });
    embed.addFields({ name: 'Categories', value: categoryList });

    categories.forEach((cmds, category) => {
      if (cmds.length > 0) {
        const options = cmds.slice(0, 25).map((cmd) => ({
          label: cmd.label,
          description: cmd.description?.substring(0, 100) || 'No description',
          value: cmd.id,
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`category-${category}`)
          .setPlaceholder(`Select from ${category}`)
          .addOptions(options);

        components.push(new ActionRowBuilder().addComponents(selectMenu));
      }
    });
  } else {
    const commands = config.commands;
    const commandList = commands
      .map((cmd) => `**${cmd.label}**${cmd.description ? ` - ${cmd.description}` : ''}`)
      .join('\n');
    embed.addFields({ name: 'Available Commands', value: commandList || 'None' });

    const buttons = commands
      .slice(0, 25)
      .map((cmd) =>
        new ButtonBuilder()
          .setCustomId(`start-${cmd.id}`)
          .setLabel(cmd.label)
          .setStyle(ButtonStyle.Primary)
      );

    for (let i = 0; i < buttons.length; i += 5) {
      components.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }
  }

  // Add refresh button
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('refresh-panel')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    )
  );

  return { embed, components };
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()) || [];
    const userId = interaction.user.id;
    const interactionType = interaction.isButton()
      ? 'button'
      : interaction.isStringSelectMenu()
      ? 'selectMenu'
      : interaction.isAutocomplete()
      ? 'autocomplete'
      : interaction.isChatInputCommand()
      ? 'slashCommand'
      : 'unknown';

    logger.debug('Interaction received', {
      type: interactionType,
      userId,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      customId: interaction.customId || null,
      commandName: interaction.commandName || null,
    });

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error('Autocomplete error', {
          commandName: interaction.commandName,
          error: error.message,
        });
      }
      return;
    }

    // Handle select menu interactions (category selection)
    if (interaction.isStringSelectMenu()) {
      logger.debug('Processing select menu interaction', { customId: interaction.customId });

      // Check admin access
      if (!processManager.isAdmin(userId, adminIds)) {
        logger.warn('Non-admin select menu interaction blocked', { userId });
        return interaction.reply({
          content: 'Only admins can use this bot.',
          ephemeral: true,
        });
      }

      const customId = interaction.customId;
      const selectedValue = interaction.values[0];

      // Handle category selection
      if (customId.startsWith('category-')) {
        const category = customId.replace('category-', '');
        logger.debug('Category selection', { category, selectedCommandId: selectedValue });
        await startCommand(interaction, selectedValue, userId, adminIds);
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const [action, ...rest] = interaction.customId.split('-');
      const identifier = rest.join('-');

      logger.debug('Processing button interaction', { action, identifier, userId });

      // Check admin access
      if (!processManager.isAdmin(userId, adminIds)) {
        logger.warn('Non-admin button interaction blocked', { userId, action });
        return interaction.reply({
          content: 'Only admins can use this bot.',
          ephemeral: true,
        });
      }

      // Rate limiting check (except for refresh which has its own handling)
      if (action !== 'refresh' && !checkCooldown(userId, interaction.customId)) {
        logger.debug('Interaction rate limited', { userId, customId: interaction.customId });
        return interaction.reply({
          content: '⏳ Please wait a moment before clicking again.',
          ephemeral: true,
        });
      }

      try {
        // Start command button
        if (action === 'start') {
          logger.debug('Start button clicked', { commandId: identifier });

          // Prevent concurrent starts of the same command
          const processData = processManager
            .getAllProcesses()
            .find((p) => p.command?.id === identifier && p.status === 'running');
          if (processData) {
            logger.debug('Command already running', { commandId: identifier });
            return interaction.reply({
              content: '⚠️ This command is already running. Stop it first if you want to restart.',
              ephemeral: true,
            });
          }

          await startCommand(interaction, identifier, userId, adminIds);
        }

        // Restart command button
        else if (action === 'restart') {
          logger.debug('Restart button clicked', { commandId: identifier });

          // Stop existing process first if running
          const existingProcess = processManager.getProcess(identifier);
          if (existingProcess && existingProcess.status === 'running') {
            try {
              processManager.stopProcess(identifier, userId, adminIds);
              statusUpdater.stopUpdating(identifier);
              logger.debug('Stopped existing process before restart', { processId: identifier });
            } catch (stopError) {
              logger.warn('Failed to stop existing process', {
                processId: identifier,
                error: stopError.message,
              });
            }
          }

          await startCommand(interaction, identifier, userId, adminIds);
        }

        // Stop process button
        else if (action === 'stop') {
          logger.debug('Stop button clicked', { processId: identifier });

          // Check if process exists
          const processData = processManager.getProcess(identifier);
          if (!processData) {
            return interaction.reply({
              content: '⚠️ Process not found or already stopped.',
              ephemeral: true,
            });
          }

          await interaction.deferReply({ ephemeral: true });

          try {
            const message = processData?.message;

            processManager.stopProcess(identifier, userId, adminIds);

            // Stop status updates
            statusUpdater.stopUpdating(identifier);

            // Delete the process embed message
            if (message) {
              try {
                await message.delete();
                logger.debug('Process embed message deleted', { processId: identifier });
              } catch (deleteError) {
                logger.warn('Failed to delete process message', {
                  processId: identifier,
                  error: deleteError.message,
                });
              }
            }

            // Clean up process data
            processManager.removeProcess(identifier);

            await interaction.editReply({
              content: '✅ Process stopped and message deleted.',
            });
            logger.info('Process stopped via button', { processId: identifier, userId });
          } catch (error) {
            logger.warn('Failed to stop process', { processId: identifier, error: error.message });
            await interaction.editReply({
              content: `❌ Error stopping process: ${error.message}`,
            });
          }
        }

        // Stream to thread button
        else if (action === 'thread') {
          logger.debug('Thread button clicked', { processId: identifier });
          await interaction.deferReply({ ephemeral: true });

          const processData = processManager.getProcess(identifier);
          if (!processData) {
            logger.warn('Thread creation failed: process not found', { processId: identifier });
            return interaction.editReply({
              content: 'Process not found or has been cleaned up.',
            });
          }

          if (processData.thread) {
            logger.debug('Thread already exists', {
              processId: identifier,
              threadId: processData.thread.id,
            });
            return interaction.editReply({
              content: 'Thread already exists for this process.',
            });
          }

          const thread = await statusUpdater.createThread(identifier);
          if (thread) {
            logger.info('Thread created via button', {
              processId: identifier,
              threadId: thread.id,
              userId,
            });
            await interaction.editReply({
              content: `Thread created: ${thread.toString()}`,
            });
            // Immediately update the message to remove the thread button
            await statusUpdater.updateMessage(identifier);
          } else {
            logger.warn('Thread creation failed', { processId: identifier });
            await interaction.editReply({
              content: 'Failed to create thread. Check bot permissions.',
            });
          }
        }

        // View logs button
        else if (action === 'logs') {
          logger.debug('Logs button clicked', { processId: identifier });
          await interaction.deferReply({ ephemeral: true });

          const processData = processManager.getProcess(identifier);
          if (!processData) {
            logger.warn('Logs fetch failed: process not found', { processId: identifier });
            return interaction.editReply({
              content: 'Process not found or has been cleaned up.',
            });
          }

          const fullOutput = processData.fullOutput || [];
          const fullError = processData.fullError || [];

          logger.debug('Preparing logs', {
            processId: identifier,
            stdoutLines: fullOutput.length,
            stderrLines: fullError.length,
          });

          let logContent = `=== ${processData.command.label} Logs ===\n`;
          logContent += `Status: ${processData.status}\n`;
          logContent += `Started: ${new Date(processData.startTime).toISOString()}\n`;
          if (processData.endTime) {
            logContent += `Ended: ${new Date(processData.endTime).toISOString()}\n`;
          }
          logContent += `\n=== STDOUT (${fullOutput.length} lines) ===\n`;
          logContent += fullOutput.join('\n') || '(empty)';
          logContent += `\n\n=== STDERR (${fullError.length} lines) ===\n`;
          logContent += fullError.join('\n') || '(empty)';

          // Send as file attachment if content is large
          if (logContent.length > 1900) {
            logger.debug('Sending logs as attachment', {
              processId: identifier,
              contentLength: logContent.length,
            });
            const buffer = Buffer.from(logContent, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, {
              name: `${processData.command.id}-logs.txt`,
            });
            await interaction.editReply({
              content: 'Full logs attached:',
              files: [attachment],
            });
          } else {
            await interaction.editReply({
              content: `\`\`\`\n${logContent}\n\`\`\``,
            });
          }

          logger.info('Logs sent', { processId: identifier, userId });
        }

        // Refresh panel button
        else if (action === 'refresh') {
          logger.debug('Refresh panel button clicked', { userId });

          // Rate limit refresh button more strictly
          if (!checkCooldown(userId, 'refresh-panel')) {
            return interaction.reply({
              content: '⏳ Please wait a moment before refreshing again.',
              ephemeral: true,
            });
          }

          await interaction.deferUpdate();

          try {
            // Load current config (may be cached, that's fine - we just want current state)
            const config = await configManager.loadConfig();

            if (!config.commands || config.commands.length === 0) {
              await interaction.message.edit({
                content: 'No commands configured. Please add commands to `config/commands.json`',
                embeds: [],
                components: [],
              });
              return;
            }

            // Rebuild the control panel with current config state
            const { embed, components } = buildControlPanel(config);
            embed.setFooter({ text: 'Refreshed' });

            await interaction.message.edit({
              embeds: [embed],
              components,
            });

            logger.info('Control panel refreshed', { userId });
          } catch (error) {
            logger.warn('Panel refresh failed', { error: error.message, userId });
            try {
              await interaction.followUp({
                content: `Error refreshing panel: ${error.message}`,
                ephemeral: true,
              });
            } catch (followUpError) {
              logger.warn('Failed to send follow-up error', { error: followUpError.message });
            }
          }
        }

        // Delete message button
        else if (action === 'delete') {
          logger.debug('Delete button clicked', { messageId: identifier });
          await interaction.deferReply({ ephemeral: true });

          try {
            const messageId = identifier;
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);

            if (message) {
              // Clean up process data if this is a process message
              const processes = processManager.getAllProcesses();
              const processData = processes.find((p) => p.message?.id === messageId);
              if (processData) {
                logger.debug('Cleaning up process data on delete', {
                  processId: processData.processId,
                });
                processManager.removeProcess(processData.processId);
              }

              await message.delete();
              await interaction.editReply({
                content: 'Message deleted.',
              });
              logger.info('Message deleted via button', { messageId, userId });
            } else {
              logger.warn('Message not found for deletion', { messageId });
              await interaction.editReply({
                content: 'Message not found.',
              });
            }
          } catch (error) {
            logger.warn('Message deletion failed', { messageId: identifier, error: error.message });
            await interaction.editReply({
              content: `Error deleting message: ${error.message}`,
            });
          }
        }

        // Unknown action
        else {
          logger.warn('Unknown button action', { action, identifier });
        }
      } catch (error) {
        logger.logError(error, { action, identifier, userId, phase: 'buttonHandler' });

        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription(`\`\`\`\n${error.message}\n\`\`\``)
          .setColor(0xe74c3c);

        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          logger.warn('Failed to send error response', {
            error: replyError.message,
            originalError: error.message,
            action,
            userId,
          });
        }
      }
      return;
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      logger.debug('Processing slash command', { commandName: interaction.commandName, userId });

      if (!command) {
        logger.warn('Unknown slash command', { commandName: interaction.commandName });
        return;
      }

      try {
        logger.debug('Executing command', { commandName: interaction.commandName });
        await command.execute(interaction);
        logger.debug('Command executed successfully', { commandName: interaction.commandName });
      } catch (error) {
        logger.logError(error, { command: interaction.commandName, userId, phase: 'slashCommand' });

        const reply = {
          content: 'There was an error while executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }
  },
};
