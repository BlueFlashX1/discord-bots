const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const configManager = require('../services/configManager');
const processManager = require('../services/processManager');
const logger = require('../services/logger');

// Helper function to build control panel embed and components (shared with interaction handler)
function buildControlPanel(config) {
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
  data: new SlashCommandBuilder()
    .setName('control-panel')
    .setDescription('Display command control panel with buttons'),

  async execute(interaction) {
    // Admin check
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()) || [];
    if (!processManager.isAdmin(interaction.user.id, adminIds)) {
      return interaction.reply({
        content: 'Only admins can use this command.',
        ephemeral: true,
      });
    }

    try {
      const config = await configManager.loadConfig();

      if (!config.commands || config.commands.length === 0) {
        return interaction.reply({
          content: 'No commands configured. Please add commands to `config/commands.json`',
          ephemeral: true,
        });
      }

      // Use shared build function
      const { embed, components } = buildControlPanel(config);

      await interaction.reply({
        embeds: [embed],
        components,
      });
    } catch (error) {
      logger.logError(error, { command: 'control-panel' });
      try {
        await interaction.reply({
          content: `Error loading control panel: ${error.message}`,
          ephemeral: true,
        });
      } catch (replyError) {
        logger.warn('Failed to send error reply', {
          error: replyError.message,
          originalError: error.message,
        });
      }
    }
  },
};
