const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const configManager = require('../services/configManager');
const { RedditClient } = require('../services/redditClient');

let redditClient = null;

function getRedditClient() {
  if (!redditClient) {
    redditClient = new RedditClient(configManager.getConfig());
  }
  return redditClient;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reddit')
    .setDescription('Manage Reddit monitoring')

    // Simple commands
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a subreddit to monitor')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit name (e.g. Python, gaming)')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to post matches (autocomplete with #)')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a subreddit')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List all monitored subreddits'))
    // DEPRECATED: Use /filter command instead (supports both include and exclude keywords)
    // .addSubcommand((sub) =>
    //   sub
    //     .setName('keywords')
    //     .setDescription('Set include keywords only (legacy - use /filter for include + exclude)')
    //     .addStringOption((opt) =>
    //       opt
    //         .setName('subreddit')
    //         .setDescription('Subreddit name')
    //         .setRequired(true)
    //         .setAutocomplete(true)
    //     )
    //     .addStringOption((opt) =>
    //       opt
    //         .setName('keywords')
    //         .setDescription('Keywords to watch for (comma-separated) or "all" for all posts')
    //         .setRequired(true)
    //     )
    // )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set channel for a subreddit')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit name')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to post to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable a subreddit')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('View current status'))
    .addSubcommand((sub) => sub.setName('pause').setDescription('Pause all monitoring'))
    .addSubcommand((sub) =>
      sub
        .setName('resume')
        .setDescription('Resume monitoring for a subreddit')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit to resume')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('stop')
        .setDescription('Stop monitoring for a subreddit')
        .addStringOption((opt) =>
          opt
            .setName('subreddit')
            .setDescription('Subreddit to stop')
            .setRequired(true)
            .setAutocomplete(true)
        )
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
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await handleAdd(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      // DEPRECATED: Use /filter command instead
      // case 'keywords':
      //   await handleKeywords(interaction);
      //   break;
      case 'channel':
        await handleChannel(interaction);
        break;
      case 'toggle':
        await handleToggle(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
      case 'pause':
        await handlePause(interaction);
        break;
      case 'resume':
        await handleResume(interaction);
        break;
      case 'stop':
        await handleStop(interaction);
        break;
    }
  },
};

async function handleAdd(interaction) {
  const name = interaction.options.getString('subreddit').replace(/^r\//, '');
  const channel = interaction.options.getChannel('channel'); // Now required

  await interaction.deferReply();

  // Verify subreddit exists
  const client = getRedditClient();
  const verification = await client.verifySubreddit(name);

  if (!verification.valid) {
    const embed = new EmbedBuilder()
      .setTitle('Subreddit Not Found')
      .setDescription(`Could not find **r/${name}**\n\n${verification.error}`)
      .setColor(0xe74c3c);
    return interaction.editReply({ embeds: [embed] });
  }

  // Add subreddit
  const result = configManager.addSubreddit(verification.name, {
    keywords: [],
    channel_id: channel.id, // Channel is now required
    min_score: 0,
  });

  if (!result.success) {
    const embed = new EmbedBuilder()
      .setTitle('Already Monitoring')
      .setDescription(result.message)
      .setColor(0xf1c40f);
    return interaction.editReply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setTitle('Subreddit Added')
    .setDescription(`Now monitoring **r/${verification.name}**`)
    .setColor(0x2ecc71)
    .addFields(
      {
        name: 'Subscribers',
        value: verification.subscribers?.toLocaleString() || 'N/A',
        inline: true,
      },
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      { name: 'Keywords', value: 'All posts (use `/reddit keywords` to filter)', inline: false }
    )
    .setFooter({ text: 'Tip: Use /reddit keywords to filter specific topics' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(interaction) {
  const name = interaction.options.getString('subreddit');
  const result = configManager.removeSubreddit(name);

  const embed = new EmbedBuilder()
    .setTitle(result.success ? 'Removed' : 'Error')
    .setDescription(result.success ? `Stopped monitoring **r/${name}**` : result.message)
    .setColor(result.success ? 0xe74c3c : 0xf1c40f);

  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
  const subreddits = configManager.getSubreddits();

  if (subreddits.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('No Subreddits')
      .setDescription('Use `/reddit add <subreddit>` to start monitoring')
      .setColor(0x3498db);
    return interaction.reply({ embeds: [embed] });
  }

  const lines = subreddits.map((name) => {
    const config = configManager.getSubredditConfig(name);
    const status = config.enabled ? '🟢' : '🔴';
    const includeInfo =
      config.keywords && config.keywords.length > 0 ? `${config.keywords.length} include` : 'all posts';
    const excludeInfo =
      config.excludeKeywords && config.excludeKeywords.length > 0 ? `, ${config.excludeKeywords.length} exclude` : '';
    return `${status} **r/${name}** → <#${config.channel_id}> (${includeInfo}${excludeInfo})`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Monitored Subreddits')
    .setDescription(lines.join('\n'))
    .setColor(0x3498db)
    .setFooter({ text: `${subreddits.length} subreddit(s) | 🟢 = active, 🔴 = disabled` });

  await interaction.reply({ embeds: [embed] });
}

// DEPRECATED: Use /filter command instead (supports both include and exclude keywords)
// async function handleKeywords(interaction) {
//   const subreddit = interaction.options.getString('subreddit');
//   const keywordsInput = interaction.options.getString('keywords');
//
//   const subConfig = configManager.getSubredditConfig(subreddit);
//   if (!subConfig) {
//     const embed = new EmbedBuilder()
//       .setTitle('Not Found')
//       .setDescription(
//         `**r/${subreddit}** is not being monitored. Add it first with \`/reddit add ${subreddit}\``
//       )
//       .setColor(0xe74c3c);
//     return interaction.reply({ embeds: [embed] });
//   }
//
//   // Handle "all" to clear keywords
//   if (keywordsInput.toLowerCase() === 'all') {
//     configManager.setKeywords(subreddit, []);
//     const embed = new EmbedBuilder()
//       .setTitle('Keywords Cleared')
//       .setDescription(`**r/${subreddit}** will now show **all posts**`)
//       .setColor(0x2ecc71);
//     return interaction.reply({ embeds: [embed] });
//   }
//
//   // Parse keywords
//   const keywords = keywordsInput
//     .split(',')
//     .map((k) => k.trim())
//     .filter((k) => k);
//
//   configManager.setKeywords(subreddit, keywords);
//
//   const embed = new EmbedBuilder()
//     .setTitle('Keywords Updated')
//     .setDescription(
//       `**r/${subreddit}** keywords set to:\n${keywords.map((k) => `• ${k}`).join('\n')}`
//     )
//     .setColor(0x2ecc71)
//     .setFooter({ text: 'Posts matching ANY of these keywords will be shown' });
//
//   await interaction.reply({ embeds: [embed] });
// }

async function handleChannel(interaction) {
  const subreddit = interaction.options.getString('subreddit');
  const channel = interaction.options.getChannel('channel');

  const result = configManager.setSubredditChannel(subreddit, channel.id);

  const embed = new EmbedBuilder()
    .setTitle(result.success ? 'Channel Updated' : 'Error')
    .setDescription(
      result.success ? `**r/${subreddit}** posts will go to <#${channel.id}>` : result.message
    )
    .setColor(result.success ? 0x2ecc71 : 0xe74c3c);

  await interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction) {
  const subreddit = interaction.options.getString('subreddit');

  const subConfig = configManager.getSubredditConfig(subreddit);
  if (!subConfig) {
    const embed = new EmbedBuilder()
      .setTitle('Not Found')
      .setDescription(`**r/${subreddit}** is not being monitored`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embed] });
  }

  const newState = !subConfig.enabled;
  configManager.toggleSubreddit(subreddit, newState);

  const embed = new EmbedBuilder()
    .setTitle(newState ? 'Enabled' : 'Disabled')
    .setDescription(`**r/${subreddit}** is now ${newState ? '🟢 active' : '🔴 disabled'}`)
    .setColor(newState ? 0x2ecc71 : 0xf1c40f);

  await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction) {
  const config = configManager.getConfig();
  const isPaused = configManager.getPaused();
  const subreddits = configManager.getSubreddits();

  const embed = new EmbedBuilder()
    .setTitle('Reddit Monitor Status')
    .setColor(isPaused ? 0xf1c40f : 0x2ecc71)
    .addFields(
      { name: 'Status', value: isPaused ? '⏸️ Paused' : '▶️ Running', inline: true },
      { name: 'Subreddits', value: `${subreddits.length}`, inline: true },
      { name: 'Check Interval', value: `${config.check_interval || 300}s`, inline: true }
    );

  if (subreddits.length > 0) {
    const activeCount = subreddits.filter(
      (s) => configManager.getSubredditConfig(s).enabled
    ).length;
    embed.addFields({
      name: 'Active/Total',
      value: `${activeCount}/${subreddits.length}`,
      inline: true,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handlePause(interaction) {
  if (configManager.getPaused()) {
    const embed = new EmbedBuilder()
      .setTitle('Already Paused')
      .setDescription('Use `/reddit resume` to continue')
      .setColor(0xf1c40f);
    return interaction.reply({ embeds: [embed] });
  }

  configManager.setPaused(true);
  const embed = new EmbedBuilder()
    .setTitle('⏸️ Paused')
    .setDescription('Reddit monitoring paused. Use `/reddit resume` to continue.')
    .setColor(0xf1c40f);
  await interaction.reply({ embeds: [embed] });
}

async function handleResume(interaction) {
  const subreddit = interaction.options.getString('subreddit');

  const subConfig = configManager.getSubredditConfig(subreddit);
  if (!subConfig) {
    const embed = new EmbedBuilder()
      .setTitle('Not Found')
      .setDescription(
        `**r/${subreddit}** is not being monitored. Add it first with \`/reddit add ${subreddit}\``
      )
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embed] });
  }

  if (subConfig.enabled) {
    const embed = new EmbedBuilder()
      .setTitle('Already Active')
      .setDescription(`**r/${subreddit}** is already being monitored`)
      .setColor(0x2ecc71);
    return interaction.reply({ embeds: [embed] });
  }

  configManager.toggleSubreddit(subreddit, true);
  const embed = new EmbedBuilder()
    .setTitle('▶️ Resumed')
    .setDescription(`Monitoring resumed for **r/${subreddit}**`)
    .setColor(0x2ecc71);
  await interaction.reply({ embeds: [embed] });
}

async function handleStop(interaction) {
  const subreddit = interaction.options.getString('subreddit');

  const subConfig = configManager.getSubredditConfig(subreddit);
  if (!subConfig) {
    const embed = new EmbedBuilder()
      .setTitle('Not Found')
      .setDescription(`**r/${subreddit}** is not being monitored`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embed] });
  }

  if (!subConfig.enabled) {
    const embed = new EmbedBuilder()
      .setTitle('Already Stopped')
      .setDescription(`**r/${subreddit}** is already stopped`)
      .setColor(0xf1c40f);
    return interaction.reply({ embeds: [embed] });
  }

  configManager.toggleSubreddit(subreddit, false);
  const embed = new EmbedBuilder()
    .setTitle('⏹️ Stopped')
    .setDescription(`Monitoring stopped for **r/${subreddit}**`)
    .setColor(0xe74c3c);
  await interaction.reply({ embeds: [embed] });
}
