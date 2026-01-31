const { EmbedBuilder } = require('discord.js');

const DISCORD_FIELD_VALUE_LIMIT = 1024;
const DESCRIPTION_TRUNCATE = 1018;
const CODE_BLOCK_MAX_CHARS = 600;

const DIFFICULTY_EMOJI = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

const DIFFICULTY_COLOR = {
  easy: 0x00ff00,
  medium: 0xffaa00,
  hard: 0xff0000,
};

function cleanDescriptionForEmbed(description, source, problemUrl = '') {
  if (!description || typeof description !== 'string') {
    return '';
  }

  let clean = description;

  if (source === 'codewars') {
    clean = clean
      .replace(/~+if[^~\n]*\n[\s\S]*?\n~/g, '')
      .replace(/^~+|~+$/gm, '')
      .replace(/\n~+\n/g, '\n')
      .replace(/~+/g, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  clean = clean.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmed = code.trim();
    if (trimmed.length <= CODE_BLOCK_MAX_CHARS) {
      return `\`\`\`${lang || 'text'}\n${trimmed}\n\`\`\``;
    }
    const truncated = trimmed.substring(0, CODE_BLOCK_MAX_CHARS - 20).trim();
    const suffix = problemUrl
      ? `\n... [view full at problem link]`
      : '\n... [truncated]';
    return `\`\`\`${lang || 'text'}\n${truncated}${suffix}\n\`\`\``;
  });

  clean = clean
    .replace(/'''([\s\S]*?)'''/g, (_, code) => {
      const trimmed = code.trim();
      if (trimmed.length <= CODE_BLOCK_MAX_CHARS) {
        return `\`\`\`python\n${trimmed}\n\`\`\``;
      }
      return `\`\`\`python\n${trimmed.substring(0, CODE_BLOCK_MAX_CHARS - 15).trim()}...\n\`\`\``;
    })
    .replace(/"""([\s\S]*?)"""/g, (_, code) => {
      const trimmed = code.trim();
      if (trimmed.length <= CODE_BLOCK_MAX_CHARS) {
        return `\`\`\`python\n${trimmed}\n\`\`\``;
      }
      return `\`\`\`python\n${trimmed.substring(0, CODE_BLOCK_MAX_CHARS - 15).trim()}...\n\`\`\``;
    });

  const originalLength = clean.trim().length;
  clean = clean.trim().substring(0, DESCRIPTION_TRUNCATE);
  if (originalLength > DESCRIPTION_TRUNCATE) {
    clean += '...';
  }

  if (clean.length > DISCORD_FIELD_VALUE_LIMIT) {
    clean = clean.substring(0, DISCORD_FIELD_VALUE_LIMIT - 3) + '...';
  }

  return clean;
}

function createProblemEmbed(problem, options = {}) {
  const { footerSuffix = '', showStats = true } = options;
  const emoji = DIFFICULTY_EMOJI[problem.difficulty] || '📝';
  const color = DIFFICULTY_COLOR[problem.difficulty] ?? 0x808080;

  const descriptionParts = [
    `**Difficulty:** ${problem.difficulty.toUpperCase()}`,
    `**Source:** ${problem.source.toUpperCase()}`,
    problem.rank ? `**Rank:** ${problem.rank.name}` : null,
    `**Tags:** ${problem.tags?.join(', ') || 'N/A'}`,
    problem.category ? `**Category:** ${problem.category}` : null,
    '',
    `[View Problem](${problem.url})`,
    '',
    `**How to submit:** Reply with a \`python\` code block or attach a .py file. Use \`/submit\` to validate.`,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${problem.title}`)
    .setDescription(descriptionParts.join('\n'))
    .setColor(color)
    .setFooter({ text: `Problem ID: ${problem.id}${footerSuffix ? ` | ${footerSuffix}` : ''}` })
    .setTimestamp();

  if (showStats && problem.stats && problem.source === 'codewars') {
    embed.addFields({
      name: 'Codewars Stats',
      value:
        `**Completed:** ${problem.stats.totalCompleted.toLocaleString()}\n` +
        `**Attempts:** ${problem.stats.totalAttempts.toLocaleString()}\n` +
        `**Stars:** ${problem.stats.totalStars || 0}`,
      inline: true,
    });
  }

  if (problem.description) {
    const cleanDescription = cleanDescriptionForEmbed(
      problem.description,
      problem.source,
      problem.url
    );
    embed.addFields({
      name: 'Description',
      value: cleanDescription || 'No description available',
    });
  }

  return embed;
}

const CODEWARS_DASHBOARD_URL = 'https://www.codewars.com/dashboard';
const CODEWARS_KATA_SEARCH_URL =
  'https://www.codewars.com/kata/search/my-languages?q=&beta=false&order_by=rank_id%20asc';

function createCodewarsLinksEmbed(options = {}) {
  const { footerSuffix = '' } = options;
  return new EmbedBuilder()
    .setTitle('Codewars')
    .setDescription(
      'Codewars fetching is disabled. Browse kata manually using the links below.'
    )
    .addFields(
      {
        name: 'Dashboard',
        value: `[Open Codewars Dashboard](${CODEWARS_DASHBOARD_URL})`,
        inline: true,
      },
      {
        name: 'Kata Search',
        value: `[Browse Kata by Difficulty](${CODEWARS_KATA_SEARCH_URL})`,
        inline: true,
      }
    )
    .setColor(0xbb432c)
    .setFooter({ text: `Codewars${footerSuffix ? ` | ${footerSuffix}` : ''}` })
    .setTimestamp();
}

module.exports = {
  cleanDescriptionForEmbed,
  createProblemEmbed,
  createCodewarsLinksEmbed,
  DISCORD_FIELD_VALUE_LIMIT,
};
