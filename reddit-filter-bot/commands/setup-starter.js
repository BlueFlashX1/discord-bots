const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { exec } = require('child_process');
const path = require('path');

const CONTROL_PANEL_DIR = path.join(__dirname, '../../command-control-bot');
const STARTER_CHANNEL_ID = '1463024029266083921';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-starter')
    .setDescription('Post a persistent embed to start the Control Panel bot'),

  async execute(interaction) {
    // Admin check
    const adminIds = ['164568266730242048'];
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: 'Only admins can use this command.',
        ephemeral: true,
      });
    }

    const channel = interaction.client.channels.cache.get(STARTER_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({
        content: `Channel ${STARTER_CHANNEL_ID} not found.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Control Panel Starter')
      .setDescription('Click the button below to start the Command Control Panel bot.')
      .setColor(0x3498db)
      .addFields(
        { name: 'Status', value: 'Click to start', inline: true },
        { name: 'Bot', value: 'Control Panel#6328', inline: true }
      )
      .setFooter({ text: 'This embed persists - use anytime to start the Control Panel' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start-control-panel')
        .setLabel('Start Control Panel')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀')
    );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `Starter embed posted to <#${STARTER_CHANNEL_ID}>`,
      ephemeral: true,
    });
  },

  // Handle button interactions
  async handleButton(interaction) {
    if (interaction.customId !== 'start-control-panel') return false;

    // Admin check
    const adminIds = ['164568266730242048'];
    if (!adminIds.includes(interaction.user.id)) {
      await interaction.reply({
        content: 'Only admins can start the Control Panel.',
        ephemeral: true,
      });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });

    // Start the Control Panel bot
    exec(`cd "${CONTROL_PANEL_DIR}" && node index.js`, (error, stdout, stderr) => {
      // This runs in background, we don't wait for it
    });

    // Detach the process so it keeps running
    const { spawn } = require('child_process');
    const child = spawn('node', ['index.js'], {
      cwd: CONTROL_PANEL_DIR,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // Update the embed to show it was started
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setFields(
        { name: 'Status', value: '✅ Started', inline: true },
        { name: 'Bot', value: 'Control Panel#6328', inline: true },
        { name: 'Started by', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Started at', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setColor(0x2ecc71);

    await interaction.message.edit({ embeds: [updatedEmbed], components: interaction.message.components });

    await interaction.editReply({
      content: 'Control Panel bot is starting... It should be online shortly.',
    });

    return true;
  },
};
