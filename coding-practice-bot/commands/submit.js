const { SlashCommandBuilder, EmbedBuilder, Attachment } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your solution code')
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('Your Python code (or leave empty if attaching file)')
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName('file')
        .setDescription('Attach a .py file with your solution')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const problemService = interaction.client.problemService;
    const codeValidator = interaction.client.codeValidator;
    const progressService = interaction.client.progressService;

    // Get current problem
    const currentProblem = problemService.getCurrentProblem(interaction.user.id);

    if (!currentProblem) {
      return interaction.editReply({
        content: '❌ No active problem! Use `/problem` to get a problem first.',
      });
    }

    // Extract code
    let code = null;
    const codeInput = interaction.options.getString('code');
    const fileAttachment = interaction.options.getAttachment('file');

    if (fileAttachment) {
      // Validate file type
      if (!fileAttachment.name.endsWith('.py')) {
        return interaction.editReply({
          content: '❌ Please attach a .py file!',
        });
      }

      try {
        code = await codeValidator.extractCodeFromAttachment(fileAttachment);
      } catch (error) {
        return interaction.editReply({
          content: `❌ Failed to read file: ${error.message}`,
        });
      }
    } else if (codeInput) {
      code = codeValidator.extractCodeFromMessage(codeInput);
    } else {
      return interaction.editReply({
        content: '❌ Please provide code either in the code parameter or as a file attachment!',
      });
    }

    if (!code || code.length < 10) {
      return interaction.editReply({
        content: '❌ Code is too short or empty!',
      });
    }

    // Validate code
    const result = await codeValidator.validateCode(code, currentProblem);

    const embed = new EmbedBuilder()
      .setTitle(`Solution for: ${currentProblem.title}`)
      .setTimestamp();

    if (!result.valid) {
      embed
        .setColor(0xff0000)
        .setDescription('❌ **Syntax Error**')
        .addFields({
          name: 'Error',
          value: `\`\`\`\n${result.error}\n\`\`\``,
        });
    } else if (result.passed === null) {
      // Syntax only check
      embed
        .setColor(0x00aaff)
        .setDescription(
          '✅ **Syntax Valid**\n\n⚠️ No test cases available for this problem. Code compiles successfully!'
        )
        .addFields({
          name: 'Note',
          value: 'This problem does not have automated tests. Verify your solution manually.',
        });
    } else if (result.passed) {
      // Tests passed
      embed
        .setColor(0x00ff00)
        .setDescription('🎉 **All Tests Passed!**')
        .addFields({
          name: 'Output',
          value: `\`\`\`\n${result.output || 'Success'}\n\`\`\``,
        });

      // Mark as solved
      progressService.markSolved(interaction.user.id, currentProblem.id, currentProblem.difficulty);

      // Archive successful submission (messageId will be updated after reply)
      const submissionArchive = interaction.client.submissionArchive;
      submissionArchive.archiveSubmission(
        interaction.user.id,
        interaction.user.username,
        currentProblem,
        code,
        result,
        null, // messageId (will be set after reply)
        interaction.channel.id
      );

      // Add archive info to embed
      embed.addFields({
        name: '📚 Archived',
        value: `Solution archived! Use \`/solutions\` to view your solutions.`,
        inline: true,
      });

      // Clear current problem
      problemService.clearCurrentProblem(interaction.user.id);
    } else {
      // Tests failed
      embed
        .setColor(0xffaa00)
        .setDescription('⚠️ **Tests Failed**')
        .addFields({
          name: 'Error',
          value: `\`\`\`\n${result.error || 'Test failure'}\n\`\`\``,
        });

      if (result.output) {
        embed.addFields({
          name: 'Output',
          value: `\`\`\`\n${result.output.substring(0, 500)}\n\`\`\``,
        });
      }
    }

    const reply = await interaction.editReply({ embeds: [embed] });

    // Update submission with message ID if successful
    if (result.passed && reply) {
      const submissionArchive = interaction.client.submissionArchive;
      // Find the most recent submission for this user (just archived)
      const userSubmissions = submissionArchive.getUserSubmissions(interaction.user.id, 1);
      if (userSubmissions.length > 0 && userSubmissions[0].messageId === null) {
        userSubmissions[0].messageId = reply.id;
        submissionArchive.saveSubmissions();
      }
    }
  },
};
