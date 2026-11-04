"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const init_db_1 = require("./utils/init-db");
const ready_1 = require("./handlers/ready");
const message_1 = require("./handlers/message");
const memory_1 = require("./services/memory");
const log = logger_1.logger.child({ module: 'main' });
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message, discord_js_1.Partials.Reaction],
});
let startTime = Date.now();
client.once('clientReady', async () => {
    startTime = Date.now();
    await (0, ready_1.handleReady)(client);
});
client.on('disconnect', ready_1.handleDisconnect);
client.on('reconnecting', ready_1.handleReconnecting);
client.on('error', ready_1.handleError);
client.on('messageCreate', async (message) => {
    if (!(0, message_1.shouldRespond)(message))
        return;
    await (0, message_1.queueMessage)(message);
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
async function shutdown() {
    log.info('Saving stats and closing connections...');
    try {
        const db = await memory_1.memoryService.getStats();
        log.info({ ...db, uptime: Date.now() - startTime }, 'Final stats');
    }
    catch (error) {
        log.error({ error }, 'Error saving final stats');
    }
    try {
        await client.destroy();
        log.info('Discord client destroyed');
    }
    catch (error) {
        log.error({ error }, 'Error destroying client');
    }
    log.info('Goodbye! 👋');
    process.exit(0);
}
async function main() {
    try {
        log.info('Starting Lisa bot...');
        log.info({ version: '1.2.0', node: process.version }, 'Environment');
        await (0, init_db_1.initializeDatabase)();
        log.info('Database initialized');
        (0, config_1.validateConfig)();
        log.info('Config validated');
        await client.login(config_1.config.discord.token);
    }
    catch (error) {
        log.fatal({ error }, 'Failed to start bot');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map