const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('problem')
    .setDescription('Get a Python coding problem to practice')
    .addStringOption((option) =>
      option
        .setName('difficulty')
        .setDescription('Problem difficulty')
        .addChoices(
          { name: 'Easy', value: 'easy' },
          { name: 'Medium', value: 'medium' },
          { name: 'Hard', value: 'hard' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('Problem source')
        .addChoices(
          { name: 'LeetCode', value: 'leetcode' },
          { name: 'Codewars', value: 'codewars' },
          { name: 'Random', value: 'random' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const difficulty = interaction.options.getString('difficulty') || null;
    const source = interaction.options.getString('source') || 'random';

    const problemService = interaction.client.problemService;
    const problem = await problemService.getRandomProblem(difficulty, source === 'random' ? null : source);

    if (!problem) {
      return interaction.editReply({
        content: '❌ Failed to fetch a problem. Please try again later.',
      });
    }

    // Set as current problem for user
    problemService.setCurrentProblem(interaction.user.id, problem);

    // Mark as attempted
    const progressService = interaction.client.progressService;
    progressService.markAttempted(interaction.user.id, problem.id);

    const difficultyEmoji = {
      easy: '🟢',
      medium: '🟡',
      hard: '🔴',
    };

    const embed = new EmbedBuilder()
      .setTitle(`${difficultyEmoji[problem.difficulty] || '📝'} ${problem.title}`)
      .setDescription(
        `**Difficulty:** ${problem.difficulty.toUpperCase()}\n` +
          `**Source:** ${problem.source.toUpperCase()}\n` +
          (problem.rank
            ? `**Rank:** ${problem.rank.name} (${problem.rank.color})\n`
            : '') +
          `**Tags:** ${problem.tags?.join(', ') || 'N/A'}\n` +
          (problem.category ? `**Category:** ${problem.category}\n` : '') +
          `\n[View Problem](${problem.url})\n\n` +
          `**How to submit:**\n` +
            `1. Type your solution in a code block: \`\`\`python\n# your code\n\`\`\`\n` +
          `2. Or attach a .py file\n` +
          `3. Use /submit to validate your solution`
      )
      .setColor(problem.difficulty === 'easy' ? 0x00ff00 : problem.difficulty === 'medium' ? 0xffaa00 : 0xff0000)
      .setFooter({ text: `Problem ID: ${problem.id}` })
      .setTimestamp();

    // Add Codewars-specific stats if available
    if (problem.stats && problem.source === 'codewars') {
      embed.addFields({
        name: '📊 Codewars Stats',
        value:
          `**Completed:** ${problem.stats.totalCompleted.toLocaleString()}\n` +
          `**Attempts:** ${problem.stats.totalAttempts.toLocaleString()}\n` +
          `**Stars:** ${problem.stats.totalStars || 0}`,
        inline: true,
      });
    }

    if (problem.description) {
      // Clean up markdown for Discord
      let cleanDescription = problem.description;
      
      // Remove Codewars conditional blocks (keep only Python-compatible content)
      // Pattern: ~+if[-not]:[languages]\n[content]\n~
      if (problem.source === 'codewars') {
        // Remove all conditional blocks (they're language-specific and cause strikethrough)
        // Match: ~+if[-not]:[condition]\n[content]\n~
        cleanDescription = cleanDescription
          // Remove conditional blocks: ~if[-not]:condition\ncontent\n~
          .replace(/~+if[^~\n]*\n[\s\S]*?\n~/g, '')
          // Remove any remaining standalone tildes that cause strikethrough
          .replace(/^~+|~+$/gm, '') // Remove leading/trailing tildes on lines
          .replace(/\n~+\n/g, '\n') // Remove lines with only tildes
          .replace(/~+/g, '') // Remove any remaining tildes
          // Clean up multiple newlines
          .replace(/\n{3,}/g, '\n\n');
      }
      
      // Remove code blocks (replace with placeholder)
      cleanDescription = cleanDescription.replace(/```[\s\S]*?```/g, '[Code Block]');
      
      // Remove inline code backticks that might break formatting
      cleanDescription = cleanDescription.replace(/`([^`]+)`/g, '$1');
      
      // Trim and limit length
      cleanDescription = cleanDescription.trim();
      const originalLength = cleanDescription.length;
      cleanDescription = cleanDescription.substring(0, 1000);
      if (originalLength > 1000) {
        cleanDescription += '...';
      }
      
      embed.addFields({
        name: '📝 Description',
        value: cleanDescription || 'No description available',
      });
    }

    // Add download button for Codewars problems
    const components = [];
    if (problem.source === 'codewars') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`download_${problem.id}_${interaction.user.id}`)
          .setLabel('📥 Download Starter File')
          .setStyle(ButtonStyle.Primary)
      );
      components.push(row);
    }

    await interaction.editReply({ 
      embeds: [embed],
      components: components.length > 0 ? components : undefined,
    });
  },
};
