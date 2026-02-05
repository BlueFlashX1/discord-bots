/**
 * Structured logging utility for Discord bots.
 * Writes JSON lines to logs/<component>-<date>.log and echoes them to the console.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class Logger {
  constructor(component, options = {}) {
    this.component = component;
    this.script = options.script || component;
    this.logLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
    this.environment = process.env.NODE_ENV || 'local';
    this.version = process.env.APP_VERSION || 'dev';
    this.runId = process.env.RUN_ID || randomUUID();
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };

    this.logDir = options.logDir || process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    fs.mkdirSync(this.logDir, { recursive: true });
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.logFile = path.join(this.logDir, `${this.component}-${dateStamp}.log`);
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
    process.once('exit', () => {
      if (this.stream) {
        this.stream.end();
      }
    });

    this._emitInternal('log_start', 'INFO', 'Logger initialized', {
      log_file: this.logFile,
      environment: this.environment,
      version: this.version,
    });
  }

  _shouldLog(level) {
    return this.levels[level] >= (this.levels[this.logLevel] ?? 1);
  }

  _deriveEvent(message) {
    if (typeof message !== 'string') {
      return 'log';
    }
    const slug = message
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || 'log';
  }

  _buildRecord(level, event, message, data) {
    const record = {
      timestamp: new Date().toISOString(),
      event,
      level,
      component: this.component,
      run_id: this.runId,
      environment: this.environment,
      version: this.version,
      script: this.script,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      record.data = data;
    }

    return record;
  }

  _emitInternal(event, level, message, data) {
    const record = this._buildRecord(level, event, message, data);
    const serialized = JSON.stringify(record);

    switch (level) {
      case 'ERROR':
        console.error(serialized);
        break;
      case 'WARN':
        console.warn(serialized);
        break;
      case 'INFO':
        console.log(serialized);
        break;
      default:
        console.debug(serialized);
        break;
    }

    this.stream.write(`${serialized}\n`);
  }

  _prepPayload(message, data) {
    if (!data) {
      return { event: this._deriveEvent(message), payload: undefined };
    }

    const clone = { ...data };
    const event = clone.event || this._deriveEvent(message);
    delete clone.event;
    return { event, payload: clone };
  }

  debug(message, data = null) {
    if (!this._shouldLog('DEBUG')) return;
    const { event, payload } = this._prepPayload(message, data);
    this._emitInternal(event, 'DEBUG', message, payload);
  }

  info(message, data = null) {
    if (!this._shouldLog('INFO')) return;
    const { event, payload } = this._prepPayload(message, data);
    this._emitInternal(event, 'INFO', message, payload);
  }

  warn(message, data = null) {
    if (!this._shouldLog('WARN')) return;
    const { event, payload } = this._prepPayload(message, data);
    this._emitInternal(event, 'WARN', message, payload);
  }

  error(message, error = null, data = null) {
    if (!this._shouldLog('ERROR')) return;
    const merged = { ...(data || {}) };
    if (error) {
      merged.error = {
        message: error.message,
        stack: error.stack,
      };
    }
    const { event, payload } = this._prepPayload(message, merged);
    this._emitInternal(event, 'ERROR', message, payload);
  }
}

module.exports = Logger;