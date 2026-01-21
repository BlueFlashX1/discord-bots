const { EmbedBuilder } = require('discord.js');

// Discord embed limits
const EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  total: 6000,
};

/**
 * Truncate text to fit Discord embed limits
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string}
 */
function truncate(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Split long text into chunks that fit within Discord embed limits
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string[]} Array of text chunks
 */
function splitText(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline or space to avoid breaking words
    let splitPoint = maxLength - suffix.length;
    const lastNewline = remaining.lastIndexOf('\n', splitPoint);
    const lastSpace = remaining.lastIndexOf(' ', splitPoint);

    // Prefer splitting at newline, then space, then hard cut
    if (lastNewline > maxLength * 0.5) {
      splitPoint = lastNewline + 1;
    } else if (lastSpace > maxLength * 0.5) {
      splitPoint = lastSpace + 1;
    }

    chunks.push(remaining.substring(0, splitPoint) + suffix);
    remaining = remaining.substring(splitPoint);
  }

  return chunks;
}
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
  timestamp = false,
}) {
  const embed = new EmbedBuilder()
    .setTitle(truncate(title || '', EMBED_LIMITS.title))
    .setDescription(truncate(description || '', EMBED_LIMITS.description))
    .setColor(config.colors[color] || config.colors.default);

  if (fields.length > 0) {
    // Truncate field names and values
    const truncatedFields = fields.map((field) => ({
      ...field,
      name: truncate(field.name || '', EMBED_LIMITS.fieldName),
      value: truncate(field.value || '', EMBED_LIMITS.fieldValue),
    }));
    embed.addFields(truncatedFields);
  }

  if (footer) embed.setFooter({ text: truncate(footer, EMBED_LIMITS.footer) });
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
    title: title,
    description,
    color: 'error',
    timestamp: true,
  });
}

/**
 * Create a success embed
 */
function successEmbed(title, description) {
  return createEmbed({
    title: title,
    description,
    color: 'success',
    timestamp: true,
  });
}

module.exports = {
  createEmbed,
  truncate,
  splitText,
  EMBED_LIMITS,
  errorEmbed,
  successEmbed,
};
