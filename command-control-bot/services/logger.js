const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.errorLogPath = path.join(this.logDir, 'errors.log');
    this.debugLogPath = path.join(this.logDir, 'debug.log');
    this.combinedLogPath = path.join(this.logDir, 'combined.log');

    // Set log level from environment (default: info, use 'debug' for verbose)
    this.logLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

    // Ensure logs directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Log rotation - keep logs under 10MB
    this.maxLogSize = 10 * 1024 * 1024;
    this.rotateIfNeeded();
  }

  rotateIfNeeded() {
    const logFiles = [this.errorLogPath, this.debugLogPath, this.combinedLogPath];

    for (const logFile of logFiles) {
      try {
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          if (stats.size > this.maxLogSize) {
            const rotatedPath = `${logFile}.${Date.now()}.old`;
            fs.renameSync(logFile, rotatedPath);
            this.debug('Log rotated', { file: logFile, size: stats.size });
          }
        }
      } catch (err) {
        console.error('Failed to rotate log:', err);
      }
    }
  }

  formatContext(context) {
    if (!context || Object.keys(context).length === 0) return '';
    return ' ' + JSON.stringify(context);
  }

  writeToFile(filePath, line) {
    try {
      fs.appendFileSync(filePath, line + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  debug(message, context = {}) {
    if (this.logLevel > LOG_LEVELS.debug) return;

    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [DEBUG] ${message}${this.formatContext(context)}`;

    console.log('\x1b[36m%s\x1b[0m', logLine); // Cyan
    this.writeToFile(this.debugLogPath, logLine);
    this.writeToFile(this.combinedLogPath, logLine);
  }

  info(message, context = {}) {
    if (this.logLevel > LOG_LEVELS.info) return;

    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [INFO] ${message}${this.formatContext(context)}`;

    console.log('\x1b[32m%s\x1b[0m', logLine); // Green
    this.writeToFile(this.combinedLogPath, logLine);
  }

  warn(message, context = {}) {
    if (this.logLevel > LOG_LEVELS.warn) return;

    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [WARN] ${message}${this.formatContext(context)}`;

    console.warn('\x1b[33m%s\x1b[0m', logLine); // Yellow
    this.writeToFile(this.combinedLogPath, logLine);
  }

  error(message, context = {}) {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [ERROR] ${message}${this.formatContext(context)}`;

    console.error('\x1b[31m%s\x1b[0m', logLine); // Red
    this.writeToFile(this.errorLogPath, logLine);
    this.writeToFile(this.combinedLogPath, logLine);
  }

  // Legacy method for backwards compatibility
  logError(error, context = {}) {
    const errorContext = {
      ...context,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    };
    this.error(`Exception: ${error.message}`, errorContext);
  }

  // Legacy method for backwards compatibility
  logInfo(message, context = {}) {
    this.info(message, context);
  }

  // Trace method for very verbose debugging
  trace(message, context = {}) {
    if (this.logLevel > LOG_LEVELS.debug) return;

    const timestamp = new Date().toISOString();
    const stack = new Error().stack?.split('\n').slice(2, 4).join(' <- ') || '';
    const logLine = `${timestamp} [TRACE] ${message}${this.formatContext(context)} | ${stack}`;

    console.log('\x1b[90m%s\x1b[0m', logLine); // Gray
    this.writeToFile(this.debugLogPath, logLine);
  }

  // Helper to time operations
  startTimer(label) {
    const start = Date.now();
    return {
      end: (context = {}) => {
        const duration = Date.now() - start;
        this.debug(`${label} completed`, { ...context, durationMs: duration });
        return duration;
      }
    };
  }
}

module.exports = new Logger();
