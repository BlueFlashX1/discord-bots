// PM2 Ecosystem Configuration for Starboard Bot
// Add this to your main ecosystem.config.js or run separately

module.exports = {
  apps: [
    {
      name: 'starboard-bot',
      script: 'bot.py',
      interpreter: 'python3',
      cwd: '/root/discord-bots/starboard-bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/root/discord-bots/logs/starboard-bot-error.log',
      out_file: '/root/discord-bots/logs/starboard-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
