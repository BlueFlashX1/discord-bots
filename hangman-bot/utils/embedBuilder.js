const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Create a standardized embed with consistent styling
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {string} [options.color] - Embed color (default, success, error, warning, info)
 * @param {Array} [options.fields] - Array of field objects
 * @param {string} [options.footer] - Footer text
 * @param {string} [options.thumbnail] - Thumbnail URL
 * @param {string} [options.image] - Image URL
 * @param {boolean} [options.timestamp] - Add timestamp
 * @returns {EmbedBuilder}
 */
function createEmbed({
  title,
  description,
  color = 'default',
  fields = [],
  footer = null,
  thumbnail = null,
  image = null,
  timestamp = false
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(config.colors[color] || config.colors.default);

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) embed.setFooter({ text: footer });
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp();

  return embed;
}

/**
 * Create an error embed
 */
function errorEmbed(title, description) {
  return createEmbed({
    title: `❌ ${title}`,
    description,
    color: 'error',
    timestamp: true
  });
}

/**
 * Create a success embed
 */
function successEmbed(title, description) {
  return createEmbed({
    title: `✅ ${title}`,
    description,
    color: 'success',
    timestamp: true
  });
}

module.exports = {
  createEmbed,
  errorEmbed,
  successEmbed,
};
