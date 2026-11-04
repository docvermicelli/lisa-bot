import { Client, ActivityType } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ollamaService } from '../services/ollama';
import { memoryService } from '../services/memory';
import { personalityService } from '../services/personality';

const log = logger.child({ module: 'handler:ready' });

export async function handleReady(client: Client): Promise<void> {
  log.info({ username: client.user?.tag }, 'Bot logged in');

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
      name: `with Shokat 💕`,
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