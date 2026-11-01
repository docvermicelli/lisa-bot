import dotenv from 'dotenv';
import { BotConfig } from '../types';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.toLowerCase() === 'true';
}

export const config: BotConfig = {
  discord: {
    token: getEnv('DISCORD_TOKEN'),
    clientId: getEnv('DISCORD_CLIENT_ID'),
    guildId: getEnv('DISCORD_GUILD_ID'),
    channelId: getEnv('DISCORD_CHANNEL_ID'),
  },
  ollama: {
    host: getEnv('OLLAMA_HOST', 'http://localhost:11434'),
    model: getEnv('OLLAMA_MODEL', 'llama3.1:8b'),
    temperature: getEnvNumber('OLLAMA_TEMPERATURE', 0.85),
    topP: getEnvNumber('OLLAMA_TOP_P', 0.95),
    maxTokens: getEnvNumber('OLLAMA_MAX_TOKENS', 2048),
  },
  groq: {
    apiKey: getEnv('GROQ_API_KEY', ''),
    model: getEnv('GROQ_MODEL', 'openai/gpt-oss-20b'),
    temperature: getEnvNumber('GROQ_TEMPERATURE', 0.85),
    topP: getEnvNumber('GROQ_TOP_P', 0.95),
    maxTokens: getEnvNumber('GROQ_MAX_TOKENS', 2048),
    enabled: getEnvBoolean('USE_GROQ', true),
  },
  memory: {
    dbPath: getEnv('MEMORY_DB_PATH', './data/lisa-memory.db'),
    maxConversationHistory: getEnvNumber('MAX_CONVERSATION_HISTORY', 50),
    maxMemoryEntries: getEnvNumber('MAX_MEMORY_ENTRIES', 1000),
    // Turso (libSQL) remote database - optional
    tursoUrl: process.env.TURSO_DATABASE_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
  },
  personality: {
    name: getEnv('BOT_NAME', 'Lisa'),
    type: getEnv('BOT_PERSONALITY', 'mature') as BotConfig['personality']['type'],
    language: getEnv('RESPONSE_LANGUAGE', 'en'),
  },
  relationship: {
    enabled: getEnvBoolean('RELATIONSHIP_ENABLED', true),
    pointsPerMessage: getEnvNumber('RELATIONSHIP_POINTS_PER_MESSAGE', 2),
    pointsPerMention: getEnvNumber('RELATIONSHIP_POINTS_PER_MENTION', 5),
    pointsPerLongMessage: getEnvNumber('RELATIONSHIP_POINTS_PER_LONG_MESSAGE', 3),
    longMessageThreshold: getEnvNumber('RELATIONSHIP_LONG_MESSAGE_THRESHOLD', 100),
    strangerMaxPoints: getEnvNumber('RELATIONSHIP_STRANGER_MAX', 50),
    acquaintanceMaxPoints: getEnvNumber('RELATIONSHIP_ACQUAINTANCE_MAX', 150),
    friendsMaxPoints: getEnvNumber('RELATIONSHIP_FRIENDS_MAX', 400),
    closeFriendsMaxPoints: getEnvNumber('RELATIONSHIP_CLOSE_FRIENDS_MAX', 1000),
  },
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    pretty: getEnvBoolean('LOG_PRETTY', true),
  },
  performance: {
    messageCacheSize: getEnvNumber('MESSAGE_CACHE_SIZE', 100),
    typingIndicator: getEnvBoolean('TYPING_INDICATOR', true),
  },
};

export function validateConfig(): void {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_GUILD_ID',
    'DISCORD_CHANNEL_ID',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required config: ${key}. Please check your .env file.`);
    }
  }
}

export default config;