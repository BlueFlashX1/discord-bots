const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ONE_HOUR_MS, ONE_DAY_MS } = require('./stateStore');

const DEDUPE_TTL_MS = 10 * 60 * 1000;
const TRIGGER_COOLDOWN_MS = 15 * 60 * 1000;
const CHANNEL_COOLDOWN_MS = 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const PENDING_QUEUE_CAP = 1000;

class ShadowAwayService {
  constructor({ client, store, logger, aiResponder }) {
    this.client = client;
    this.store = store;
    this.logger = logger;
    this.aiResponder = aiResponder || null;
  }

  isOwner(userId) {
    const profile = this.store.getProfile();
    return profile.ownerUserIds.includes(userId);
  }

  getPrimaryOwnerId() {
    const profile = this.store.getProfile();
    return profile.ownerUserIds[0] || profile.targetUserId;
  }

  getProfile() {
    return this.store.getProfile();
  }

  setAwayOn(statusTemplate) {
    const nextStatus = this._sanitizeStatus(statusTemplate);
    return this.store.updateProfile((profile) => ({
      ...profile,
      enabled: true,
      statusTemplate: nextStatus,
    }));
  }

  setAwayOff() {
    return this.store.mutate((st) => {
      st.profile.enabled = false;
      st.profile.updatedAt = new Date().toISOString();
    }).profile;
  }

  setStatus(statusTemplate) {
    const nextStatus = this._sanitizeStatus(statusTemplate);
    return this.store.updateProfile({ statusTemplate: nextStatus });
  }

  setCooldownSeconds(seconds) {
    const safe = Math.max(5, Math.min(3600, Number(seconds) || 60));
    return this.store.updateProfile({ cooldownSeconds: safe });
  }

  setReplyMode(mode) {
    const normalized = String(mode || '').toLowerCase() === 'ai' ? 'ai' : 'static';
    return this.store.updateProfile({ replyMode: normalized });
  }

  addAllowGuild(guildId) {
    return this.store.updateProfile((profile) => ({
      allowGuildIds: [...new Set([...(profile.allowGuildIds || []), guildId])],
    }));
  }

  removeAllowGuild(guildId) {
    return this.store.updateProfile((profile) => ({
      allowGuildIds: (profile.allowGuildIds || []).filter((id) => id !== guildId),
    }));
  }

  addAllowChannel(channelId) {
    return this.store.updateProfile((profile) => ({
      allowChannelIds: [...new Set([...(profile.allowChannelIds || []), channelId])],
    }));
  }

  removeAllowChannel(channelId) {
    return this.store.updateProfile((profile) => ({
      allowChannelIds: (profile.allowChannelIds || []).filter((id) => id !== channelId),
    }));
  }

  getLastSkip() {
    return this.store.getState().lastSkip;
  }

  markLastSkip(reason, context = {}) {
    this.store.mutate((st) => {
      st.lastSkip = {
        reason,
        context,
        timestamp: new Date().toISOString(),
      };
    });
  }

  evaluateScope(guildId, channelId) {
    const profile = this.store.getProfile();

    if (!guildId) return { ok: false, reason: 'not_in_guild' };

    if (profile.deployedGuildIds.length > 0 && !profile.deployedGuildIds.includes(guildId)) {
      return { ok: false, reason: 'guild_not_deployed' };
    }

    if (!profile.allowGuildIds.includes(guildId)) {
      return { ok: false, reason: 'guild_not_allowlisted' };
    }

    if (profile.allowChannelIds.length > 0 && !profile.allowChannelIds.includes(channelId)) {
      return { ok: false, reason: 'channel_not_allowlisted' };
    }

    return { ok: true };
  }

  isAiAvailable() {
    return Boolean(this.aiResponder && this.aiResponder.isEnabled());
  }

