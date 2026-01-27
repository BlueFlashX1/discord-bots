/**
 * Retry utility for Discord API calls with exponential backoff
 * Handles rate limits and transient errors
 * 
 * Note: This utility checks error properties dynamically to avoid requiring discord.js
 * at the module level, allowing it to work from shared utils/ directory.
 */

/**
 * Retry a Discord API call with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 60000)
 * @param {number} options.backoffFactor - Backoff multiplier (default: 2.0)
 * @param {string} options.operationName - Name of operation for logging
 * @returns {Promise} Result of the function call
 */
async function retryDiscordAPI(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 60000,
    backoffFactor = 2.0,
    operationName = 'Discord API call',
    logger = null,
  } = options;

  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if error is a RateLimitError (check constructor name or error code)
      const isRateLimitError = error.constructor?.name === 'RateLimitError' || 
                               error.code === 'RATELIMIT' ||
                               (error.status === 429 && error.retryAfter !== undefined);
      
      // Check if error is an HTTPError (check constructor name or has status property)
      const isHTTPError = error.constructor?.name === 'HTTPError' || 
                         (error.status !== undefined && error.status >= 400);

      // Handle rate limits
      if (isRateLimitError || (isHTTPError && error.status === 429)) {
        const retryAfter = error.retryAfter ? error.retryAfter * 1000 : delay;
        
        if (attempt < maxRetries) {
          if (logger) {
            logger.warn(`${operationName} rate limited. Retrying after ${retryAfter / 1000}s...`);
          }
          await sleep(retryAfter);
          delay = Math.min(delay * backoffFactor, maxDelay);
          continue;
        }
        
        if (logger) {
          logger.error(`${operationName} rate limited after ${maxRetries + 1} attempts`, error);
        }
        throw error;
      }

      // Handle server errors (5xx)
      if (isHTTPError && error.status >= 500 && error.status < 600) {
        if (attempt < maxRetries) {
          if (logger) {
            logger.warn(`${operationName} server error ${error.status} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay / 1000}s...`);
          }
          await sleep(delay);
          delay = Math.min(delay * backoffFactor, maxDelay);
          continue;
        }
        
        if (logger) {
          logger.error(`${operationName} server error after ${maxRetries + 1} attempts`, error);
        }
        throw error;
      }

      // Handle connection errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message?.includes('WebSocket')) {
        if (attempt < maxRetries) {
          if (logger) {
            logger.warn(`${operationName} connection error (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${delay / 1000}s...`);
          }
          await sleep(delay);
          delay = Math.min(delay * backoffFactor, maxDelay);
          continue;
        }
        
        if (logger) {
          logger.error(`${operationName} connection error after ${maxRetries + 1} attempts`, error);
        }
        throw error;
      }

      // For other errors, don't retry
      if (logger) {
        logger.error(`${operationName} failed`, error);
      }
      throw error;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { retryDiscordAPI };
