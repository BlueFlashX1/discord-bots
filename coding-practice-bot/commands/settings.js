const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure your coding practice preferences')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('autopost')
        .setDescription('Enable/disable automatic problem posting')
        .addBooleanOption((option) =>
          option.setName('enabled').setDescription('Enable auto-posting').setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to post problems (required if enabling)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('difficulty')
        .setDescription('Set your preferred difficulty level')
        .addStringOption((option) =>
          option
            .setName('level')
            .setDescription('Difficulty level')
            .setRequired(true)
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('source')
        .setDescription('Set your preferred problem source')
        .addStringOption((option) =>
          option
            .setName('source')
            .setDescription('Problem source')
            .setRequired(true)
            .addChoices(
              { name: 'LeetCode', value: 'leetcode' },
              { name: 'Codewars', value: 'codewars' },
              { name: 'Random', value: 'random' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('codewars')
        .setDescription('Link your Codewars username for mastery tracking')
        .addStringOption((option) =>
          option.setName('username').setDescription('Your Codewars username').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mastery')
        .setDescription('Enable/disable mastery tracking and difficulty recommendations')
        .addBooleanOption((option) =>
          option.setName('enabled').setDescription('Enable mastery tracking').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('view').setDescription('View your settings, stats, and mastery progress')
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral = 64

    const userPreferences = interaction.client.userPreferences;
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'autopost': {
          const enabled = interaction.options.getBoolean('enabled');
          const channel = interaction.options.getChannel('channel');

          if (enabled && !channel) {
            return interaction.editReply({
              content: '❌ Channel is required when enabling auto-post. Please specify a channel.',
            });
          }

          if (enabled && channel && !channel.isTextBased()) {
            return interaction.editReply({
              content: '❌ Channel must be a text channel.',
            });
          }

          userPreferences.setAutoPost(interaction.user.id, enabled, channel?.id || null);

          const embed = new EmbedBuilder()
            .setTitle('✅ Auto-Post Settings Updated')
            .setDescription(
              `**Status:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                (enabled && channel ? `**Channel:** <#${channel.id}>\n` : '') +
                `\n${enabled ? 'Problems will be automatically posted to your channel!' : 'Auto-posting disabled.'}`
            )
            .setColor(enabled ? 0x00ff00 : 0xff0000)
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }

        case 'difficulty': {
          const difficulty = interaction.options.getString('level');
          userPreferences.setDifficulty(interaction.user.id, difficulty);

          const embed = new EmbedBuilder()
            .setTitle('✅ Difficulty Preference Updated')
            .setDescription(`**Preferred Difficulty:** ${difficulty.toUpperCase()}\n\nProblems will be filtered to this difficulty level.`)
            .setColor(0x00ff00)
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }

        case 'source': {
          const source = interaction.options.getString('source');
          userPreferences.setSource(interaction.user.id, source);

          const embed = new EmbedBuilder()
            .setTitle('✅ Source Preference Updated')
            .setDescription(`**Preferred Source:** ${source.toUpperCase()}\n\nProblems will be fetched from this source.`)
            .setColor(0x00ff00)
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }

        case 'codewars': {
          const username = interaction.options.getString('username');
          const codewarsProgress = interaction.client.codewarsProgress;

          try {
            // Verify username exists
            const profile = await codewarsProgress.getUserProfile(username);
            userPreferences.setCodewarsUsername(interaction.user.id, username);

            const embed = new EmbedBuilder()
              .setTitle('✅ Codewars Username Linked')
              .setDescription(
                `**Username:** ${username}\n` +
                  `**Honor:** ${profile.honor.toLocaleString()}\n` +
                  `**Rank:** ${profile.rank?.name || 'N/A'}\n` +
                  `**Completed:** ${profile.totalCompleted} kata\n\n` +
                  `Mastery tracking is now enabled! The bot will recommend difficulty increases based on your progress.`
              )
              .setColor(0x00ff00)
              .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
          } catch (error) {
            return interaction.editReply({
              content: `❌ Error: ${error.message}\n\nPlease check that your Codewars username is correct.`,
            });
          }
        }

        case 'mastery': {
          const enabled = interaction.options.getBoolean('enabled');
          userPreferences.setMasteryTracking(interaction.user.id, enabled);

          const prefs = userPreferences.getUserPreferences(interaction.user.id);
          if (enabled && !prefs.codewarsUsername) {
            return interaction.editReply({
              content:
                '❌ Please link your Codewars username first using `/settings codewars username:your_username`',
            });
          }

          const embed = new EmbedBuilder()
            .setTitle('✅ Mastery Tracking Updated')
            .setDescription(
              `**Status:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                (enabled
                  ? 'The bot will analyze your Codewars progress and recommend when to try harder difficulties!'
                  : 'Mastery tracking disabled.')
            )
            .setColor(enabled ? 0x00ff00 : 0xff0000)
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }

        case 'view': {
          const prefs = userPreferences.getUserPreferences(interaction.user.id);

          const embed = new EmbedBuilder()
            .setTitle('⚙️ Your Settings')
            .addFields(
              {
                name: '📬 Auto-Post',
                value: prefs.autoPost
                  ? `✅ Enabled\nChannel: ${prefs.autoPostChannel ? `<#${prefs.autoPostChannel}>` : 'Not set'}`
                  : '❌ Disabled',
                inline: true,
              },
              {
                name: '📊 Difficulty',
                value: prefs.preferredDifficulty.toUpperCase(),
                inline: true,
              },
              {
                name: '🔗 Source',
                value: prefs.preferredSource.toUpperCase(),
                inline: true,
              },
              {
                name: '⚔️ Codewars',
                value: prefs.codewarsUsername || 'Not linked',
                inline: true,
              },
              {
                name: '📈 Mastery Tracking',
                value: prefs.masteryTracking ? '✅ Enabled' : '❌ Disabled',
                inline: true,
              }
            )
            .setColor(0x0099ff)
            .setTimestamp();

          return interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('Error in settings command:', error);
      return interaction.editReply({
        content: '❌ An error occurred while updating settings. Please try again.',
      });
    }
  },
};
