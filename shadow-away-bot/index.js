require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const Logger = require('../utils/logger');
const { StateStore } = require('./services/stateStore');
const { ShadowAwayService } = require('./services/shadowAwayService');
const { buildBridgeServer } = require('./services/bridgeServer');
const { ShadowAwayAIResponder } = require('./services/aiResponder');

function parseCsv(value) {
  if (!value) return [];
  return [...new Set(String(value).split(',').map((v) => v.trim()).filter(Boolean))];
}

function validateEnv(logger) {
  const token = process.env.DISCORD_TOKEN;
  if (!token || token.length < 50) {
    logger.error('DISCORD_TOKEN is required and appears invalid');
    process.exit(1);
  }

  const ownerIds = parseCsv(process.env.OWNER_USER_IDS || process.env.OWNER_USER_ID);
  if (ownerIds.length === 0) {
    logger.error('OWNER_USER_IDS (or OWNER_USER_ID) is required');
    process.exit(1);
  }

  return {
    token,
    ownerIds,
    targetUserId: process.env.SHADOW_TARGET_USER_ID || ownerIds[0],
    deployedGuildIds: parseCsv(process.env.SHADOW_DEPLOYED_GUILD_IDS),
  };
}

async function start() {
  const logger = new Logger('shadow-away-bot', { script: __filename });
  const env = validateEnv(logger);

  const statePath = process.env.SHADOWAWAY_STATE_FILE || path.join(__dirname, 'data', 'shadow-away-state.json');
  const store = new StateStore(statePath, logger, {
    ownerUserIds: env.ownerIds.join(','),
    targetUserId: env.targetUserId,
    deployedGuildIds: env.deployedGuildIds.join(','),
  });

  // Ensure env-controlled identity/deployment values are synchronized.
  store.updateProfile((profile) => ({
    ...profile,
    ownerUserIds: env.ownerIds,
    targetUserId: env.targetUserId,
    deployedGuildIds: env.deployedGuildIds,
  }));

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.commands = new Collection();
  client.logger = logger;

  const aiResponder = new ShadowAwayAIResponder({ logger });
  const shadowAwayService = new ShadowAwayService({ client, store, logger, aiResponder });
  client.shadowAwayService = shadowAwayService;

  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter((name) => name.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(commandsPath, file));
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Skipping command ${file} missing data/execute`);
      }
    }
  }

  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const files = fs.readdirSync(eventsPath).filter((name) => name.endsWith('.js'));
    for (const file of files) {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.debug(`Loaded event: ${event.name}`);
    }
  }

  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection', error);
  });

  const bridgeServer = buildBridgeServer({ logger, service: shadowAwayService });

  async function gracefulShutdown(signal) {
    logger.info('Graceful shutdown requested', {
      event: 'shadowaway_shutdown',
      signal,
    });

    try {
      if (bridgeServer) {
        await new Promise((resolve) => bridgeServer.close(resolve));
      }
    } catch (error) {
      logger.warn('Bridge shutdown error', {
        event: 'shadowaway_bridge_shutdown_error',
        error: error.message,
      });
    }

    client.destroy();
    process.exit(0);
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  await client.login(env.token);
  logger.info('Shadow away bot login successful', {
    event: 'shadowaway_login_success',
    targetUserId: env.targetUserId,
    ownerCount: env.ownerIds.length,
    deployedGuildCount: env.deployedGuildIds.length,
    aiAvailable: aiResponder.isEnabled(),
  });
}

start().catch((error) => {
  const fallbackLogger = new Logger('shadow-away-bot', { script: __filename });
  fallbackLogger.error('Fatal startup failure', error);
  process.exit(1);
});
