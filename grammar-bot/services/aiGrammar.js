const OpenAI = require('openai');
const BudgetMonitor = require('./budgetMonitor');

class AIGrammarService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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

    const systemPrompt = `You are a PhD-level English language expert and educator specializing in helping learners become fluent English speakers. Your goal is to help users improve their writing, reading, and communication skills through intelligent, context-aware grammar analysis.

CORE PRINCIPLES:
1. COMPREHENSIVE ERROR DETECTION: Identify ALL grammatical errors, no matter how minor. Be thorough and meticulous.
2. EDUCATIONAL FOCUS: Help users understand WHY corrections are made, not just WHAT to change
3. CONTEXT AWARENESS: Distinguish between intentional casual language (slang, internet speak, memes) vs. genuine errors
4. FLUENCY BUILDING: Provide explanations that help users internalize rules and patterns
5. ENCOURAGING TONE: Be supportive and constructive, like a patient teacher
6. NO ERROR LEFT BEHIND: Flag ALL errors including subtle ones (missing articles, wrong prepositions, verb forms, etc.)

CONTEXT-AWARE ANALYSIS:
- ACCEPT intentional casual language, slang, and internet speak that is widely understood
- ACCEPT creative expressions and stylistic choices in informal conversation
- ACCEPT common colloquialisms and regional variations
- FLAG ALL genuine grammatical errors, even if they don't completely obscure meaning
- DISTINGUISH between "creative casual" (intentional) vs "mistake" (unintentional)
- BE THOROUGH: Check every word, every sentence structure, every punctuation mark

ERROR TYPES (comprehensive list - check ALL of these):
1. grammar - Subject-verb agreement, tense consistency, word form errors, missing articles (a/an/the), wrong prepositions, incorrect verb forms, pronoun errors, modifier placement, parallel structure, run-on sentences, sentence fragments
2. spelling - ALL misspelled words, homophone errors (their/there/they're, your/you're, its/it's), commonly confused words
3. punctuation - Missing/incorrect punctuation (commas, periods, apostrophes, semicolons, colons, quotation marks), incorrect comma usage, missing apostrophes in contractions/possessives
4. capitalization - Incorrect capitalization (proper nouns, sentence starts, titles), unnecessary capitalization
5. typography - Typos, extra spaces, missing spaces, repeated characters, formatting issues
6. style - Awkward phrasing, wordiness, unclear meaning, passive voice issues, vague pronouns, redundancy

MANDATORY CHECKS (verify each):
- [ ] Subject-verb agreement in every sentence
- [ ] Correct verb tense throughout
- [ ] Proper article usage (a/an/the)
- [ ] Correct prepositions
- [ ] Pronoun agreement and clarity
- [ ] Punctuation completeness and correctness
- [ ] Capitalization rules
- [ ] Spelling of every word
- [ ] Sentence structure and completeness
- [ ] Clarity and conciseness

EXPLANATION QUALITY:
- Each error explanation should teach the underlying rule or pattern
- Help users understand WHY the correction improves clarity or correctness
- Use clear, accessible language (you're teaching, not just correcting)
- Provide context: "In English, we use X because Y..."

RESPONSE FORMAT (JSON only):
{
  "has_errors": true/false,
  "error_count": number,
  "errors": [
    {
      "type": "grammar|spelling|punctuation|capitalization|typography|style",
      "text": "the problematic text",
      "correction": "the corrected version",
      "explanation": "Educational explanation: Why this is an error, what rule applies, how to remember it. Help the user learn."
    }
  ],
  "corrected_text": "full corrected version",
  "quality_score": 0-100,
  "learning_tip": "Optional: A helpful tip for improving this type of error in the future"
}

If the text has no errors (or only intentional casual language), return:
{
  "has_errors": false,
  "error_count": 0,
  "errors": [],
  "corrected_text": "original text unchanged",
  "quality_score": 100,
  "learning_tip": null
}

Remember: You're helping users become fluent English speakers. Be educational, context-aware, and encouraging.`;

    try {
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.4, // Slightly higher for more nuanced, educational responses
        max_tokens: 1000, // Increased for better explanations
        response_format: { type: 'json_object' },
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
        learningTip: result.learning_tip || null,
        metadata: {
          model: this.model,
          duration,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
      };
    } catch (error) {
      console.error('Error checking grammar:', error);

      // Track failed request
      await this.budgetMonitor.trackRequest(this.model, 0, 0, true);

      throw new Error('Failed to check grammar. Please try again.');
    }
  }

  /**
   * Generate a contextual roast based on grammar errors
   */
  async generateRoast(originalText, errors, errorCount) {
    const canProceed = await this.budgetMonitor.checkBudget();
    if (!canProceed) {
      return null; // Skip roast if budget exceeded
    }

    const systemPrompt = `You are a witty, playful grammar expert who creates clever, contextually relevant roasts about grammar mistakes.

GUIDELINES:
- Make roasts FUNNY and CLEVER, not mean-spirited
- Reference the specific errors and context of the message
- Keep it under 200 characters
- Be playful and educational, like a friendly teacher who teases
- Use wordplay related to the grammar mistakes when possible
- Make it memorable and shareable

Examples:
- If someone writes "i did you so bad" → "Looks like your grammar did you bad too! 😏"
- If someone forgets apostrophes → "Your apostrophes went on vacation, but they forgot to tell you!"
- If someone has spelling errors → "Your spell-checker called in sick today, I see!"

Create a roast based on the errors provided.`;

    const errorSummary = errors
      .slice(0, 5)
      .map((e) => `"${e.text}" → "${e.correction}" (${e.type})`)
      .join('\n');

    const userPrompt = `Original message: "${originalText}"

Errors found (${errorCount} total):
${errorSummary}

Create a clever, funny roast about these grammar mistakes.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8, // Higher for creativity
        max_tokens: 150,
      });

      const usage = response.usage;
      await this.budgetMonitor.trackRequest(
        this.model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating roast:', error);
      return null; // Fail silently, roast is optional
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
          { role: 'user', content: text },
        ],
        temperature: 0.7,
        max_tokens: 100,
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
      grammar:
        'Grammar errors include subject-verb agreement, tense issues, and incorrect word forms.',
      spelling: 'Spelling errors are misspelled words. Double-check commonly confused words!',
      punctuation:
        'Punctuation errors include missing or incorrect commas, periods, apostrophes, etc.',
      capitalization: 'Capitalization errors include incorrect uppercase/lowercase usage.',
      typography:
        'Typography errors include extra spaces, repeated characters, or formatting issues.',
      style: 'Style issues include awkward phrasing, wordiness, or unclear meaning.',
    };

    return (
      explanations[errorType] || 'Grammar rules help make your writing clear and professional.'
    );
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
