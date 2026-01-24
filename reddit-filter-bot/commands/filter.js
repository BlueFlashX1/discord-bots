const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const configManager = require('../services/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Set include/exclude keywords for Reddit post filtering')
    .addStringOption((opt) =>
      opt
        .setName('subreddit')
        .setDescription('Subreddit name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('include')
        .setDescription('Keywords to watch for (comma-separated, or "all" to show all posts)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('exclude')
        .setDescription('Keywords to exclude (comma-separated, posts with these will be filtered out)')
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const subreddits = configManager.getSubreddits();

    if (focusedOption.name === 'subreddit') {
      const filtered = subreddits
        .filter((s) => s.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25)
        .map((s) => ({ name: `r/${s}`, value: s }));
      await interaction.respond(filtered);
    }
  },

  async execute(interaction) {
    const subreddit = interaction.options.getString('subreddit');
    const includeInput = interaction.options.getString('include');
    const excludeInput = interaction.options.getString('exclude');

    const subConfig = configManager.getSubredditConfig(subreddit);
    if (!subConfig) {
      const embed = new EmbedBuilder()
        .setTitle('Subreddit Not Found')
        .setDescription(
          `**r/${subreddit}** is not being monitored. Add it first with \`/reddit add ${subreddit}\``
        )
        .setColor(0xe74c3c);
      return interaction.reply({ embeds: [embed] });
    }

    // If neither include nor exclude provided, show current filters
    if (includeInput === null && excludeInput === null) {
      const currentInclude = subConfig.keywords || [];
      const currentExclude = subConfig.excludeKeywords || [];

      const embed = new EmbedBuilder()
        .setTitle(`Current Filters for r/${subreddit}`)
        .setColor(0x3498db);

      if (currentInclude.length === 0) {
        embed.addFields({
          name: 'Include Keywords',
          value: 'All posts (no filter)',
          inline: false,
        });
      } else {
        embed.addFields({
          name: 'Include Keywords',
          value: currentInclude.map((k) => `• ${k}`).join('\n'),
          inline: false,
        });
      }

      if (currentExclude.length === 0) {
        embed.addFields({
          name: 'Exclude Keywords',
          value: 'None (no exclusions)',
          inline: false,
        });
      } else {
        embed.addFields({
          name: 'Exclude Keywords',
          value: currentExclude.map((k) => `• ${k}`).join('\n'),
          inline: false,
        });
      }

      embed.setFooter({ text: 'Use /filter with include/exclude parameters to update filters' });
      return interaction.reply({ embeds: [embed] });
    }

    let includeKeywords = subConfig.keywords || [];
    let excludeKeywords = subConfig.excludeKeywords || [];

    // Handle include keywords (only update if provided)
    if (includeInput !== null) {
      if (includeInput.toLowerCase() === 'all' || includeInput.trim() === '') {
        includeKeywords = [];
      } else {
        includeKeywords = includeInput
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k);
      }
    }

    // Handle exclude keywords (only update if provided)
    if (excludeInput !== null) {
      if (excludeInput.trim() === '') {
        excludeKeywords = [];
      } else {
        excludeKeywords = excludeInput
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k);
      }
    }

    // Update config (only update what was provided)
    if (includeInput !== null) {
      configManager.setKeywords(subreddit, includeKeywords);
    }
    if (excludeInput !== null) {
      configManager.setExcludeKeywords(subreddit, excludeKeywords);
    }

    // Get updated config for display
    const updatedConfig = configManager.getSubredditConfig(subreddit);
    const finalInclude = updatedConfig.keywords || [];
    const finalExclude = updatedConfig.excludeKeywords || [];

    // Build response
    const embed = new EmbedBuilder()
      .setTitle('Filter Updated')
      .setDescription(`**r/${subreddit}** filter settings:`)
      .setColor(0x2ecc71);

    // Include keywords
    if (finalInclude.length === 0) {
      embed.addFields({
        name: 'Include Keywords',
        value: 'All posts (no filter)',
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Include Keywords',
        value: finalInclude.map((k) => `• ${k}`).join('\n') || 'None',
        inline: false,
      });
    }

    // Exclude keywords
    if (finalExclude.length === 0) {
      embed.addFields({
        name: 'Exclude Keywords',
        value: 'None (no exclusions)',
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Exclude Keywords',
        value: finalExclude.map((k) => `• ${k}`).join('\n'),
        inline: false,
      });
    }

    // Add explanation
    let explanation = '';
    if (finalInclude.length > 0 && finalExclude.length > 0) {
      explanation = 'Posts must contain at least one include keyword AND must not contain any exclude keywords.';
    } else if (finalInclude.length > 0) {
      explanation = 'Posts must contain at least one include keyword.';
    } else if (finalExclude.length > 0) {
      explanation = 'Posts will be shown unless they contain any exclude keywords.';
    } else {
      explanation = 'All posts will be shown (no filtering).';
    }

    embed.setFooter({ text: explanation });

    await interaction.reply({ embeds: [embed] });
  },
};
