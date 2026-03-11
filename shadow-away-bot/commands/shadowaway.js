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
    `Reply Mode: **${profile.replyMode || 'static'}**`,
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
    .addSubcommand((sub) => sub.setName('test').setDescription('Dry-run current channel against scope gates'))
    .addSubcommand((sub) => sub.setName('validate-perms').setDescription('Check bot permissions in this channel'))
    .addSubcommand((sub) => sub.setName('why-last-skip').setDescription('Show last auto-reply skip reason'))
    .addSubcommand((sub) => sub.setName('emergency-off').setDescription('Force disable away mode immediately'))
    .addSubcommandGroup((group) =>
      group
        .setName('allow')
        .setDescription('Allowlist management')
        .addSubcommand((sub) =>
          sub
            .setName('guild-add')
            .setDescription('Allow replies in a guild')
            .addStringOption((opt) => opt.setName('guild_id').setDescription('Guild ID').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('guild-remove')
            .setDescription('Remove guild from allowlist')
            .addStringOption((opt) => opt.setName('guild_id').setDescription('Guild ID').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('channel-add')
            .setDescription('Allow only specific channels (optional narrowing)')
            .addStringOption((opt) => opt.setName('channel_id').setDescription('Channel ID').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('channel-remove')
            .setDescription('Remove channel from allowlist')
            .addStringOption((opt) => opt.setName('channel_id').setDescription('Channel ID').setRequired(true))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('cooldown')
        .setDescription('Cooldown controls')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Set global reply cooldown in seconds')
            .addIntegerOption((opt) =>
              opt.setName('seconds').setDescription('Seconds (5-3600)').setRequired(true).setMinValue(5).setMaxValue(3600)
            )
        )
    )
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

    if (group === 'allow') {
      if (sub === 'guild-add') {
        const guildId = interaction.options.getString('guild_id', true).trim();
        const profile = service.addAllowGuild(guildId);
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Allowlist Updated', `Guild added: \`${guildId}\`\nTotal guilds: **${profile.allowGuildIds.length}**`)],
        });
      }

      if (sub === 'guild-remove') {
        const guildId = interaction.options.getString('guild_id', true).trim();
        const profile = service.removeAllowGuild(guildId);
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Allowlist Updated', `Guild removed: \`${guildId}\`\nTotal guilds: **${profile.allowGuildIds.length}**`)],
        });
      }

      if (sub === 'channel-add') {
        const channelId = interaction.options.getString('channel_id', true).trim();
        const profile = service.addAllowChannel(channelId);
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Allowlist Updated', `Channel added: \`${channelId}\`\nTotal channels: **${profile.allowChannelIds.length}**`)],
        });
      }

      if (sub === 'channel-remove') {
        const channelId = interaction.options.getString('channel_id', true).trim();
        const profile = service.removeAllowChannel(channelId);
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Allowlist Updated', `Channel removed: \`${channelId}\`\nTotal channels: **${profile.allowChannelIds.length}**`)],
        });
      }
    }

    if (group === 'cooldown' && sub === 'set') {
      const seconds = interaction.options.getInteger('seconds', true);
      const profile = service.setCooldownSeconds(seconds);
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Cooldown Updated', `Global cooldown set to **${profile.cooldownSeconds}s**.`)],
      });
    }

    if (group === 'ai' && sub === 'mode') {
      const mode = interaction.options.getString('value', true);
      const profile = service.setReplyMode(mode);
      const aiNote = profile.replyMode === 'ai' && !service.isAiAvailable()
        ? '\nOpenAI key is missing; runtime will fallback to static replies.'
        : '';
      return replyEphemeral(interaction, {
        embeds: [createEmbed('AI Mode Updated', `Reply mode set to **${profile.replyMode}**.${aiNote}`)],
      });
    }

    if (sub === 'on') {
      const status = interaction.options.getString('status', true);
      const profile = service.setAwayOn(status);
      const warning = profile.allowGuildIds.length === 0
        ? '\n\nWarning: no allowlisted guilds yet. Replies are deny-all until allowlist is configured.'
        : '';
      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away Enabled', `Status set to:\n${profile.statusTemplate}${warning}`)],
      });
    }

    if (sub === 'off' || sub === 'emergency-off') {
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

    if (sub === 'test') {
      if (!interaction.guildId || !interaction.channelId) {
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Shadow Away Test', 'This command must be used in a guild channel.', 0xff8c42)],
        });
      }

      const scope = service.evaluateScope(interaction.guildId, interaction.channelId);
      if (scope.ok) {
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Shadow Away Test', 'PASS: current channel is within allowlist/deployment scope.', 0x00a86b)],
        });
      }

      return replyEphemeral(interaction, {
        embeds: [createEmbed('Shadow Away Test', `FAIL: ${scope.reason}`, 0xff8c42)],
      });
    }

    if (sub === 'validate-perms') {
      const result = await service.validateChannelPermissions(interaction.channel);
      if (result.ok) {
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Permission Check', 'PASS: bot has required permissions in this channel.', 0x00a86b)],
        });
      }

      return replyEphemeral(interaction, {
        embeds: [createEmbed('Permission Check', `Missing permissions:\n${result.missing.map((x) => `• ${x}`).join('\n')}`, 0xff8c42)],
      });
    }

    if (sub === 'why-last-skip') {
      const lastSkip = service.getLastSkip();
      if (!lastSkip) {
        return replyEphemeral(interaction, {
          embeds: [createEmbed('Last Skip', 'No skip reason recorded.')],
        });
      }

      return replyEphemeral(interaction, {
        embeds: [createEmbed('Last Skip', `Reason: **${lastSkip.reason}**\nTimestamp: ${lastSkip.timestamp}\nContext: \`${JSON.stringify(lastSkip.context || {})}\``)],
      });
    }

    if (sub === 'back') {
      const result = await service.closeAwaySessionAndReport({
        triggerType: 'manual_back_command',
        guildId: interaction.guildId || null,
        channelId: interaction.channelId || null,
        channel: interaction.channel,
        ownerUserId: interaction.user.id,
      });

      return replyEphemeral(interaction, {
        embeds: [createEmbed('Return Report', `Away session closed. Digest mentions: **${result.mentionCount}**.`)],
      });
    }

    return replyEphemeral(interaction, {
      embeds: [createEmbed('Shadow Away', 'Unsupported subcommand.', 0xff4d6d)],
    });
  },
};
