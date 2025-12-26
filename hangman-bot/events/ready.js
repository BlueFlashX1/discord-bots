module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🔧 Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`📊 Loaded ${client.commands.size} command(s)`);

    // Set bot activity
    client.user.setActivity('Spelling Bee 🐝', { type: 'PLAYING' });
  },
};
