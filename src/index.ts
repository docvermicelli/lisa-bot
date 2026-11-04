import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { initializeDatabase } from './utils/init-db';
import { handleReady, handleDisconnect, handleReconnecting, handleError } from './handlers/ready';
import { queueMessage, shouldRespond } from './handlers/message';
import { memoryService } from './services/memory';

const log = logger.child({ module: 'main' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

let startTime = Date.now();

client.once('clientReady', async () => {
  startTime = Date.now();
  await handleReady(client);
});

client.on('disconnect', handleDisconnect);
client.on('reconnecting', handleReconnecting);
client.on('error', handleError);

client.on('messageCreate', async (message) => {
  if (!shouldRespond(message)) return;
  await queueMessage(message);
});

process.on('SIGINT', async () => {
  log.info('Received SIGINT, shutting down gracefully...');
  await shutdown();
});

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM, shutting down gracefully...');
  await shutdown();
});

process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (error) => {
  log.error({ error }, 'Uncaught exception');
  shutdown();
});

async function shutdown(): Promise<void> {
  log.info('Saving stats and closing connections...');

  try {
    const db = await memoryService.getStats();
    log.info({ ...db, uptime: Date.now() - startTime }, 'Final stats');
  } catch (error) {
    log.error({ error }, 'Error saving final stats');
  }

  try {
    await client.destroy();
    log.info('Discord client destroyed');
  } catch (error) {
    log.error({ error }, 'Error destroying client');
  }

  log.info('Goodbye! 👋');
  process.exit(0);
}

async function main(): Promise<void> {
  try {
    log.info('Starting Lisa bot...');
    log.info({ version: '1.2.0', node: process.version }, 'Environment');

    await initializeDatabase();
    log.info('Database initialized');

    validateConfig();
    log.info('Config validated');

    await client.login(config.discord.token);
  } catch (error) {
    log.fatal({ error }, 'Failed to start bot');
    process.exit(1);
  }
}

main();