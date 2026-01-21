module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Coding Practice Bot logged in as ${client.user.tag}`);
    console.log(`📊 Loaded ${client.commands.size} commands`);

    // Start auto-poster if enabled
    if (client.problemAutoPoster) {
      // Default: Post once per day (24 hours)
      // Can be configured via environment variable
      const intervalHours = parseInt(process.env.AUTO_POST_INTERVAL_HOURS || '24', 10);
      client.problemAutoPoster.start(intervalHours);
      console.log(`🤖 Problem auto-poster started (interval: ${intervalHours} hours)`);
    }
  },
};
