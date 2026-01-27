const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../config/commands.json');
    this.config = null;
    this.lastModified = null;
    this.watcher = null;
    logger.debug('ConfigManager initialized', { configPath: this.configPath });
  }

  validateCommand(cmd, index) {
    const errors = [];

    if (!cmd.id || typeof cmd.id !== 'string') {
      errors.push(`Command ${index}: missing or invalid 'id'`);
    }
    if (!cmd.label || typeof cmd.label !== 'string') {
      errors.push(`Command ${index}: missing or invalid 'label'`);
    }
    if (!cmd.command || typeof cmd.command !== 'string') {
      errors.push(`Command ${index}: missing or invalid 'command'`);
    }
    if (!cmd.directory || typeof cmd.directory !== 'string') {
      errors.push(`Command ${index}: missing or invalid 'directory'`);
    }
    if (cmd.timeout !== undefined && (typeof cmd.timeout !== 'number' || cmd.timeout < 0)) {
      errors.push(`Command ${index}: 'timeout' must be a positive number (milliseconds)`);
    }
    if (cmd.category !== undefined && typeof cmd.category !== 'string') {
      errors.push(`Command ${index}: 'category' must be a string`);
    }

    if (errors.length > 0) {
      logger.debug('Command validation errors', { index, commandId: cmd.id, errors });
    }

    return errors;
  }

  validateConfig(config) {
    logger.debug('Validating config');
    const errors = [];

    if (!config || typeof config !== 'object') {
      logger.warn('Config is not a valid object');
      return ['Config must be a valid JSON object'];
    }

    if (!Array.isArray(config.commands)) {
      logger.warn('Config missing commands array');
      return ['Config must have a "commands" array'];
    }

    // Validate each command
    config.commands.forEach((cmd, index) => {
      errors.push(...this.validateCommand(cmd, index));
    });

    // Check for duplicate IDs
    const ids = config.commands.map(cmd => cmd.id).filter(Boolean);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      logger.warn('Duplicate command IDs found', { duplicates });
      errors.push(`Duplicate command IDs found: ${[...new Set(duplicates)].join(', ')}`);
    }

    logger.debug('Config validation complete', { errorCount: errors.length, commandCount: config.commands.length });
    return errors;
  }

  async loadConfig(force = false) {
    const timer = logger.startTimer('loadConfig');
    logger.debug('Loading config', { force, configPath: this.configPath });

    try {
      // Check if commands.json exists, fallback to commands.json.example
      let actualConfigPath = this.configPath;
      if (!fs.existsSync(this.configPath)) {
        const examplePath = this.configPath.replace('commands.json', 'commands.json.example');
        if (fs.existsSync(examplePath)) {
          logger.warn('commands.json not found, using commands.json.example as fallback');
          logger.warn('Please copy commands.json.example to commands.json and customize it');
          actualConfigPath = examplePath;
        } else {
          throw new Error(`Config file not found: ${this.configPath}`);
        }
      }

      const stats = fs.statSync(actualConfigPath);
      logger.debug('Config file stats', { size: stats.size, mtime: stats.mtimeMs, path: actualConfigPath });

      // Return cached config if not modified and not forced
      if (!force && this.config && this.lastModified && stats.mtimeMs === this.lastModified) {
        logger.debug('Returning cached config', { lastModified: this.lastModified });
        return this.config;
      }

      logger.debug('Reading config file');
      const rawData = fs.readFileSync(actualConfigPath, 'utf8');
      let parsedConfig;

      try {
        parsedConfig = JSON.parse(rawData);
        logger.debug('Config parsed successfully');
      } catch (parseError) {
        logger.logError(parseError, { action: 'parseConfig' });
        throw new Error(`Invalid JSON in commands.json: ${parseError.message}`);
      }

      // Validate config
      const validationErrors = this.validateConfig(parsedConfig);
      if (validationErrors.length > 0) {
        const error = new Error(`Config validation failed:\n${validationErrors.join('\n')}`);
        logger.logError(error, { action: 'validateConfig', errors: validationErrors });
        throw error;
      }

      this.config = parsedConfig;
      this.lastModified = stats.mtimeMs;

      // Log command summary
      const categories = this.getCategories();
      logger.info('Config loaded successfully', {
        commandCount: parsedConfig.commands.length,
        categoryCount: categories.size,
        categories: Array.from(categories.keys())
      });

      timer.end({ commandCount: parsedConfig.commands.length });
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.error('Config file not found', { path: this.configPath });
        throw new Error('commands.json not found. Create config/commands.json');
      }
      throw error;
    }
  }

  getConfig() {
    logger.debug('getConfig called', { hasCachedConfig: !!this.config });
    if (!this.config) {
      // Synchronous fallback for initial load
      return this.loadConfig();
    }
    return this.config;
  }

  getCommand(id) {
    const config = this.getConfig();
    const command = config.commands.find(cmd => cmd.id === id);
    logger.debug('getCommand', { id, found: !!command });
    return command;
  }

  getCommands() {
    const config = this.getConfig();
    const commands = config.commands || [];
    logger.debug('getCommands', { count: commands.length });
    return commands;
  }

  getCategories() {
    const commands = this.getCommands();
    const categories = new Map();

    commands.forEach(cmd => {
      const category = cmd.category || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(cmd);
    });

    logger.debug('getCategories', {
      categoryCount: categories.size,
      categories: Array.from(categories.entries()).map(([name, cmds]) => ({ name, count: cmds.length }))
    });

    return categories;
  }

  startWatching(callback) {
    if (this.watcher) {
      logger.debug('Watcher already running');
      return;
    }

    try {
      logger.debug('Starting config file watcher', { path: this.configPath });

      this.watcher = fs.watch(this.configPath, async (eventType) => {
        logger.debug('File watcher event', { eventType });
        if (eventType === 'change') {
          try {
            logger.debug('Config file changed, reloading');
            await this.loadConfig(true);
            logger.info('Config hot-reloaded');
            if (callback) {
              callback(this.config);
            }
          } catch (error) {
            logger.logError(error, { action: 'hotReload' });
          }
        }
      });

      logger.info('Config file watcher started', { path: this.configPath });
    } catch (error) {
      logger.logError(error, { action: 'startWatching' });
    }
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('Config file watcher stopped');
    } else {
      logger.debug('No watcher to stop');
    }
  }

  reloadConfig() {
    logger.debug('Manual config reload requested');
    return this.loadConfig(true);
  }
}

module.exports = new ConfigManager();
