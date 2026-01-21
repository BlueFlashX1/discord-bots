const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

let currentConfig = null;
let isPaused = false;

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`config.json not found at ${CONFIG_PATH}`);
  }

  currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  // Validate structure
  if (!currentConfig.subreddits || typeof currentConfig.subreddits !== 'object') {
    currentConfig.subreddits = {};
  }

  // Use env variable as fallback for default channel
  if (!currentConfig.default_channel_id) {
    if (process.env.REDDIT_CHANNEL_ID) {
      currentConfig.default_channel_id = process.env.REDDIT_CHANNEL_ID;
    }
  }

  return currentConfig;
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2));
}

function getConfig() {
  if (!currentConfig) {
    loadConfig();
  }
  return currentConfig;
}

// Get list of subreddit names
function getSubreddits() {
  const config = getConfig();
  return Object.keys(config.subreddits);
}

// Get config for a specific subreddit
function getSubredditConfig(subredditName) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  // Case-insensitive lookup
  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) return null;

  return {
    name: key,
    ...config.subreddits[key],
    // Use subreddit channel or fall back to default
    channel_id: config.subreddits[key].channel_id || config.default_channel_id,
  };
}

// Add a new subreddit with config
function addSubreddit(subredditName, options = {}) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  // Check if already exists (case-insensitive)
  const existingKey = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (existingKey) {
    return { success: false, message: `r/${existingKey} is already being monitored` };
  }

  config.subreddits[normalized] = {
    keywords: options.keywords || [],
    channel_id: options.channel_id || config.default_channel_id || '',
    min_score: options.min_score ?? 0,
    enabled: true,
  };

  saveConfig();
  return { success: true, message: `Added r/${normalized} to monitoring list` };
}

// Remove a subreddit
function removeSubreddit(subredditName) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  delete config.subreddits[key];
  saveConfig();
  return { success: true, message: `Removed r/${key} from monitoring list` };
}

// Add keyword to a specific subreddit
function addKeyword(subredditName, keyword) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  const subConfig = config.subreddits[key];
  const normalizedKeyword = keyword.toLowerCase();

  if (subConfig.keywords.some(k => k.toLowerCase() === normalizedKeyword)) {
    return { success: false, message: `"${keyword}" is already in r/${key}'s keyword list` };
  }

  subConfig.keywords.push(keyword);
  saveConfig();
  return { success: true, message: `Added "${keyword}" to r/${key}'s keyword list` };
}

// Remove keyword from a specific subreddit
function removeKeyword(subredditName, keyword) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  const subConfig = config.subreddits[key];
  const index = subConfig.keywords.findIndex(k => k.toLowerCase() === keyword.toLowerCase());

  if (index === -1) {
    return { success: false, message: `"${keyword}" is not in r/${key}'s keyword list` };
  }

  const removed = subConfig.keywords.splice(index, 1)[0];
  saveConfig();
  return { success: true, message: `Removed "${removed}" from r/${key}'s keyword list` };
}

// Set all keywords for a subreddit (replaces existing)
function setKeywords(subredditName, keywords) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  config.subreddits[key].keywords = keywords;
  saveConfig();
  return { success: true, message: `Updated keywords for r/${key}` };
}

// Set channel for a specific subreddit
function setSubredditChannel(subredditName, channelId) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  config.subreddits[key].channel_id = channelId;
  saveConfig();
  return { success: true, message: `Set r/${key}'s channel to <#${channelId}>` };
}

// Set min score for a specific subreddit
function setSubredditMinScore(subredditName, score) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  config.subreddits[key].min_score = score;
  saveConfig();
  return { success: true, message: `Set r/${key}'s minimum score to ${score}` };
}

// Toggle subreddit enabled/disabled
function toggleSubreddit(subredditName, enabled) {
  const config = getConfig();
  const normalized = subredditName.replace(/^r\//, '');

  const key = Object.keys(config.subreddits).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  if (!key) {
    return { success: false, message: `r/${normalized} is not being monitored` };
  }

  config.subreddits[key].enabled = enabled;
  saveConfig();
  return { success: true, message: `r/${key} is now ${enabled ? 'enabled' : 'disabled'}` };
}

// Global settings
function setDefaultChannel(channelId) {
  const config = getConfig();
  config.default_channel_id = channelId;
  saveConfig();
  return { success: true, message: `Set default channel to <#${channelId}>` };
}

function setCheckInterval(seconds) {
  const config = getConfig();
  config.check_interval = seconds;
  saveConfig();
  return { success: true, message: `Set check interval to ${seconds} seconds` };
}

function setPaused(paused) {
  isPaused = paused;
}

function getPaused() {
  return isPaused;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  getSubreddits,
  getSubredditConfig,
  addSubreddit,
  removeSubreddit,
  addKeyword,
  removeKeyword,
  setKeywords,
  setSubredditChannel,
  setSubredditMinScore,
  toggleSubreddit,
  setDefaultChannel,
  setCheckInterval,
  setPaused,
  getPaused,
};
