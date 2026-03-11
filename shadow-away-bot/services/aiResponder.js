const OpenAI = require('openai');

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
      'You rephrase a status clause for a loyal shadow-servant tone.',
      'Keep the original meaning intact.',
      'Do not add promises, schedules, or new facts.',
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
      temperature: 0.4,
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
}

module.exports = {
  ShadowAwayAIResponder,
};

