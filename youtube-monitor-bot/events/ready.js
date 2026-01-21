module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ YouTube Monitor Bot logged in as ${client.user.tag}`);
    console.log(`📊 Loaded ${client.commands.size} commands`);

    // Start monitoring
    if (client.youtubeMonitor) {
      client.youtubeMonitor.start();
    }
  },
};