  async buildReplyContent(triggerUserId, sourceMessageText = '') {
    const profile = this.store.getProfile();
    let statusClause = profile.statusTemplate;

    if (profile.replyMode === 'ai' && this.aiResponder?.isEnabled()) {
      statusClause = await this.aiResponder.rephraseStatusClause(profile.statusTemplate, sourceMessageText);
    }

    return `<@${triggerUserId}>, your message is noted. My liege ${statusClause}\n${profile.signatureMarker}`;
  }

  async handleMessageCreate(message) {
    if (message.author?.bot || message.webhookId) return;

    const profile = this.store.getProfile();
    if (!profile.targetUserId) return;

    const ownerReturnHandled = await this._handleReturnSignalIfNeeded(message, profile);
    if (ownerReturnHandled) return;

    if (!profile.enabled) return;
    if (!message.guild || !message.channel) return;
    if (!message.mentions?.users?.has(profile.targetUserId)) return;

    const scope = this.evaluateScope(message.guild.id, message.channel.id);
    if (!scope.ok) {
      this.markLastSkip(scope.reason, {
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: message.id,
      });
      return;
    }

    if (message.content?.includes(profile.signatureMarker)) {
      this.markLastSkip('loop_signature_marker_detected', {
        messageId: message.id,
      });
      return;
    }

    this._recordPendingMention(message);

    const gate = this._shouldSendAutoReply(message);
    if (!gate.ok) {
      this.markLastSkip(gate.reason, {
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
        messageId: message.id,
      });
      return;
    }

    try {
      const content = await this.buildReplyContent(message.author.id, message.content || '');
      const reply = await message.reply({
        content,
        allowedMentions: {
          users: [message.author.id],
          repliedUser: false,
          parse: [],
        },
      });

      this._commitPostSend(message, reply.id);
      this.logger.info('Shadow auto-reply sent', {
        event: 'shadowaway_auto_reply_sent',
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
        sourceMessageId: message.id,
        replyMessageId: reply.id,
      });
    } catch (error) {
      this.logger.error('Failed to send shadow auto-reply', error, {
        event: 'shadowaway_auto_reply_failed',
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
        sourceMessageId: message.id,
      });
      this.markLastSkip('reply_send_failed', {
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
      });
    }
  }

  _recordPendingMention(message) {
    const preview = (message.content || '').slice(0, 200);

    this.store.mutate((st) => {
      st.pendingMentions.push({
        triggerUserId: message.author.id,
        triggerUserTag: message.author.tag,
        guildId: message.guild.id,
        guildName: message.guild.name,
        channelId: message.channel.id,
        channelName: this._channelNameForDigest(message.channel),
        messageId: message.id,
        messageLink: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
        messageContentPreview: preview,
        timestampMs: Date.now(),
      });

      if (st.pendingMentions.length > PENDING_QUEUE_CAP) {
        st.pendingMentions = st.pendingMentions.slice(st.pendingMentions.length - PENDING_QUEUE_CAP);
      }
    });
  }

  _shouldSendAutoReply(message) {
    const state = this.store.getState();
    const profile = state.profile;
    const now = Date.now();

    if (state.cooldowns.globalUntilMs > now) {
      return { ok: false, reason: 'global_cooldown_active' };
    }

    const triggerKey = `${profile.targetUserId}:${message.guild.id}:${message.channel.id}:${message.author.id}`;
    if (state.dedupe[triggerKey] && state.dedupe[triggerKey] > now) {
      return { ok: false, reason: 'dedupe_active' };
    }

    const triggerCooldownKey = `${message.guild.id}:${message.author.id}`;
    if ((state.cooldowns.byTrigger[triggerCooldownKey] || 0) > now) {
      return { ok: false, reason: 'trigger_cooldown_active' };
    }

    const channelCooldownKey = `${message.guild.id}:${message.channel.id}`;
    if ((state.cooldowns.byChannel[channelCooldownKey] || 0) > now) {
      return { ok: false, reason: 'channel_cooldown_active' };
    }

    const globalCount = this._countWindow(state.rateHistory.global, now);
    if (globalCount >= profile.maxRepliesGlobalPerHour) {
      return { ok: false, reason: 'global_hourly_limit_reached' };
    }

    const guildCount = this._countWindow(state.rateHistory.guild[message.guild.id], now);
    if (guildCount >= profile.maxRepliesPerGuildPerHour) {
      return { ok: false, reason: 'guild_hourly_limit_reached' };
    }

    const channelCount = this._countWindow(state.rateHistory.channel[message.channel.id], now);
    if (channelCount >= profile.maxRepliesPerChannelPerHour) {
      return { ok: false, reason: 'channel_hourly_limit_reached' };
    }

    return {
      ok: true,
      dedupeKey: triggerKey,
      triggerCooldownKey,
      channelCooldownKey,
    };
  }

