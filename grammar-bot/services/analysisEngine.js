const AIGrammarService = require('./aiGrammar');
const DailyStats = require('../database/models/DailyStats');

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
        reason: 'Message too short or too long'
      };
    }

    try {
      // Check grammar with AI
      const result = await this.aiGrammar.checkGrammar(text);

      // Extract error types
      const errorTypes = [...new Set(result.errors.map(e => e.type))];

      // Record in daily stats
      const stats = await DailyStats.getTodayStats();
      await stats.recordMessageCheck(
        userId,
        result.hasErrors,
        result.errorCount,
        errorTypes
      );

      return {
        shouldRespond: result.hasErrors,
        hasErrors: result.hasErrors,
        errorCount: result.errorCount,
        errors: result.errors,
        correctedText: result.correctedText,
        qualityScore: result.qualityScore,
        errorTypes,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('Error analyzing message:', error);

      return {
        shouldRespond: false,
        error: error.message
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

    return true;
  }

  /**
   * Format error message for Discord
   */
  formatErrorMessage(result) {
    if (!result.hasErrors) {
      return {
        type: 'success',
        message: '✅ No errors found!',
        details: null
      };
    }

    const errorsByType = {};
    result.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });

    let message = `❌ Found ${result.errorCount} error${result.errorCount > 1 ? 's' : ''}:\n\n`;

    Object.entries(errorsByType).forEach(([type, errors]) => {
      const emoji = this.getErrorEmoji(type);
      message += `${emoji} **${this.capitalizeFirst(type)}** (${errors.length}):\n`;

      errors.slice(0, 3).forEach(error => {
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
      qualityScore: result.qualityScore
    };
  }

  /**
   * Get emoji for error type
   */
  getErrorEmoji(type) {
    const emojis = {
      grammar: '📝',
      spelling: '🔤',
      punctuation: '❗',
      capitalization: '🔠',
      typography: '⌨️',
      style: '✨'
    };
    return emojis[type] || '❓';
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
    if (qualityScore >= 95) return '🌟 Excellent!';
    if (qualityScore >= 85) return '👍 Good!';
    if (qualityScore >= 70) return '👌 Decent';
    if (qualityScore >= 50) return '😐 Needs work';
    return '😕 Poor quality';
  }

  /**
   * Generate improvement suggestion
   */
  generateSuggestion(errorTypes) {
    const suggestions = {
      grammar: 'Try reading your message aloud to catch grammar mistakes.',
      spelling: 'Use a spell checker or double-check commonly misspelled words.',
      punctuation: 'Remember to use commas, periods, and other punctuation correctly.',
      capitalization: 'Capitalize proper nouns and the first word of sentences.',
      typography: 'Proofread for typos and extra spaces.',
      style: 'Keep your writing clear and concise.'
    };

    if (errorTypes.length > 0) {
      return suggestions[errorTypes[0]] || 'Keep practicing to improve your writing!';
    }

    return 'Great job! Keep up the good work!';
  }

  /**
   * Analyze user's improvement over time
   */
  async analyzeImprovement(user) {
    const totalMessages = user.totalMessages;
    const cleanMessages = user.cleanMessages;
    const accuracy = totalMessages > 0
      ? (cleanMessages / totalMessages) * 100
      : 0;

    const grade = this.calculateGrade(accuracy);
    const improvement = this.calculateImprovement(user);

    return {
      accuracy: accuracy.toFixed(1),
      grade,
      improvement,
      totalMessages,
      cleanMessages,
      totalErrors: user.totalErrors,
      streak: user.streak,
      level: user.level
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
    if (!user.qualityHistory || user.qualityHistory.length < 5) {
      return 'Not enough data';
    }

    const recent = user.qualityHistory.slice(-10);
    const older = user.qualityHistory.slice(-20, -10);

    if (older.length === 0) return 'Not enough data';

    const recentAvg = recent.reduce((sum, q) => sum + q.bonusPoints, 0) / recent.length;
    const olderAvg = older.reduce((sum, q) => sum + q.bonusPoints, 0) / older.length;

    if (recentAvg > olderAvg * 1.2) return '📈 Improving!';
    if (recentAvg < olderAvg * 0.8) return '📉 Declining';
    return '➡️ Stable';
  }

  /**
   * Get error type statistics
   */
  getErrorTypeStats(user) {
    const total = Object.values(user.errorsByType).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return [];
    }

    return Object.entries(user.errorsByType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
  }
}

module.exports = AnalysisEngine;
