const AIGrammarService = require('./aiGrammar');
// Conditional loading - only if MongoDB is available
let DailyStats = null;
function getDailyStats() {
  if (DailyStats !== null) return DailyStats;
  try {
    DailyStats = require('../database/models/DailyStats');
    return DailyStats;
  } catch (error) {
    return null;
  }
}

class AnalysisEngine {
  constructor() {
    this.aiGrammar = new AIGrammarService();

    // Minimum message length for checking
    this.minLength = parseInt(process.env.MIN_MESSAGE_LENGTH || '10');

    // Maximum message length for checking
    this.maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH || '1000');
  }

  /**
   * Analyze a message for grammar errors
   */
  async analyzeMessage(text, userId) {
    // Validation
    if (!this.shouldCheck(text)) {
      return {
        shouldRespond: false,
        reason: 'Message too short or too long',
      };
    }

    try {
      // Check grammar with AI
      const result = await this.aiGrammar.checkGrammar(text);

      // Extract error types
      const errorTypes = [...new Set(result.errors.map((e) => e.type))];

      // Record in daily stats (if available)
      const DailyStatsModel = getDailyStats();
      if (DailyStatsModel) {
        try {
          const stats = await DailyStatsModel.getTodayStats();
          await stats.recordMessageCheck(userId, result.hasErrors, result.errorCount, errorTypes);
        } catch (error) {
          // Silently fail if DailyStats unavailable
        }
      }

      return {
        shouldRespond: result.hasErrors,
        hasErrors: result.hasErrors,
        errorCount: result.errorCount,
        errors: result.errors,
        correctedText: result.correctedText,
        qualityScore: result.qualityScore,
        errorTypes,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('Error analyzing message:', error);

      return {
        shouldRespond: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if message should be analyzed
   */
  shouldCheck(text) {
    // Length check
    if (text.length < this.minLength) return false;
    if (text.length > this.maxLength) return false;

    // Ignore URLs
    if (text.includes('http://') || text.includes('https://')) return false;

    // Ignore code blocks
    if (text.includes('```')) return false;

    // Ignore mostly emojis
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojiCount = (text.match(emojiRegex) || []).length;
    if (emojiCount > text.length * 0.5) return false;

    // Ignore mostly numbers
    const numberRegex = /\d/g;
    const numberCount = (text.match(numberRegex) || []).length;
    if (numberCount > text.length * 0.7) return false;

    // Ignore single words
    if (!/\s/.test(text.trim())) return false;

    // Filter sensitive information patterns
    if (this.containsSensitiveInfo(text)) return false;

    return true;
  }

  /**
   * Check if text contains sensitive information
   */
  containsSensitiveInfo(text) {
    const lowerText = text.toLowerCase();

    // Credit card numbers (13-19 digits, may have spaces/dashes)
    const creditCardRegex = /\b(?:\d[ -]*?){13,19}\b/;
    if (creditCardRegex.test(text)) return true;

    // Social Security Numbers (XXX-XX-XXXX or XXX XX XXXX)
    const ssnRegex = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
    if (ssnRegex.test(text)) return true;

    // API keys (common patterns: sk_live_, sk_test_, AIza, etc.)
    const apiKeyPatterns = [
      /\b(sk_live_|sk_test_|pk_live_|pk_test_)[a-zA-Z0-9]{20,}\b/i,
      /\bAIza[0-9A-Za-z_-]{35}\b/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bghp_[a-zA-Z0-9]{36}\b/,
      /\bgho_[a-zA-Z0-9]{36}\b/,
      /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/,
      /\bBearer\s+[a-zA-Z0-9\-._~+/]+=*\b/i,
    ];
    if (apiKeyPatterns.some((pattern) => pattern.test(text))) return true;

    // Passwords (common indicators)
    const passwordIndicators = [
      /\b(password|passwd|pwd|secret|token|key)\s*[:=]\s*[^\s]{8,}/i,
      /\b(api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*[^\s]{10,}/i,
    ];
    if (passwordIndicators.some((pattern) => pattern.test(text))) return true;

    // Email addresses (only flag if multiple - likely spam/leak)
    const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
    const emailMatches = text.match(emailRegex);
    if (emailMatches && emailMatches.length > 2) return true;

    // Phone numbers (US format: multiple phones = likely PII dump)
    const phoneRegex = /\b(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/;
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 1) return true;

    // JWT tokens (three base64 parts separated by dots)
    const jwtRegex = /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/;
    if (jwtRegex.test(text)) return true;

    // Private keys (PEM format indicators)
    if (
      text.includes('-----BEGIN') &&
      (text.includes('PRIVATE KEY') || text.includes('RSA PRIVATE'))
    ) {
      return true;
    }

    // Database connection strings
    const dbConnectionPatterns = [
      /mongodb\+srv:\/\/[^\s]+/i,
      /postgresql:\/\/[^\s]+/i,
      /mysql:\/\/[^\s]+/i,
      /connectionstring\s*[:=]\s*[^\s]+/i,
    ];
    if (dbConnectionPatterns.some((pattern) => pattern.test(text))) return true;

    return false;
  }

  /**
   * Format error message for Discord
   */
  formatErrorMessage(result) {
    if (!result.hasErrors) {
      return {
        type: 'success',
        message: 'No errors found!',
        details: null,
      };
    }

    const errorsByType = {};
    result.errors.forEach((error) => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });

    let message = `Found ${result.errorCount} error${result.errorCount > 1 ? 's' : ''}:\n\n`;

    Object.entries(errorsByType).forEach(([type, errors]) => {
      message += `**${this.capitalizeFirst(type)}** (${errors.length}):\n`;

      errors.slice(0, 3).forEach((error) => {
        message += `• "${error.text}" → "${error.correction}"\n`;
        message += `  _${error.explanation}_\n`;
      });

      if (errors.length > 3) {
        message += `  _...and ${errors.length - 3} more_\n`;
      }

      message += '\n';
    });

    return {
      type: 'error',
      message,
      correctedText: result.correctedText,
      qualityScore: result.qualityScore,
    };
  }

  /**
   * Get emoji for error type (deprecated - no longer used)
   */
  getErrorEmoji(type) {
    return '';
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get quality feedback
   */
  getQualityFeedback(qualityScore) {
    if (qualityScore >= 95) return 'Excellent!';
    if (qualityScore >= 85) return 'Good!';
    if (qualityScore >= 70) return 'Decent';
    if (qualityScore >= 50) return 'Needs work';
    return 'Poor quality';
  }

  /**
   * Generate improvement suggestion
   */
  generateSuggestion(errorTypes, learningTip = null) {
    // Use learning tip from AI if available (more educational)
    if (learningTip) {
      return learningTip;
    }

    // Fallback to general suggestions
    const suggestions = {
      grammar:
        'Tip: Read your message aloud to catch grammar mistakes. Pay attention to subject-verb agreement and tense consistency.',
      spelling:
        'Tip: Double-check commonly misspelled words. Break words into syllables to help with spelling.',
      punctuation:
        'Tip: Punctuation helps readers understand your meaning. Use commas for pauses, periods for complete thoughts.',
      capitalization:
        'Tip: Capitalize proper nouns (names, places) and the first word of sentences.',
      typography:
        'Tip: Proofread for typos and extra spaces. Take a moment to review before sending.',
      style:
        'Tip: Keep your writing clear and concise. Remove unnecessary words to make your message stronger.',
    };

    if (errorTypes.length > 0) {
      return (
        suggestions[errorTypes[0]] ||
        'Keep practicing to improve your writing! Every message is a chance to learn.'
      );
    }

    return 'Excellent! Your writing is clear and well-structured. Keep up the great work!';
  }

  /**
   * Analyze user's improvement over time
   */
  async analyzeImprovement(user) {
    const totalMessages = user.totalMessages || 0;
    const cleanMessages = user.cleanMessages || 0;
    const accuracy = totalMessages > 0 ? (cleanMessages / totalMessages) * 100 : 0;

    const grade = this.calculateGrade(accuracy);
    const improvement = this.calculateImprovement(user);

    return {
      accuracy: accuracy.toFixed(1),
      grade,
      improvement,
      totalMessages,
      cleanMessages,
      totalErrors: user.totalErrors || 0,
      streak: user.streak || 0,
      level: user.level || 1,
    };
  }

  /**
   * Calculate letter grade
   */
  calculateGrade(accuracy) {
    if (accuracy >= 95) return 'A+';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 85) return 'B+';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 75) return 'C+';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate improvement trend
   */
  calculateImprovement(user) {
    // Check quality history for trend
    if (
      !user.qualityHistory ||
      !Array.isArray(user.qualityHistory) ||
      user.qualityHistory.length < 5
    ) {
      return 'Not enough data';
    }

    const recent = user.qualityHistory.slice(-10);
    const older = user.qualityHistory.slice(-20, -10);

    if (older.length === 0) return 'Not enough data';

    const recentAvg = recent.reduce((sum, q) => sum + (q.bonusPoints || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, q) => sum + (q.bonusPoints || 0), 0) / older.length;

    if (recentAvg > olderAvg * 1.2) return 'Improving!';
    if (recentAvg < olderAvg * 0.8) return 'Declining';
    return 'Stable';
  }

  /**
   * Get error type statistics
   */
  getErrorTypeStats(user) {
    if (!user.errorsByType || typeof user.errorsByType !== 'object') {
      return [];
    }

    const total = Object.values(user.errorsByType).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return [];
    }

    return Object.entries(user.errorsByType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        percentage: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }
}

module.exports = AnalysisEngine;
