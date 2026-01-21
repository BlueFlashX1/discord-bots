const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(__dirname, '../config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found at ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.subreddits || !Array.isArray(config.subreddits)) {
    throw new Error('config.json must have a "subreddits" array');
  }

  if (!config.keywords || !Array.isArray(config.keywords)) {
    throw new Error('config.json must have a "keywords" array');
  }

  if (!config.discord_channel_id) {
    throw new Error('config.json must have a "discord_channel_id"');
  }

  return config;
}

module.exports = { loadConfig };
