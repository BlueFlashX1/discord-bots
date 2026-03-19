const OpenAI = require('openai');
const DELIVERY_LINE = 'If you have any message you wish to deliver, please reply to this and I shall deliver it upon return.';

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeClause(input, fallback) {
  const cleaned = String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[`\n\r]/g, '');

  if (!cleaned) return fallback;
  return cleaned.slice(0, 300);
}

function normalizeStatusLine(rawLine, fallbackLine, awayForText) {
  let line = String(rawLine || '').replace(/\s+/g, ' ').trim();
  if (!line) line = String(fallbackLine || '').trim();

  // Strip return-time predictions from model output.
  line = line
    .replace(/\b(?:will|shall)\s+return\b[^.?!]*/gi, '')
    .replace(/\breturns?\s+in\b[^.?!]*/gi, '')
    .replace(/\bback\s+in\b[^.?!]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,\s]+$/g, '')
    .replace(/\b(?:and|but|so)\s*$/i, '');

  if (!/^My liege\b/i.test(line)) {
    line = String(fallbackLine || 'My liege is currently away.').trim();
  }

  line = line.replace(/[.!?]+$/g, '').trim();

  if (awayForText) {
    const awayPhrase = `has been away for ${awayForText}`;
    if (!/\baway for\b/i.test(line) && !/\bhas been away\b/i.test(line)) {
      line = `${line} and ${awayPhrase}`;
    }
  }

  return line.replace(/\s+/g, ' ').trim();
}

function sanitizeReplyMessage(input, fallback, triggerUserId, awayForText = '') {
  const raw = String(input || '')
    .replace(/\r/g, '')
    .replace(/```/g, '')
    .replace(/\[SHADOW-AUTO-REPLY\]/gi, '')
    .trim();

  const fallbackLines = String(fallback || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const fallbackLine2 = fallbackLines[1] || 'My liege is currently away.';

  const condensed = raw.replace(/\s+/g, ' ').trim();
  const statusMatch = condensed.match(/My liege[\s\S]*?(?=(?:If you have any message you wish to deliver)|$)/i);

  let line2 = statusMatch ? statusMatch[0] : fallbackLine2;
  line2 = normalizeStatusLine(line2, fallbackLine2, awayForText);
  line2 = line2.charAt(0).toUpperCase() + line2.slice(1);

  const line1 = `<@${triggerUserId}>, your message is noted.`;
  const message = `${line1}\n${line2}.\n${DELIVERY_LINE}`;
  return message.slice(0, 700);
}

function buildFallbackReply({ triggerUserId, statusTemplate, awayForText }) {
  let clauseFallback = sanitizeClause(statusTemplate, 'is currently away.');
  const hasAuxiliaryVerb = /^(is|was|will|has|have|had|can|could|should|may|might|must)\b/i.test(clauseFallback);
  if (!hasAuxiliaryVerb) {
    if (/^[A-Z]/.test(clauseFallback)) {
      clauseFallback = clauseFallback.charAt(0).toLowerCase() + clauseFallback.slice(1);
    }
    clauseFallback = `is ${clauseFallback}`;
  }
  const normalizedClause = clauseFallback;
  const cleanedClause = normalizedClause.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  const awaySuffix = awayForText ? ` and has been away for ${awayForText}` : '';
  return `<@${triggerUserId}>, your message is noted.
My liege ${cleanedClause}${awaySuffix}.
${DELIVERY_LINE}`;
}

class ShadowAwayAIResponder {
  constructor({ logger }) {
    this.logger = logger;
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.timeoutMs = toInt(process.env.SHADOWAWAY_AI_TIMEOUT_MS, 3500);
    this.enabled = Boolean(this.apiKey);
    this.client = this.enabled ? new OpenAI({ apiKey: this.apiKey }) : null;
  }

  isEnabled() {
    return this.enabled;
  }

  async rephraseStatusClause(statusTemplate, sourceMessageText = '') {
    const fallback = sanitizeClause(statusTemplate, 'is currently away.');
    if (!this.enabled || !this.client) return fallback;

    const systemPrompt = [
      'You lightly adjust a status clause for a loyal shadow-servant tone.',
      'CRITICAL: Keep the user\'s original words almost verbatim. Do NOT replace simple words with fancy synonyms (e.g. "watching" must stay "watching", not "observing" or "viewing").',
      'You may add grammatical articles (a, the), fix minor grammar, or add one brief shadow-servant flourish.',
      'Do not add promises, schedules, invented actions like "as instructed", or new facts.',
      'Use slight structural variation so repeated replies do not feel robotic, but never sacrifice clarity.',
      'No emojis, no markdown, no quotes.',
      'Keep concise (max 22 words).',
      'Output JSON only: {"clause":"..."}',
    ].join(' ');

    const userPrompt = JSON.stringify({
      statusTemplate: fallback,
      mentionContext: String(sourceMessageText || '').slice(0, 300),
      requiredVoice: 'calm, respectful, loyal to Shadow Monarch',
    });

    const requestPromise = this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 80,
      response_format: { type: 'json_object' },
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('ai_timeout')), this.timeoutMs);
    });

    try {
      const response = await Promise.race([requestPromise, timeoutPromise]);
      const content = response?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return sanitizeClause(parsed.clause, fallback);
    } catch (error) {
      this.logger.warn('AI clause generation failed; using static fallback', {
        event: 'shadowaway_ai_fallback',
        error: error.message,
      });
      return fallback;
    }
  }

  async generateAutoReply({
    triggerUserId,
    statusTemplate,
    sourceMessageText = '',
    awayForText = '',
  }) {
    const fallback = buildFallbackReply({
      triggerUserId,
      statusTemplate,
      awayForText,
    });

    if (!this.enabled || !this.client) return fallback;

    const mentionToken = `<@${triggerUserId}>`;
    const systemPrompt = [
      'You write one Discord auto-reply in the voice of a loyal shadow retainer serving the Shadow Monarch.',
      'Tone: respectful, calm, protective, concise.',
      'Use plain text only.',
      'Use exactly 3 lines.',
      `Line 1 must be exactly: ${mentionToken}, your message is noted.`,
      'Line 2 must start with "My liege " and describe what the liege is doing.',
      'CRITICAL: Use the status words the user provided almost verbatim. Do NOT replace simple words with fancy synonyms.',
      'For example, if the status is "watching Bambi movie", say "My liege is currently watching the Bambi movie" — do NOT say "observing the Bambi film" or "in the presence of Bambi".',
      'You may only add minor grammatical articles (a, the) or a brief shadow-servant flourish, but keep the core phrasing intact.',
      'Add slight variation to the sentence structure across replies so they do not feel robotic, but never at the cost of clarity or natural grammar.',
      `Line 3 must be exactly: ${DELIVERY_LINE}`,
      'Reflect the provided status meaning faithfully; do not add new facts, promises, or invented details like "as instructed" or "quietly observing".',
      'Never claim or predict when the liege will return.',
      'If away duration is provided, include it naturally (for example: "and has been away for 1h 30m").',
      'Do not include [SHADOW-AUTO-REPLY].',
      'No emojis, no markdown, no code fences, no quotes.',
      'Max 3 lines, max 420 characters.',
      'Return JSON only: {"message":"..."}',
    ].join(' ');

    const userPrompt = JSON.stringify({
      triggerUserId: String(triggerUserId),
      mentionToken,
      statusTemplate: sanitizeClause(statusTemplate, 'is currently away.'),
      awayForText: awayForText ? String(awayForText) : '',
      mentionContext: String(sourceMessageText || '').slice(0, 300),
    });

    const requestPromise = this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 180,
      response_format: { type: 'json_object' },
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('ai_timeout')), this.timeoutMs);
    });

    try {
      const response = await Promise.race([requestPromise, timeoutPromise]);
      const content = response?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return sanitizeReplyMessage(parsed.message, fallback, triggerUserId, awayForText);
    } catch (error) {
      this.logger.warn('AI auto-reply generation failed; using static fallback', {
        event: 'shadowaway_ai_reply_fallback',
        error: error.message,
      });
      return fallback;
    }
  }
}

module.exports = {
  ShadowAwayAIResponder,
};