  _countWindow(entries, now) {
    if (!Array.isArray(entries)) return 0;
    return entries.filter((ts) => now - ts < ONE_HOUR_MS).length;
  }

  _commitPostSend(message, replyMessageId) {
    const now = Date.now();
    const profile = this.store.getProfile();
    const dedupeKey = `${profile.targetUserId}:${message.guild.id}:${message.channel.id}:${message.author.id}`;
    const triggerCooldownKey = `${message.guild.id}:${message.author.id}`;
    const channelCooldownKey = `${message.guild.id}:${message.channel.id}`;

    this.store.mutate((st) => {
      st.dedupe[dedupeKey] = now + DEDUPE_TTL_MS;
      st.cooldowns.globalUntilMs = now + (profile.cooldownSeconds * 1000);
      st.cooldowns.byTrigger[triggerCooldownKey] = now + TRIGGER_COOLDOWN_MS;
      st.cooldowns.byChannel[channelCooldownKey] = now + CHANNEL_COOLDOWN_MS;

      st.rateHistory.global.push(now);
      st.rateHistory.guild[message.guild.id] = st.rateHistory.guild[message.guild.id] || [];
      st.rateHistory.guild[message.guild.id].push(now);
      st.rateHistory.channel[message.channel.id] = st.rateHistory.channel[message.channel.id] || [];
      st.rateHistory.channel[message.channel.id].push(now);

      st.lastSkip = null;
      st.lastDispatch = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
        sourceMessageId: message.id,
        replyMessageId,
        timestamp: new Date(now).toISOString(),
      };
    });
  }

  async _handleReturnSignalIfNeeded(message, profile) {
    if (!profile.enabled) return false;
    if (message.author.id !== profile.targetUserId) return false;
    if (!message.guild || !message.channel) return false;

    const plainText = (message.content || '').trim();
    if (!plainText) return false;

    const scope = this.evaluateScope(message.guild.id, message.channel.id);
    if (!scope.ok) return false;

    await this.closeAwaySessionAndReport({
      triggerType: 'first_outbound_message',
      guildId: message.guild.id,
      channelId: message.channel.id,
      channel: message.channel,
      ownerUserId: message.author.id,
    });

    return true;
  }

  async closeAwaySessionAndReport({ triggerType, guildId, channelId, channel, ownerUserId }) {
    const state = this.store.getState();
    const profile = state.profile;
    const pending = [...(state.pendingMentions || [])];

    this.store.mutate((st) => {
      st.profile.enabled = false;
      st.profile.updatedAt = new Date().toISOString();
      st.pendingMentions = [];
      st.lastReturnDigest = {
        triggerType,
        guildId,
        channelId,
        mentionCount: pending.length,
        timestamp: new Date().toISOString(),
      };
    });

    if (!pending.length) {
      this.logger.info('Away session closed with no pending mentions', {
        event: 'shadowaway_return_no_pending',
        triggerType,
        guildId,
        channelId,
      });
      return { delivered: false, mentionCount: 0, reason: 'no_pending_mentions' };
    }

    const embeds = this._buildDigestEmbeds(pending);

    let delivered = false;
    let deliveryTarget = 'none';

    if (channel) {
      try {
        await channel.send({ embeds });
        delivered = true;
        deliveryTarget = 'return_channel';
      } catch (error) {
        this.logger.warn('Failed to send return digest to channel; trying DM fallback', {
          event: 'shadowaway_digest_channel_failed',
          guildId,
          channelId,
          error: error.message,
        });
      }
    }

    if (!delivered) {
      try {
        const ownerId = ownerUserId || profile.targetUserId || this.getPrimaryOwnerId();
        const ownerUser = await this.client.users.fetch(ownerId);
        await ownerUser.send({ embeds });
        delivered = true;
        deliveryTarget = 'dm_fallback';
      } catch (error) {
        this.logger.error('Failed to deliver return digest via DM fallback', error, {
          event: 'shadowaway_digest_dm_failed',
          ownerUserId: ownerUserId || profile.targetUserId,
        });
      }
    }

    this.logger.info('Away session closed with digest result', {
      event: 'shadowaway_return_digest_result',
      triggerType,
      delivered,
      deliveryTarget,
      mentionCount: pending.length,
      guildId,
      channelId,
    });

    return { delivered, mentionCount: pending.length, deliveryTarget };
  }

  _buildDigestEmbeds(pendingMentions) {
    const sorted = [...pendingMentions].sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

    const grouped = new Map();
    for (const item of sorted) {
      const groupKey = `${item.guildId}:${item.channelId}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          guildName: item.guildName,
          channelName: item.channelName,
          guildId: item.guildId,
          channelId: item.channelId,
          rows: [],
        });
      }
      grouped.get(groupKey).rows.push(item);
    }

    const header = new EmbedBuilder()
      .setTitle('Shadow Report: Mentions While Away')
      .setColor(0x5b2d91)
      .setDescription(
        `My liege, ${pendingMentions.length} mention${pendingMentions.length === 1 ? '' : 's'} were recorded while you were away.`
      )
      .setFooter({ text: 'Use the message links to jump directly to each mention.' })
      .setTimestamp(new Date());

    const detailEmbeds = [];
    let current = new EmbedBuilder().setColor(0x1f1038).setTitle('Shadow Report Details');
    let fieldCount = 0;

    for (const group of grouped.values()) {
      const lines = group.rows.map((row) => {
        const ts = row.timestampMs ? Math.floor(row.timestampMs / 1000) : Math.floor(Date.now() / 1000);
        return `• <@${row.triggerUserId}> ([jump](${row.messageLink})) <t:${ts}:R>`;
      });

      const fieldValue = lines.join('\n').slice(0, 1000) || 'No entries.';
      current.addFields({
        name: `${group.guildName} • #${group.channelName}`,
        value: fieldValue,
        inline: false,
      });
      fieldCount += 1;

      if (fieldCount >= 6) {
        detailEmbeds.push(current);
        current = new EmbedBuilder().setColor(0x1f1038).setTitle('Shadow Report Details (Continued)');
        fieldCount = 0;
      }
    }

    if (fieldCount > 0) {
      detailEmbeds.push(current);
    }

    return [header, ...detailEmbeds].slice(0, 10);
  }

  _channelNameForDigest(channel) {
    if (typeof channel.name === 'string' && channel.name.length) {
      return channel.name;
    }
    return `channel-${channel.id}`;
  }

  _sanitizeStatus(input) {
    const trimmed = String(input || '').trim().replace(/\s+/g, ' ');
    const limited = trimmed.slice(0, 300);
    return limited || 'is currently away.';
  }

  async validateChannelPermissions(channel) {
    if (!channel?.guild) {
      return { ok: false, missing: ['guild_only'] };
    }

    const me = channel.guild.members.me || await channel.guild.members.fetchMe();
    const perms = channel.permissionsFor(me);
    const required = [
      { key: 'ViewChannel', flag: PermissionsBitField.Flags.ViewChannel },
      { key: 'SendMessages', flag: PermissionsBitField.Flags.SendMessages },
      { key: 'EmbedLinks', flag: PermissionsBitField.Flags.EmbedLinks },
      { key: 'ReadMessageHistory', flag: PermissionsBitField.Flags.ReadMessageHistory },
    ];

    const missing = required
      .filter((item) => !perms?.has(item.flag))
      .map((item) => item.key);

    return { ok: missing.length === 0, missing };
  }

  rememberNonce(nonce, nowMs = Date.now()) {
    const state = this.store.getState();
    if (state.nonceCache[nonce] && state.nonceCache[nonce] > nowMs) {
      return false;
    }
    this.store.mutate((st) => {
      st.nonceCache[nonce] = nowMs + NONCE_TTL_MS;
    });
    return true;
  }

  async handleBridgeEvent(event) {
    if (!event || typeof event !== 'object') {
      return { ok: false, reason: 'invalid_event_payload' };
    }

    const { eventType, payload = {} } = event;
    const profile = this.store.getProfile();
    const requestedOwnerId = payload.ownerUserId ? String(payload.ownerUserId) : null;

    if (requestedOwnerId && !profile.ownerUserIds.includes(requestedOwnerId)) {
      return { ok: false, reason: 'bridge_owner_not_authorized' };
    }

    const ownerId = requestedOwnerId || this.getPrimaryOwnerId();

    if (eventType === 'away_on') {
      const status = this._sanitizeStatus(payload.statusText || payload.statusTemplate || 'is currently away.');
      this.store.updateProfile((profile) => ({
        enabled: true,
        statusTemplate: status,
      }));
      return { ok: true, action: 'away_on' };
    }

    if (eventType === 'away_off') {
      this.setAwayOff();
      return { ok: true, action: 'away_off' };
    }

    if (eventType === 'user_back_online') {
      if (!profile.enabled) {
        return { ok: true, action: 'already_not_away' };
      }

      const guildId = payload.guildId ? String(payload.guildId) : null;
      const channelId = payload.channelId ? String(payload.channelId) : null;
      if (!guildId || !channelId) {
        return { ok: false, reason: 'bridge_missing_channel_context' };
      }

      const scope = this.evaluateScope(guildId, channelId);
      if (!scope.ok) {
        return { ok: false, reason: `bridge_scope_${scope.reason}` };
      }

      let channel = null;

      try {
        const guild = await this.client.guilds.fetch(guildId);
        channel = await guild.channels.fetch(channelId);
      } catch (error) {
        this.logger.warn('Bridge return event could not resolve channel; will use DM fallback', {
          event: 'shadowaway_bridge_channel_resolve_failed',
          guildId,
          channelId,
          error: error.message,
        });
      }

      await this.closeAwaySessionAndReport({
        triggerType: 'bridge_return_event',
        guildId: guildId || null,
        channelId: channelId || null,
        channel,
        ownerUserId: payload.ownerUserId || ownerId,
      });
      return { ok: true, action: 'user_back_online' };
    }

    return { ok: false, reason: 'unsupported_event_type' };
  }

  summarizeConfig() {
    const profile = this.store.getProfile();
    return {
      enabled: profile.enabled,
      targetUserId: profile.targetUserId,
      ownerUserIds: profile.ownerUserIds,
      deployedGuildCount: profile.deployedGuildIds.length,
      allowGuildCount: profile.allowGuildIds.length,
      allowChannelCount: profile.allowChannelIds.length,
      cooldownSeconds: profile.cooldownSeconds,
      limits: {
        globalPerHour: profile.maxRepliesGlobalPerHour,
        guildPerHour: profile.maxRepliesPerGuildPerHour,
        channelPerHour: profile.maxRepliesPerChannelPerHour,
      },
      replyMode: profile.replyMode,
      aiAvailable: this.isAiAvailable(),
    };
  }

  getPendingSummary() {
    const pending = this.store.getState().pendingMentions || [];
    const now = Date.now();
    const recent = pending.filter((entry) => now - (entry.timestampMs || 0) < ONE_DAY_MS);
    return {
      pendingCount: recent.length,
      oldestTimestampMs: recent[0]?.timestampMs || null,
      newestTimestampMs: recent[recent.length - 1]?.timestampMs || null,
    };
  }
}

module.exports = {
  ShadowAwayService,
};
