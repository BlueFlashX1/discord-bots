const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Handle download button
      if (customId.startsWith('download_')) {
        await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral = 64

        const parts = customId.split('_');
        const problemId = parts[1];
        const userId = parts[2];

        // Verify user owns this interaction
        if (interaction.user.id !== userId) {
          return interaction.editReply({
            content: '❌ This download button is not for you! Use `/problem` to get your own problem.',
            flags: 64, // MessageFlags.Ephemeral
          });
        }

        // Get current problem for user
        const problemService = client.problemService;
        const problem = problemService.getCurrentProblem(userId);

        if (!problem || problem.id !== problemId) {
          return interaction.editReply({
            content: '❌ Problem not found or expired. Use `/problem` to get a new problem.',
            flags: 64, // MessageFlags.Ephemeral
          });
        }

        // Generate and send file
        try {
          const fileGenerator = client.fileGenerator;
          const fileBuffer = fileGenerator.getFileBuffer(problem);
          const filename = problem.slug
            ? `${problem.slug.replace(/[^a-z0-9-]/gi, '_').toLowerCase()}.py`
            : `problem_${problem.id}.py`;

          const attachment = new AttachmentBuilder(fileBuffer, { name: filename });

          await interaction.editReply({
            content: `✅ **Starter file generated!**\n\n📁 File: \`${filename}\`\n💾 Saved to: \`data/codewars/\`\n\n💡 **Next steps:**\n1. Download and open the file\n2. Work on your solution where indicated\n3. Use \`/submit\` with your code or file attachment`,
            files: [attachment],
            flags: 64, // MessageFlags.Ephemeral
          });
        } catch (error) {
          console.error('Error generating file:', error);
          return interaction.editReply({
            content: `❌ Failed to generate file: ${error.message}`,
            flags: 64, // MessageFlags.Ephemeral
          });
        }

        return;
      }
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const reply = {
          content: '❌ There was an error executing this command!',
          flags: 64, // MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }
  },
};
