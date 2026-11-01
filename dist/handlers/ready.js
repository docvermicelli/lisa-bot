"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReady = handleReady;
exports.handleDisconnect = handleDisconnect;
exports.handleReconnecting = handleReconnecting;
exports.handleError = handleError;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const ollama_1 = require("../services/ollama");
const memory_1 = require("../services/memory");
const personality_1 = require("../services/personality");
const log = logger_1.logger.child({ module: 'handler:ready' });
// Define slash commands
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('lisa')
        .setDescription('Check your relationship status with Lisa')
        .toJSON(),
];
async function registerCommands(client) {
    const rest = new discord_js_1.REST({ version: '10' }).setToken(config_1.config.discord.token);
    try {
        log.info('Registering slash commands...');
        // Register for specific guild (faster for testing)
        await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.config.discord.clientId, config_1.config.discord.guildId), { body: commands });
        log.info('Slash commands registered successfully!');
    }
    catch (error) {
        log.error({ error }, 'Failed to register slash commands');
    }
}
async function handleReady(client) {
    log.info({ username: client.user?.tag }, 'Bot logged in');
    // Register slash commands
    await registerCommands(client);
    const healthOk = await ollama_1.ollamaService.checkHealth();
    if (!healthOk) {
        log.warn('Ollama not reachable - bot will still run but AI responses will fail');
        log.warn('Make sure Ollama is running: ollama serve');
    }
    else {
        const models = await ollama_1.ollamaService.listModels();
        log.info({ models, current: ollama_1.ollamaService.getDefaultModel() }, 'Ollama connected');
        if (!models.includes(config_1.config.ollama.model)) {
            log.warn({ model: config_1.config.ollama.model }, 'Configured model not found, attempting to pull...');
            await ollama_1.ollamaService.pullModel(config_1.config.ollama.model);
        }
    }
    const stats = await memory_1.memoryService.getStats();
    log.info({ ...stats }, 'Memory stats loaded');
    const personality = personality_1.personalityService.getPersonalityType();
    log.info({ personality }, 'Personality loaded');
    const guild = client.guilds.cache.get(config_1.config.discord.guildId);
    if (guild) {
        const channel = guild.channels.cache.get(config_1.config.discord.channelId);
        if (channel) {
            log.info({ guild: guild.name, channel: channel.name }, 'Target server/channel found');
        }
        else {
            log.warn({ channelId: config_1.config.discord.channelId }, 'Target channel not found');
        }
    }
    else {
        log.warn({ guildId: config_1.config.discord.guildId }, 'Target guild not found');
    }
    client.user?.setPresence({
        activities: [{
                name: `with ${config_1.config.personality.name} 💕`,
                type: discord_js_1.ActivityType.Playing,
            }],
        status: 'online',
    });
    log.info('Bot ready and online!');
}
async function handleDisconnect() {
    log.warn('Bot disconnected');
}
async function handleReconnecting() {
    log.info('Bot reconnecting...');
}
async function handleError(error) {
    log.error({ error }, 'Discord client error');
}
//# sourceMappingURL=ready.js.map