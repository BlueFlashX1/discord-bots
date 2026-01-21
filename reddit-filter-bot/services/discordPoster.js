const { EmbedBuilder } = require('discord.js');

class DiscordPoster {
  constructor(config, discordClient) {
    this.config = config;
    this.discordClient = discordClient;
  }

  createEmbed(submission) {
    const embed = new EmbedBuilder()
      .setTitle(submission.title.substring(0, 256))
      .setURL(`https://reddit.com${submission.permalink}`)
      .setDescription(
        submission.selftext
          ? submission.selftext.substring(0, 2000)
          : 'No description'
      )
      .setColor(0xFF4500)
      .setTimestamp(new Date(submission.created_utc * 1000))
      .setAuthor({
        name: `r/${submission.subreddit.display_name}`,
        url: `https://reddit.com/r/${submission.subreddit.display_name}`
      })
      .addFields(
        { name: 'Score', value: `⬆️ ${submission.score}`, inline: true },
        { name: 'Comments', value: `💬 ${submission.num_comments}`, inline: true }
      )
      .setFooter({
        text: `Posted by u/${submission.author}`
      });

    if (submission.thumbnail && submission.thumbnail !== 'self' && submission.thumbnail !== 'default') {
      embed.setImage(submission.url);
    }

    return embed;
  }

  async postSubmission(submission, channelId) {
    // Use provided channel ID or fall back to default
    const targetChannelId = channelId || this.config.default_channel_id;
    const channel = this.discordClient.channels.cache.get(targetChannelId);

    if (!channel) {
      console.error(`Error: Channel ${targetChannelId} not found`);
      return;
    }

    try {
      const embed = this.createEmbed(submission);
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error posting to Discord:', error.message);
    }
  }
}

module.exports = { DiscordPoster };
