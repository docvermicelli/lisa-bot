import { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ollamaService } from '../services/ollama';
import { memoryService } from '../services/memory';
import { personalityService } from '../services/personality';

const log = logger.child({ module: 'handler:ready' });

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('lisa')
    .setDescription('Check your relationship status with Lisa')
    .toJSON(),
];

async function registerCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    log.info('Registering slash commands...');

    // Register for specific guild (faster for testing)
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );

    log.info('Slash commands registered successfully!');
  } catch (error) {
    log.error({ error }, 'Failed to register slash commands');
  }
}

export async function handleReady(client: Client): Promise<void> {
  log.info({ username: client.user?.tag }, 'Bot logged in');

  // Register slash commands
  await registerCommands(client);

  const healthOk = await ollamaService.checkHealth();
  if (!healthOk) {
    log.warn('Ollama not reachable - bot will still run but AI responses will fail');
    log.warn('Make sure Ollama is running: ollama serve');
  } else {
    const models = await ollamaService.listModels();
    log.info({ models, current: ollamaService.getDefaultModel() }, 'Ollama connected');

    if (!models.includes(config.ollama.model)) {
      log.warn({ model: config.ollama.model }, 'Configured model not found, attempting to pull...');
      await ollamaService.pullModel(config.ollama.model);
    }
  }

  const stats = await memoryService.getStats();
  log.info({ ...stats }, 'Memory stats loaded');

  const personality = personalityService.getPersonalityType();
  log.info({ personality }, 'Personality loaded');

  const guild = client.guilds.cache.get(config.discord.guildId);
  if (guild) {
    const channel = guild.channels.cache.get(config.discord.channelId);
    if (channel) {
      log.info({ guild: guild.name, channel: channel.name }, 'Target server/channel found');
    } else {
      log.warn({ channelId: config.discord.channelId }, 'Target channel not found');
    }
  } else {
    log.warn({ guildId: config.discord.guildId }, 'Target guild not found');
  }

  client.user?.setPresence({
    activities: [{
      name: `with ${config.personality.name} 💕`,
      type: ActivityType.Playing,
    }],
    status: 'online',
  });

  log.info('Bot ready and online!');
}

export async function handleDisconnect(): Promise<void> {
  log.warn('Bot disconnected');
}

export async function handleReconnecting(): Promise<void> {
  log.info('Bot reconnecting...');
}

export async function handleError(error: Error): Promise<void> {
  log.error({ error }, 'Discord client error');
}