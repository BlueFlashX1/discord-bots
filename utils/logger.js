/**
 * Structured logging utility for Discord bots
 * Provides consistent logging with levels and formatting
 */

class Logger {
  constructor(botName) {
    this.botName = botName;
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
  }

  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.botName}] [${level}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message, data = null) {
    if (this._shouldLog('DEBUG')) {
      console.debug(this._formatMessage('DEBUG', message, data));
    }
  }

  info(message, data = null) {
    if (this._shouldLog('INFO')) {
      console.log(this._formatMessage('INFO', message, data));
    }
  }

  warn(message, data = null) {
    if (this._shouldLog('WARN')) {
      console.warn(this._formatMessage('WARN', message, data));
    }
  }

  error(message, error = null, data = null) {
    if (this._shouldLog('ERROR')) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...data,
      } : data;
      console.error(this._formatMessage('ERROR', message, errorData));
    }
  }
}

module.exports = Logger;
