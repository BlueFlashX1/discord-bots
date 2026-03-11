module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    client.logger.info('Shadow away bot ready', {
      event: 'shadowaway_ready',
      userTag: client.user?.tag,
      userId: client.user?.id,
      guildCount: client.guilds.cache.size,
    });
  },
};
