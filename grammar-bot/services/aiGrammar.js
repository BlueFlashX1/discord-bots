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
1. COMPREHENSIVE ERROR DETECTION: Identify ALL grammatical errors, no matter how minor. Be thorough and meticulous. COUNT EVERY ERROR - if there are 5 spelling mistakes, list all 5 separately.
2. EDUCATIONAL FOCUS: Help users understand WHY corrections are made, not just WHAT to change
3. CONTEXT AWARENESS: Distinguish between intentional casual language (slang, internet speak, memes) vs. genuine errors
4. FLUENCY BUILDING: Provide explanations that help users internalize rules and patterns
5. ENCOURAGING TONE: Be supportive and constructive, like a patient teacher
6. NO ERROR LEFT BEHIND: Flag ALL errors including subtle ones (missing articles, wrong prepositions, verb forms, etc.)
7. COUNT ALL INSTANCES: If a message has multiple errors of the same type, list each one separately. Do NOT combine them.

CONTEXT-AWARE ANALYSIS:
- ACCEPT intentional casual language, slang, and internet speak that is widely understood
- ACCEPT creative expressions and stylistic choices in informal conversation
- ACCEPT common colloquialisms and regional variations
- FLAG ALL genuine grammatical errors, even if they don't completely obscure meaning
- DISTINGUISH between "creative casual" (intentional) vs "mistake" (unintentional)
- BE THOROUGH: Check every word, every sentence structure, every punctuation mark
- COUNT SEPARATELY: Each error instance gets its own entry in the errors array

ERROR TYPES (comprehensive list - check ALL of these):
1. grammar - Subject-verb agreement, tense consistency, word form errors, missing articles (a/an/the), wrong prepositions, incorrect verb forms, pronoun errors, modifier placement, parallel structure, run-on sentences, sentence fragments
2. spelling - ALL misspelled words, homophone errors (their/there/they're, your/you're, its/it's), commonly confused words
3. punctuation - Missing/incorrect punctuation (commas, periods, apostrophes, semicolons, colons, quotation marks), incorrect comma usage, missing apostrophes in contractions/possessives
4. capitalization - Incorrect capitalization (proper nouns, sentence starts, titles), unnecessary capitalization
5. typography - Typos, extra spaces, missing spaces, repeated characters, formatting issues
6. style - Awkward phrasing, wordiness, unclear meaning, passive voice issues, vague pronouns, redundancy

MANDATORY CHECKS (verify each systematically):
- [ ] Subject-verb agreement in every sentence (check each sentence separately)
- [ ] Correct verb tense throughout (check each verb)
- [ ] Proper article usage (a/an/the) - check every noun phrase
- [ ] Correct prepositions - check every prepositional phrase
- [ ] Pronoun agreement and clarity - check every pronoun
- [ ] Punctuation completeness and correctness - check every sentence end, every comma, every apostrophe
- [ ] Capitalization rules - check every word that should/shouldn't be capitalized
- [ ] Spelling of every word - verify each word individually
- [ ] Sentence structure and completeness - check each sentence
- [ ] Clarity and conciseness - review overall message flow

CRITICAL: ERROR COUNTING RULES:
- If a message says "i went to the store and i bought some thing" → This is 3 errors: (1) "i" capitalization, (2) "i" capitalization again, (3) "thing" spelling (should be "things")
- If a message has "their going there" → This is 2 errors: (1) "their" should be "they're" (grammar), (2) "there" is correct but context suggests "their" confusion
- Each unique error instance must be listed separately in the errors array
- The error_count must match the exact number of items in the errors array
- Do NOT group similar errors - each occurrence is separate

EXPLANATION QUALITY:
- Each error explanation should teach the underlying rule or pattern
- Help users understand WHY the correction improves clarity or correctness
- Use clear, accessible language (you're teaching, not just correcting)
- Provide context: "In English, we use X because Y..."

RESPONSE FORMAT (JSON only):
{
  "has_errors": true/false,
  "error_count": number,  // MUST match the exact number of items in errors array
  "errors": [
    {
      "type": "grammar|spelling|punctuation|capitalization|typography|style",
      "text": "the problematic text",  // The exact text that is wrong
      "correction": "the corrected version",  // The corrected version
      "explanation": "Educational explanation: Why this is an error, what rule applies, how to remember it. Help the user learn."
    }
    // IMPORTANT: Each error instance must be a separate object in this array
    // If there are 3 spelling errors, there must be 3 separate objects with type: "spelling"
  ],
  "corrected_text": "full corrected version",
  "quality_score": 0-100,
  "learning_tip": "Optional: A helpful tip for improving this type of error in the future"
}

CRITICAL VALIDATION:
- The "error_count" field MUST equal the length of the "errors" array
- If you find 5 errors, the errors array must have exactly 5 items
- Do NOT combine similar errors - each occurrence is separate
- Example: "i went to the store i bought thing" → error_count: 3, errors array with 3 items (2 capitalization, 1 spelling)

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

      // Calculate dynamic max_tokens based on message length
      // Base: 1000 tokens, plus 50 tokens per error expected (estimate: 1 error per 20 chars)
      const estimatedErrors = Math.max(1, Math.ceil(text.length / 20));
      const dynamicMaxTokens = Math.min(2000, 1000 + (estimatedErrors * 50)); // Cap at 2000 to control costs

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.4, // Slightly higher for more nuanced, educational responses
        max_tokens: dynamicMaxTokens, // Dynamic based on message length to capture all errors
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
