/**
 * Environment variable validation utility
 * Validates required environment variables and provides helpful error messages
 */

/**
 * Validate required environment variables
 * @param {Object} validations - Object mapping env var names to validation configs
 * @param {Object} config - Validation config
 * @param {boolean} config.required - Whether the variable is required
 * @param {Function} config.validator - Optional validator function
 * @param {string} config.errorMessage - Custom error message
 * @param {*} config.defaultValue - Default value if not provided
 * @param {Logger} logger - Optional logger instance
 * @returns {Object} Validated environment variables
 */
function validateEnv(validations, logger = null) {
  const validated = {};
  const errors = [];

  for (const [key, config] of Object.entries(validations)) {
    const {
      required = true,
      validator = null,
      errorMessage = null,
      defaultValue = undefined,
    } = config;

    const value = process.env[key];

    // Check if required and missing
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      const message = errorMessage || `Missing required environment variable: ${key}`;
      errors.push(message);
      if (logger) {
        logger.error(message);
      }
      continue;
    }

    // Use default if not provided
    if (!value && defaultValue !== undefined) {
      validated[key] = defaultValue;
      continue;
    }

    // Skip if not required and not provided
    if (!value) {
      continue;
    }

    // Run custom validator if provided
    if (validator) {
      try {
        const result = validator(value);
        if (result === false) {
          const message = errorMessage || `Invalid value for ${key}: ${value}`;
          errors.push(message);
          if (logger) {
            logger.error(message);
          }
          continue;
        }
        validated[key] = result !== true ? result : value;
      } catch (error) {
        const message = errorMessage || `Validation error for ${key}: ${error.message}`;
        errors.push(message);
        if (logger) {
          logger.error(message, error);
        }
        continue;
      }
    } else {
      validated[key] = value;
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return validated;
}

/**
 * Common validators
 */
const validators = {
  /**
   * Validate Discord token format
   */
  discordToken: (value) => {
    if (!value || value.length < 50) {
      return false;
    }
    return true;
  },

  /**
   * Validate guild ID (must be numeric)
   */
  guildId: (value) => {
    if (!value || value.trim() === '' || value === 'your_guild_id') {
      return null; // Return null to indicate should use global commands
    }
    const num = parseInt(value.trim(), 10);
    if (isNaN(num)) {
      return null; // Invalid, fall back to global
    }
    return num.toString();
  },

  /**
   * Validate numeric value
   */
  numeric: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return false;
    }
    return num;
  },

  /**
   * Validate boolean value
   */
  boolean: (value) => {
    return value.toLowerCase() === 'true';
  },
};

module.exports = { validateEnv, validators };
