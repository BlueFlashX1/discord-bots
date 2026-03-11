const fs = require('fs');
const path = require('path');

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function nowIso() {
  return new Date().toISOString();
}

function parseCsvSet(input) {
  if (!input) return [];
  return [...new Set(String(input)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean))];
}

function buildInitialProfile(config = {}) {
  const defaultReplyMode = process.env.OPENAI_API_KEY ? 'ai' : 'static';
  return {
    targetUserId: config.targetUserId || '',
    ownerUserIds: parseCsvSet(config.ownerUserIds),
    deployedGuildIds: parseCsvSet(config.deployedGuildIds),
    enabled: false,
    statusTemplate: 'is currently away.',
    allowGuildIds: [],
    allowChannelIds: [],
    cooldownSeconds: 60,
    signatureMarker: '[SHADOW-AUTO-REPLY]',
    maxRepliesPerGuildPerHour: 12,
    maxRepliesPerChannelPerHour: 6,
    maxRepliesGlobalPerHour: 40,
    replyMode: defaultReplyMode,
    updatedAt: nowIso(),
  };
}

function buildInitialState(profile) {
  return {
    schemaVersion: 1,
    profile,
    dedupe: {},
    cooldowns: {
      globalUntilMs: 0,
      byTrigger: {},
      byChannel: {},
    },
    rateHistory: {
      global: [],
      guild: {},
      channel: {},
    },
    pendingMentions: [],
    deliveryPrompts: {},
    pendingReturnDigest: null,
    lastSkip: null,
    nonceCache: {},
  };
}

class StateStore {
  constructor(filePath, logger, config = {}) {
    this.filePath = filePath;
    this.logger = logger;
    this.config = config;
    this.state = null;

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    this._load();
  }

  _load() {
    const initialProfile = buildInitialProfile(this.config);

    if (!fs.existsSync(this.filePath)) {
      this.state = buildInitialState(initialProfile);
      this.save();
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const hydrated = buildInitialState(initialProfile);

      this.state = {
        ...hydrated,
        ...parsed,
        profile: {
          ...hydrated.profile,
          ...(parsed.profile || {}),
        },
        cooldowns: {
          ...hydrated.cooldowns,
          ...(parsed.cooldowns || {}),
        },
        rateHistory: {
          ...hydrated.rateHistory,
          ...(parsed.rateHistory || {}),
        },
      };

      this._prune(Date.now());
      this._ensureProfileDefaults();
      this.save();
    } catch (error) {
      this.logger.error('Failed to load shadow-away state; resetting state file', error);
      this.state = buildInitialState(initialProfile);
      this.save();
    }
  }

  _ensureProfileDefaults() {
    const profile = this.state.profile;
    const defaultReplyMode = process.env.OPENAI_API_KEY ? 'ai' : 'static';
    if (!Array.isArray(profile.ownerUserIds)) profile.ownerUserIds = [];
    if (!Array.isArray(profile.deployedGuildIds)) profile.deployedGuildIds = [];
    if (!Array.isArray(profile.allowGuildIds)) profile.allowGuildIds = [];
    if (!Array.isArray(profile.allowChannelIds)) profile.allowChannelIds = [];
    if (typeof profile.cooldownSeconds !== 'number') profile.cooldownSeconds = 60;
    if (!profile.signatureMarker) profile.signatureMarker = '[SHADOW-AUTO-REPLY]';
    if (!profile.replyMode) profile.replyMode = defaultReplyMode;
    if (!profile.updatedAt) profile.updatedAt = nowIso();
  }

  _prune(nowMs) {
    const st = this.state;
    if (!st.deliveryPrompts || typeof st.deliveryPrompts !== 'object') {
      st.deliveryPrompts = {};
    }

    for (const [key, exp] of Object.entries(st.dedupe || {})) {
      if (!Number.isFinite(exp) || exp <= nowMs) delete st.dedupe[key];
    }

    for (const [key, until] of Object.entries(st.cooldowns?.byTrigger || {})) {
      if (!Number.isFinite(until) || until <= nowMs) delete st.cooldowns.byTrigger[key];
    }

    for (const [key, until] of Object.entries(st.cooldowns?.byChannel || {})) {
      if (!Number.isFinite(until) || until <= nowMs) delete st.cooldowns.byChannel[key];
    }

    if (typeof st.cooldowns.globalUntilMs !== 'number') st.cooldowns.globalUntilMs = 0;

    st.rateHistory.global = (st.rateHistory.global || []).filter((ts) => nowMs - ts < ONE_HOUR_MS);

    for (const [guildId, arr] of Object.entries(st.rateHistory.guild || {})) {
      const filtered = (arr || []).filter((ts) => nowMs - ts < ONE_HOUR_MS);
      if (filtered.length) st.rateHistory.guild[guildId] = filtered;
      else delete st.rateHistory.guild[guildId];
    }

    for (const [channelId, arr] of Object.entries(st.rateHistory.channel || {})) {
      const filtered = (arr || []).filter((ts) => nowMs - ts < ONE_HOUR_MS);
      if (filtered.length) st.rateHistory.channel[channelId] = filtered;
      else delete st.rateHistory.channel[channelId];
    }

    st.pendingMentions = (st.pendingMentions || []).filter((entry) => {
      const age = nowMs - (entry.timestampMs || 0);
      return age < ONE_DAY_MS;
    });

    for (const entry of st.pendingMentions) {
      const age = nowMs - (entry.timestampMs || 0);
      if (age >= ONE_DAY_MS) {
        entry.messageContentPreview = undefined;
      }
      if (typeof entry.messageContentPreview === 'string' && entry.messageContentPreview.length > 200) {
        entry.messageContentPreview = entry.messageContentPreview.slice(0, 200);
      }
    }

    for (const [nonce, exp] of Object.entries(st.nonceCache || {})) {
      if (!Number.isFinite(exp) || exp <= nowMs) delete st.nonceCache[nonce];
    }

    for (const [replyMessageId, meta] of Object.entries(st.deliveryPrompts || {})) {
      const expMs = Number(meta?.expMs || 0);
      if (!Number.isFinite(expMs) || expMs <= nowMs) {
        delete st.deliveryPrompts[replyMessageId];
      }
    }

    if (st.pendingReturnDigest) {
      const createdMs = Number(st.pendingReturnDigest.createdMs || 0);
      if (!Number.isFinite(createdMs) || nowMs - createdMs >= ONE_DAY_MS) {
        st.pendingReturnDigest = null;
      }
    }
  }

  save() {
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.state, null, 2));
    fs.renameSync(temp, this.filePath);
  }

  getState() {
    this._prune(Date.now());
    return this.state;
  }

  mutate(mutator) {
    this._prune(Date.now());
    mutator(this.state);
    this._ensureProfileDefaults();
    this.save();
    return this.state;
  }

  getProfile() {
    return this.getState().profile;
  }

  updateProfile(updater) {
    return this.mutate((st) => {
      const next = typeof updater === 'function' ? updater({ ...st.profile }) : updater;
      st.profile = {
        ...st.profile,
        ...next,
        updatedAt: nowIso(),
      };
      st.profile.ownerUserIds = [...new Set(st.profile.ownerUserIds || [])];
      st.profile.deployedGuildIds = [...new Set(st.profile.deployedGuildIds || [])];
      st.profile.allowGuildIds = [...new Set(st.profile.allowGuildIds || [])];
      st.profile.allowChannelIds = [...new Set(st.profile.allowChannelIds || [])];
    }).profile;
  }
}

module.exports = {
  StateStore,
  ONE_HOUR_MS,
  ONE_DAY_MS,
};
