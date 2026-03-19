const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function createEmbed(title, description, color = 0x5b2d91) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp(new Date());
}

async function replyEphemeral(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ ...payload, ephemeral: true });
  }
  return interaction.reply({ ...payload, ephemeral: true });
}

function describeProfile(profile, pendingCount = 0) {
  return [
    `Enabled: **${profile.enabled ? 'yes' : 'no'}**`,
    `Target User: \`${profile.targetUserId || 'unset'}\``,
    `Allowlisted Guilds: **${profile.allowGuildIds.length}**`,
    `Allowlisted Channels: **${profile.allowChannelIds.length}**`,
    `Deployed Guilds: **${profile.deployedGuildIds.length}**`,
    `Cooldown: **${profile.cooldownSeconds}s**`,
    `Reply Engine: **AI-first (always)**`,
    `Hourly Limits: global **${profile.maxRepliesGlobalPerHour}**, guild **${profile.maxRepliesPerGuildPerHour}**, channel **${profile.maxRepliesPerChannelPerHour}**`,
    `Pending Mentions: **${pendingCount}**`,
    `Status: ${profile.statusTemplate}`,
  ].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shadowaway')
    .setDescription('Manage shadow away auto-reply behavior')
    .addSubcommand((sub) =>
      sub
        .setName('on')
        .setDescription('Enable away mode and set status text')
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Status clause inserted after "My liege"')
            .setRequired(true)
            .setMaxLength(300)
        )
    )
    .addSubcommand((sub) => sub.setName('off').setDescription('Disable away mode'))
    .addSubcommand((sub) => sub.setName('status').setDescription('Show current shadow away configuration'))
    .addSubcommand((sub) => sub.setName('enabled').setDescription('Show whether away mode is enabled'))
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Update status text without toggling away mode')
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Status clause inserted after "My liege"')
            .setRequired(true)
            .setMaxLength(300)
        )
    )
    .addSubcommand((sub) => sub.setName('back').setDescription('Manually close away session and emit pending digest'))
    .addSubcommandGroup((group) =>
      group
        .setName('ai')
        .setDescription('AI reply controls')
        .addSubcommand((sub) =>
          sub
            .setName('mode')
            .setDescription('Set static or AI reply mode')
            .addStringOption((opt) =>
              opt
                .setName('value')
                .setDescription('Reply mode')
                .setRequired(true)
                .addChoices(
                  { name: 'static', value: 'static' },
                  { name: 'ai', value: 'ai' }
                )
            )
        )
    ),

  async execute(interaction, client) {
    const service = client.shadowAwayService;
    if (!service) {
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away', 'Service is not initialized.', 0xff4d6d)],
      });
    }

    if (!service.isOwner(interaction.user.id)) {
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away', 'Access denied. Owner-only command.', 0xff4d6d)],
      });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === 'ai' && sub === 'mode') {
      const mode = interaction.options.getString('value', true);
      const profile = service.setReplyMode(mode);
      const aiNote = service.isAiAvailable()
        ? 'AI replies are active by default.'
        : 'OpenAI key is missing; runtime will fallback to static replies.';
      return replyEphemeral(interaction, {
        embeds: [createEmbed('AI Reply Engine', `${aiNote}\nRequested mode \`${mode}\` is now treated as informational only.`)],
      });
    }

    if (sub === 'on') {
      const status = interaction.options.getString('status', true);
      const profile = service.setAwayOn(status);
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away Enabled', `Status set to:\n${profile.statusTemplate}`)],
      });
    }

    if (sub === 'off') {
      service.setAwayOff();
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away Disabled', 'Away mode has been disabled.')],
      });
    }

    if (sub === 'set') {
      const status = interaction.options.getString('status', true);
      const profile = service.setStatus(status);
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Status Updated', `New status:\n${profile.statusTemplate}`)],
      });
    }

    if (sub === 'status') {
      const profile = service.getProfile();
      const pending = service.getPendingSummary();
      const aiSuffix = `\nAI Available: **${service.isAiAvailable() ? 'yes' : 'no'}**`;
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away Status', `${describeProfile(profile, pending.pendingCount)}${aiSuffix}`, 0x6f42c1)],
      });
    }

    if (sub === 'enabled') {
      const profile = service.getProfile();
      const pending = service.getPendingSummary();
      const updatedMs = Date.parse(profile.updatedAt || '');
      const updatedLine = Number.isFinite(updatedMs)
        ? `<t:${Math.floor(updatedMs / 1000)}:R>`
        : 'unknown';
      const awayMeta = service.getAwayDurationMeta(profile);
      const stateWord = profile.enabled ? 'ENABLED' : 'DISABLED';
      const color = profile.enabled ? 0x6f42c1 : 0x8b8b96;
      const contextLine = `Context: ${profile.statusTemplate}`;
      const awaySinceLine = awayMeta
        ? `Away Since: <t:${Math.floor(awayMeta.awaySinceMs / 1000)}:F> (<t:${Math.floor(awayMeta.awaySinceMs / 1000)}:R>)`
        : 'Away Since: not active';
      const awayDurationLine = awayMeta ? `Away Duration: **${awayMeta.awayForText}**` : null;
      const detailLines = [
        `Away Mode: **${stateWord}**`,
        contextLine,
        awaySinceLine,
        awayDurationLine,
        `Pending Mentions: **${pending.pendingCount}**`,
        `Last Updated: ${updatedLine}`,
      ].filter(Boolean);
      return replyEphemeral(interaction, {
        embeds: [
          createEmbed(
            'Shadow Away Enabled Check',
            detailLines.join('\n'),
            color
          ),
        ],
      });
    }

    if (sub === 'back') {
      const profile = service.getProfile();
      let embeds = [];
      let mentionCount = 0;

      if (profile.enabled) {
        const result = await service.closeAwaySessionAndReport({
          triggerType: 'manual_back_command',
          guildId: interaction.guildId || null,
          channelId: interaction.channelId || null,
          channel: interaction.channel,
          ownerUserId: interaction.user.id,
          deliveryMode: 'interaction_private',
        });
        mentionCount = result.mentionCount;
        embeds = result.embeds || [];
      } else {
        const digestMeta = service.getPendingReturnDigestMeta();
        if (digestMeta && digestMeta.guildId && digestMeta.channelId) {
          const inExpectedChannel =
            interaction.guildId === digestMeta.guildId && interaction.channelId === digestMeta.channelId;
          if (!inExpectedChannel) {
            return replyEphemeral(interaction, {
              embeds: [
                createEmbed(
                  'Return Report',
                  `Shadow report is locked to the return channel where your first outbound message was detected: <#${digestMeta.channelId}> in guild \`${digestMeta.guildId}\`.`
                ),
              ],
            });
          }
        }

        const cached = service.consumePendingReturnDigest();
        if (cached) {
          mentionCount = Array.isArray(cached.entries) ? cached.entries.length : 0;
          embeds = service.buildDigestEmbeds(cached.entries || []);
        }
      }

      if (!mentionCount || embeds.length === 0) {
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Return Report', 'No pending mention digest is available.')],
        });
      }

      try {
        return await replyEphemeral(interaction, { embeds });
      } catch (error) {
        await service.deliverEmbedsToOwnerDM(interaction.user.id, embeds);
        throw error;
      }
    }

    return replyEphemeral(interaction, {
      embeds: [createEmbed('Shadow Away', 'Unsupported subcommand.', 0xff4d6d)],
    });
  },
};
