const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ONE_HOUR_MS, ONE_DAY_MS } = require('./stateStore');

const DEDUPE_TTL_MS = 10 * 60 * 1000;
const TRIGGER_COOLDOWN_MS = 15 * 60 * 1000;
const CHANNEL_COOLDOWN_MS = 60 * 1000;
const MIN_GLOBAL_REPLY_COOLDOWN_MS = ONE_HOUR_MS;
const NONCE_TTL_MS = 5 * 60 * 1000;
const PENDING_QUEUE_CAP = 1000;
const DELIVERY_PROMPT_TTL_MS = ONE_DAY_MS;
const DELIVERY_MESSAGE_MAX_LEN = 300;
const BRIDGE_DIGEST_MAX_ENTRIES = 200;

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
      awayStartedAtMs: Date.now(),
      statusTemplate: nextStatus,
    }));
  }

  setAwayOff() {
    return this.store.mutate((st) => {
      st.profile.enabled = false;
      st.profile.awayStartedAtMs = null;
      st.profile.updatedAt = new Date().toISOString();
      st.pendingMentions = [];
      st.deliveryPrompts = {};
    }).profile;
  }

  setStatus(statusTemplate) {
    const nextStatus = this._sanitizeStatus(statusTemplate);
    return this.store.updateProfile({ statusTemplate: nextStatus });
  }

  setCooldownSeconds(seconds) {
    const safe = Math.max(3600, Math.min(86400, Number(seconds) || 3600));
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

    return { ok: true };
  }

  isAiAvailable() {
    return Boolean(this.aiResponder && this.aiResponder.isEnabled());
  }

  async buildReplyContent(triggerUserId, sourceMessageText = '') {
    const profile = this.store.getProfile();
    const awayMeta = this.getAwayDurationMeta(profile);
    if (this.aiResponder && typeof this.aiResponder.generateAutoReply === 'function') {
      return this.aiResponder.generateAutoReply({
        triggerUserId,
        statusTemplate: profile.statusTemplate,
        sourceMessageText,
        awayForText: awayMeta?.awayForText || '',
      });
    }

    const awayLine = this._composeAwayLine(profile.statusTemplate, awayMeta);
    return `<@${triggerUserId}>, your message is noted.
${awayLine}
If you want to leave a message for my liege, reply to this shadow message and I will deliver it upon return.`;
  }

  async handleMessageCreate(message) {
    if (message.author?.bot || message.webhookId) return;

    const profile = this.store.getProfile();
    if (!profile.targetUserId) return;

    const ownerReturnHandled = await this._handleReturnSignalIfNeeded(message, profile);
    if (ownerReturnHandled) return;

    if (!profile.enabled) return;
    if (!message.guild || !message.channel) return;

    const deliveryCaptured = await this._handleDeliveryReplyIfNeeded(message);
    if (deliveryCaptured) return;

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

    const pendingMentionId = this._recordPendingMention(message);

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

      this._commitPostSend(message, reply.id, pendingMentionId);
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
    const pendingId = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const preview = (message.content || '').slice(0, 200);

    this.store.mutate((st) => {
      st.pendingMentions.push({
        pendingId,
        triggerUserId: message.author.id,
        triggerUserTag: message.author.tag,
        guildId: message.guild.id,
        guildName: message.guild.name,
        channelId: message.channel.id,
        channelName: this._channelNameForDigest(message.channel),
        messageId: message.id,
        messageLink: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
        messageContentPreview: preview,
        deliveryMessagePreview: null,
        deliveryMessageLink: null,
        deliveryTimestampMs: null,
        timestampMs: Date.now(),
      });

      if (st.pendingMentions.length > PENDING_QUEUE_CAP) {
        st.pendingMentions = st.pendingMentions.slice(st.pendingMentions.length - PENDING_QUEUE_CAP);
      }
    });

    return pendingId;
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

  _commitPostSend(message, replyMessageId, pendingMentionId = null) {
    const now = Date.now();
    const profile = this.store.getProfile();
    const dedupeKey = `${profile.targetUserId}:${message.guild.id}:${message.channel.id}:${message.author.id}`;
    const triggerCooldownKey = `${message.guild.id}:${message.author.id}`;
    const channelCooldownKey = `${message.guild.id}:${message.channel.id}`;

    this.store.mutate((st) => {
      st.dedupe[dedupeKey] = now + DEDUPE_TTL_MS;
      st.cooldowns.globalUntilMs = now + Math.max(MIN_GLOBAL_REPLY_COOLDOWN_MS, profile.cooldownSeconds * 1000);
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

      if (pendingMentionId) {
        st.deliveryPrompts = st.deliveryPrompts || {};
        st.deliveryPrompts[replyMessageId] = {
          pendingMentionId,
          triggerUserId: message.author.id,
          guildId: message.guild.id,
          channelId: message.channel.id,
          expMs: now + DELIVERY_PROMPT_TTL_MS,
        };
      }
    });
  }

  _composeAwayLine(statusClause, awayMeta) {
    let clause = String(statusClause || '').trim();
    if (!clause) clause = 'is currently away';

    const hasAuxiliaryVerb = /^(is|was|will|has|have|had|can|could|should|may|might|must)\b/i.test(clause);
    if (!hasAuxiliaryVerb) {
      // If user starts with title case ("Engaged..."), normalize after prepending "is".
      if (/^[A-Z]/.test(clause)) {
        clause = clause.charAt(0).toLowerCase() + clause.slice(1);
      }
      clause = `is ${clause}`;
    }

    clause = clause.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
    const awaySuffix = awayMeta ? ` (away for ${awayMeta.awayForText})` : '';
    return `My liege ${clause}${awaySuffix}.`;
  }

  async _isValidDeliveryPromptReply(message, referenceMessageId, prompt) {
    const botUserId = this.client?.user?.id ? String(this.client.user.id) : null;
    if (!botUserId) return false;

    // Keep explicit scope checks local so a forged/stale prompt cannot cross-bind.
    if (String(prompt?.triggerUserId || '') !== String(message.author?.id || '')) return false;
    if (String(prompt?.guildId || '') !== String(message.guild?.id || '')) return false;
    if (String(prompt?.channelId || '') !== String(message.channel?.id || '')) return false;

    let referencedMessage = null;
    try {
      referencedMessage = await message.fetchReference();
    } catch (_) {
      return false;
    }
    if (!referencedMessage) return false;
    if (String(referencedMessage.id || '') !== String(referenceMessageId)) return false;
    if (String(referencedMessage.author?.id || '') !== botUserId) return false;

    return true;
  }

  async _handleDeliveryReplyIfNeeded(message) {
    const referenceMessageId = message.reference?.messageId;
    if (!referenceMessageId) return false;

    const state = this.store.getState();
    const prompt = state.deliveryPrompts?.[referenceMessageId];
    if (!prompt) return false;

    const isShadowPromptReply = await this._isValidDeliveryPromptReply(
      message,
      referenceMessageId,
      prompt
    );
    if (!isShadowPromptReply) {
      this.markLastSkip('delivery_requires_reply_to_shadow_prompt', {
        guildId: message.guild?.id || null,
        channelId: message.channel?.id || null,
        triggerUserId: message.author?.id || null,
        messageId: message.id || null,
        referenceMessageId: referenceMessageId || null,
      });
      return false;
    }

    const deliveryText = String(message.content || '').trim().slice(0, DELIVERY_MESSAGE_MAX_LEN);
    if (!deliveryText) return false;

    const deliveryLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    const now = Date.now();

    this.store.mutate((st) => {
      const pending = (st.pendingMentions || []).find((entry) => entry.pendingId === prompt.pendingMentionId);
      if (pending) {
        pending.deliveryMessagePreview = deliveryText;
        pending.deliveryMessageLink = deliveryLink;
        pending.deliveryTimestampMs = now;
      }

      if (st.deliveryPrompts) {
        delete st.deliveryPrompts[referenceMessageId];
      }
    });

    try {
      await message.reply({
        content: `<@${message.author.id}>, your message is noted. I will deliver it when my liege returns.`,
        allowedMentions: {
          users: [message.author.id],
          repliedUser: false,
          parse: [],
        },
      });
    } catch (error) {
      this.logger.warn('Failed to send delivery acknowledgement', {
        event: 'shadowaway_delivery_ack_failed',
        guildId: message.guild.id,
        channelId: message.channel.id,
        triggerUserId: message.author.id,
        messageId: message.id,
        error: error.message,
      });
    }

    this.logger.info('Shadow delivery message captured', {
      event: 'shadowaway_delivery_captured',
      guildId: message.guild.id,
      channelId: message.channel.id,
      triggerUserId: message.author.id,
      messageId: message.id,
      pendingMentionId: prompt.pendingMentionId,
    });

    return true;
  }

  async _handleReturnSignalIfNeeded(message, profile) {
    if (!profile.enabled) return false;
    if (message.author.id !== profile.targetUserId) return false;
    if (!message.guild || !message.channel) return false;

    const plainText = (message.content || '').trim();
    if (!plainText) return false;
    if (this._isCommandLikeText(plainText)) return false;

    const scope = this.evaluateScope(message.guild.id, message.channel.id);
    if (!scope.ok) return false;

    await this.closeAwaySessionAndReport({
      triggerType: 'first_outbound_message',
      guildId: message.guild.id,
      channelId: message.channel.id,
      channel: message.channel,
      ownerUserId: message.author.id,
      preferPrivate: true,
      deliveryMode: 'cache_private',
    });

    return true;
  }

  async closeAwaySessionAndReport({
    triggerType,
    guildId,
    channelId,
    channel,
    ownerUserId,
    preferPrivate = false,
    deliveryMode = 'auto',
  }) {
    const state = this.store.getState();
    const profile = state.profile;
    const pending = [...(state.pendingMentions || [])];
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    this.store.mutate((st) => {
      st.profile.enabled = false;
      st.profile.awayStartedAtMs = null;
      st.profile.updatedAt = now;
      st.pendingMentions = [];
      st.deliveryPrompts = {};
      st.pendingReturnDigest = pending.length
        ? {
            createdMs: nowMs,
            triggerType,
            guildId,
            channelId,
            entries: pending,
          }
        : null;
      st.lastReturnDigest = {
        triggerType,
        guildId,
        channelId,
        mentionCount: pending.length,
        timestamp: now,
      };
    });

    if (!pending.length) {
      this.logger.info('Away session closed with no pending mentions', {
        event: 'shadowaway_return_no_pending',
        triggerType,
        guildId,
        channelId,
      });
      return { delivered: false, mentionCount: 0, reason: 'no_pending_mentions', embeds: [] };
    }

    const embeds = this._buildDigestEmbeds(pending);

    if (deliveryMode === 'cache_private') {
      this.logger.info('Away session digest cached for private interaction delivery', {
        event: 'shadowaway_digest_cached_private',
        triggerType,
        guildId,
        channelId,
        mentionCount: pending.length,
      });
      return {
        delivered: false,
        mentionCount: pending.length,
        deliveryTarget: 'cached_private',
        reason: 'awaiting_private_interaction',
        embeds,
      };
    }

    if (deliveryMode === 'interaction_private') {
      this._clearPendingReturnDigest();
      return {
        delivered: true,
        mentionCount: pending.length,
        deliveryTarget: 'interaction_private',
        embeds,
      };
    }

    let delivered = false;
    let deliveryTarget = 'none';

    const ownerId = ownerUserId || profile.targetUserId || this.getPrimaryOwnerId();

    if (preferPrivate) {
      try {
        const ownerUser = await this.client.users.fetch(ownerId);
        await ownerUser.send({ embeds });
        delivered = true;
        deliveryTarget = 'dm_primary';
      } catch (error) {
        this.logger.warn('Failed to send private return digest; trying channel fallback', {
          event: 'shadowaway_digest_dm_primary_failed',
          ownerUserId: ownerId,
          error: error.message,
        });
      }
    }

    if (!delivered && channel) {
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
        const ownerUser = await this.client.users.fetch(ownerId);
        await ownerUser.send({ embeds });
        delivered = true;
        deliveryTarget = 'dm_fallback';
      } catch (error) {
        this.logger.error('Failed to deliver return digest via DM fallback', error, {
          event: 'shadowaway_digest_dm_failed',
          ownerUserId: ownerId,
        });
      }
    }

    if (delivered) {
      this._clearPendingReturnDigest();
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

    return { delivered, mentionCount: pending.length, deliveryTarget, embeds };
  }

  _clearPendingReturnDigest() {
    this.store.mutate((st) => {
      st.pendingReturnDigest = null;
    });
  }

  consumePendingReturnDigest() {
    const digest = this.store.getState().pendingReturnDigest;
    if (!digest || !Array.isArray(digest.entries) || !digest.entries.length) return null;
    this._clearPendingReturnDigest();
    return digest;
  }

  getPendingReturnDigestMeta() {
    const digest = this.store.getState().pendingReturnDigest;
    if (!digest || !Array.isArray(digest.entries) || !digest.entries.length) return null;
    return {
      guildId: digest.guildId || null,
      channelId: digest.channelId || null,
      mentionCount: digest.entries.length,
      createdMs: Number(digest.createdMs || 0) || null,
    };
  }

  buildDigestEmbeds(entries) {
    return this._buildDigestEmbeds(Array.isArray(entries) ? entries : []);
  }

  _sanitizeBridgeDigestEntries(entries) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    return safeEntries.slice(0, BRIDGE_DIGEST_MAX_ENTRIES).map((row) => ({
      triggerUserId: row.triggerUserId || null,
      triggerUserTag: row.triggerUserTag || null,
      guildId: row.guildId || null,
      guildName: row.guildName || null,
      channelId: row.channelId || null,
      channelName: row.channelName || null,
      messageId: row.messageId || null,
      messageLink: row.messageLink || null,
      messageContentPreview: this._sanitizeDigestSnippet(row.messageContentPreview || ''),
      deliveryMessagePreview: row.deliveryMessagePreview
        ? this._sanitizeDigestSnippet(row.deliveryMessagePreview)
        : null,
      deliveryMessageLink: row.deliveryMessageLink || null,
      timestampMs: Number(row.timestampMs || 0) || null,
      deliveryTimestampMs: Number(row.deliveryTimestampMs || 0) || null,
    }));
  }

  async deliverEmbedsToOwnerDM(ownerUserId, embeds) {
    try {
      const ownerId = String(ownerUserId || this.getPrimaryOwnerId());
      if (!ownerId || !Array.isArray(embeds) || embeds.length === 0) return false;
      const ownerUser = await this.client.users.fetch(ownerId);
      await ownerUser.send({ embeds });
      return true;
    } catch (error) {
      this.logger.warn('Failed to deliver embeds to owner DM fallback', {
        event: 'shadowaway_embed_dm_fallback_failed',
        ownerUserId: ownerUserId || null,
        error: error.message,
      });
      return false;
    }
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
      .setFooter({ text: 'Includes mention context and any delivered messages.' })
      .setTimestamp(new Date());

    const detailEmbeds = [];
    let current = new EmbedBuilder().setColor(0x1f1038).setTitle('Shadow Report Details');
    let fieldCount = 0;

    for (const group of grouped.values()) {
      const lines = group.rows.map((row) => {
        const ts = row.timestampMs ? Math.floor(row.timestampMs / 1000) : Math.floor(Date.now() / 1000);
        const mentionPreview = this._sanitizeDigestSnippet(row.messageContentPreview || 'No message text.');
        const delivered = row.deliveryMessagePreview
          ? this._sanitizeDigestSnippet(row.deliveryMessagePreview)
          : null;
        const deliveryLine = delivered ? `\n  Delivery: "${delivered}"` : '\n  Delivery: (none)';
        return `• <@${row.triggerUserId}> ([jump](${row.messageLink})) <t:${ts}:R>\n  Mention: "${mentionPreview}"${deliveryLine}`;
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

  _sanitizeDigestSnippet(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    return normalized.slice(0, 140) || 'No message text.';
  }

  _sanitizeStatus(input) {
    const trimmed = String(input || '').trim().replace(/\s+/g, ' ');
    const limited = trimmed.slice(0, 300);
    return limited || 'is currently away.';
  }

  _readAwayStartedAtMs(profile) {
    const awayStartedAtMs = Number(profile?.awayStartedAtMs || 0);
    if (!Number.isFinite(awayStartedAtMs) || awayStartedAtMs <= 0) return null;
    return Math.floor(awayStartedAtMs);
  }

  _formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    if (totalSeconds <= 0) return '0s';

    const units = [
      ['d', 86400],
      ['h', 3600],
      ['m', 60],
      ['s', 1],
    ];

    let remaining = totalSeconds;
    const parts = [];
    for (const [label, unitSeconds] of units) {
      if (remaining < unitSeconds) continue;
      const count = Math.floor(remaining / unitSeconds);
      remaining -= count * unitSeconds;
      parts.push(`${count}${label}`);
      if (parts.length >= 2) break;
    }

    return parts.length ? parts.join(' ') : '0s';
  }

  getAwayDurationMeta(profile = this.store.getProfile(), nowMs = Date.now()) {
    if (!profile?.enabled) return null;
    let awaySinceMs = this._readAwayStartedAtMs(profile);
    if (!awaySinceMs) {
      const fallbackUpdatedAtMs = Date.parse(String(profile.updatedAt || ''));
      if (Number.isFinite(fallbackUpdatedAtMs) && fallbackUpdatedAtMs > 0) {
        awaySinceMs = Math.floor(fallbackUpdatedAtMs);
      }
    }
    if (!awaySinceMs) return null;

    const awayForMs = Math.max(0, nowMs - awaySinceMs);
    return {
      awaySinceMs,
      awayForMs,
      awayForText: this._formatDuration(awayForMs),
    };
  }

  _isCommandLikeText(input) {
    const text = String(input || '').trim();
    if (!text) return false;
    if (text.startsWith('/')) return true;

    const first = text[0];
    if ((first === '!' || first === '.' || first === '?' || first === '$') && text.length > 1) {
      return true;
    }

    return /^<@!?\d+>\s+\S+/.test(text);
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
        awayStartedAtMs: Date.now(),
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
        deliveryMode: 'cache_private',
      });
      return { ok: true, action: 'user_back_online' };
    }

    if (eventType === 'consume_pending_digest') {
      if (!requestedOwnerId) {
        return { ok: false, reason: 'missing_owner_user_id' };
      }

      const guildId = payload.guildId ? String(payload.guildId) : null;
      const channelId = payload.channelId ? String(payload.channelId) : null;
      if (!guildId || !channelId) {
        return { ok: false, reason: 'bridge_missing_channel_context' };
      }

      const digest = this.store.getState().pendingReturnDigest;
      if (!digest || !Array.isArray(digest.entries) || digest.entries.length === 0) {
        return {
          ok: true,
          action: 'consume_pending_digest',
          consumed: false,
          reason: 'no_pending_digest',
        };
      }

      const expectedGuildId = digest.guildId || null;
      const expectedChannelId = digest.channelId || null;
      const lockedToChannel = Boolean(expectedGuildId && expectedChannelId);
      if (lockedToChannel && (expectedGuildId !== guildId || expectedChannelId !== channelId)) {
        return {
          ok: true,
          action: 'consume_pending_digest',
          consumed: false,
          reason: 'locked_to_channel',
          expectedGuildId,
          expectedChannelId,
          mentionCount: digest.entries.length,
        };
      }

      const entries = this._sanitizeBridgeDigestEntries(digest.entries);
      const truncated = digest.entries.length > entries.length;
      this._clearPendingReturnDigest();

      return {
        ok: true,
        action: 'consume_pending_digest',
        consumed: true,
        mentionCount: digest.entries.length,
        createdMs: Number(digest.createdMs || 0) || Date.now(),
        entries,
        truncated,
      };
    }

    if (eventType === 'peek_pending_digest') {
      if (!requestedOwnerId) {
        return { ok: false, reason: 'missing_owner_user_id' };
      }

      const guildId = payload.guildId ? String(payload.guildId) : null;
      const channelId = payload.channelId ? String(payload.channelId) : null;

      const digest = this.store.getState().pendingReturnDigest;
      if (!digest || !Array.isArray(digest.entries) || digest.entries.length === 0) {
        return {
          ok: true,
          action: 'peek_pending_digest',
          hasPending: false,
          mentionCount: 0,
          hasDelivered: false,
          lockedToChannel: false,
          expectedGuildId: null,
          expectedChannelId: null,
          inSelectedChannel: false,
        };
      }

      const expectedGuildId = digest.guildId || null;
      const expectedChannelId = digest.channelId || null;
      const lockedToChannel = Boolean(expectedGuildId && expectedChannelId);
      const inSelectedChannel = Boolean(
        lockedToChannel &&
        guildId &&
        channelId &&
        expectedGuildId === guildId &&
        expectedChannelId === channelId
      );
      const hasDelivered = digest.entries.some((row) => Boolean(row?.deliveryMessagePreview));

      return {
        ok: true,
        action: 'peek_pending_digest',
        hasPending: true,
        mentionCount: digest.entries.length,
        hasDelivered,
        lockedToChannel,
        expectedGuildId,
        expectedChannelId,
        inSelectedChannel,
      };
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
