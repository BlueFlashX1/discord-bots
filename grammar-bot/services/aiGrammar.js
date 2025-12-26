const OpenAI = require('openai');
const BudgetMonitor = require('./budgetMonitor');

class AIGrammarService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.budgetMonitor = new BudgetMonitor();
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Check grammar of a message
   */
  async checkGrammar(text) {
    // Budget check
    const canProceed = await this.budgetMonitor.checkBudget();
    if (!canProceed) {
      throw new Error('Daily budget exceeded. Grammar checking temporarily disabled.');
    }

    const systemPrompt = `You are a grammar checker. Analyze the following text for errors.

ERROR TYPES:
1. grammar - Subject-verb agreement, tense errors, incorrect word forms
2. spelling - Misspelled words
3. punctuation - Missing or incorrect punctuation marks
4. capitalization - Incorrect capitalization
5. typography - Extra spaces, typos, formatting issues
6. style - Awkward phrasing, wordiness, unclear meaning

Respond with ONLY a JSON object in this exact format:
{
  "has_errors": true/false,
  "error_count": number,
  "errors": [
    {
      "type": "grammar|spelling|punctuation|capitalization|typography|style",
      "text": "the problematic text",
      "correction": "the corrected version",
      "explanation": "brief explanation"
    }
  ],
  "corrected_text": "full corrected version",
  "quality_score": 0-100
}

If the text has no errors, return:
{
  "has_errors": false,
  "error_count": 0,
  "errors": [],
  "corrected_text": "original text unchanged",
  "quality_score": 100
}`;

    try {
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const duration = Date.now() - startTime;

      // Track usage
      const usage = response.usage;
      await this.budgetMonitor.trackRequest(
        this.model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      // Parse response
      const result = JSON.parse(response.choices[0].message.content);

      return {
        hasErrors: result.has_errors,
        errorCount: result.error_count,
        errors: result.errors || [],
        correctedText: result.corrected_text,
        qualityScore: result.quality_score || 0,
        metadata: {
          model: this.model,
          duration,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        }
      };

    } catch (error) {
      console.error('Error checking grammar:', error);

      // Track failed request
      await this.budgetMonitor.trackRequest(this.model, 0, 0, true);

      throw new Error('Failed to check grammar. Please try again.');
    }
  }

  /**
   * Generate grammar hint
   */
  async generateHint(text) {
    const canProceed = await this.budgetMonitor.checkBudget();
    if (!canProceed) {
      return 'Hints unavailable - daily budget exceeded.';
    }

    const systemPrompt = `You are a helpful grammar teacher. Provide a brief, encouraging hint about the grammar issue in this text. Keep it under 100 characters.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      const usage = response.usage;
      await this.budgetMonitor.trackRequest(
        this.model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating hint:', error);
      return 'Unable to generate hint.';
    }
  }

  /**
   * Explain grammar rule
   */
  async explainRule(errorType) {
    const explanations = {
      grammar: 'Grammar errors include subject-verb agreement, tense issues, and incorrect word forms.',
      spelling: 'Spelling errors are misspelled words. Double-check commonly confused words!',
      punctuation: 'Punctuation errors include missing or incorrect commas, periods, apostrophes, etc.',
      capitalization: 'Capitalization errors include incorrect uppercase/lowercase usage.',
      typography: 'Typography errors include extra spaces, repeated characters, or formatting issues.',
      style: 'Style issues include awkward phrasing, wordiness, or unclear meaning.'
    };

    return explanations[errorType] || 'Grammar rules help make your writing clear and professional.';
  }

  /**
   * Get budget status
   */
  async getBudgetStatus() {
    return await this.budgetMonitor.getBudgetStatus();
  }

  /**
   * Calculate cost estimate
   */
  estimateCost(textLength) {
    // Rough estimate: ~1 token per 4 characters
    const estimatedInputTokens = Math.ceil(textLength / 4) + 200; // + system prompt
    const estimatedOutputTokens = 300; // Average response size

    return this.budgetMonitor.calculateCost(
      estimatedInputTokens,
      estimatedOutputTokens,
      this.model
    );
  }
}

module.exports = AIGrammarService;
