import {
  Message,
  TextChannel,
  ChannelType,
  User,
} from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { memoryService } from '../services/memory';
import { ollamaService } from '../services/ollama';
import { groqService } from '../services/groq';
import { personalityService } from '../services/personality';
import type { ConversationMessage, OllamaMessage, GroqMessage } from '../types';

const log = logger.child({ module: 'handler:message' });

const AUTHORIZED_USER_ID = config.discord.authorizedUserId;

interface QueuedMessage {
  message: Message;
  timestamp: number;
}

const messageQueue: QueuedMessage[] = [];
let isProcessing = false;
const PROCESSING_DELAY = 500;

function getDisplayName(user: User): string {
  return user.globalName || user.username;
}

function shouldRespond(message: Message): boolean {
  if (message.author.bot) return false;
  if (message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.DM) return false;

  if (message.channel.type === ChannelType.GuildText) {
    if (message.guildId !== config.discord.guildId) return false;
    if (message.channelId !== config.discord.channelId) return false;
  }

  // ONLY respond to authorized user
  if (message.author.id !== AUTHORIZED_USER_ID) {
    return false;
  }

  const hasMention = message.mentions.has(config.discord.clientId);
  const isDM = message.channel.type === ChannelType.DM;
  const isReply = message.reference?.messageId !== undefined;

  return hasMention || isDM || isReply;
}

async function queueMessage(message: Message): Promise<void> {
  messageQueue.push({ message, timestamp: Date.now() });
  if (!isProcessing) {
    processQueue();
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing || messageQueue.length === 0) return;

  isProcessing = true;

  while (messageQueue.length > 0) {
    const queued = messageQueue.shift()!;
    try {
      await handleMessage(queued.message);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      log.error({ error: errMsg, stack: errStack, messageId: queued.message.id }, 'Failed to handle message');
    }
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
  }

  isProcessing = false;
}

async function handleMessage(message: Message): Promise<void> {
  const userId = message.author.id;
  const username = getDisplayName(message.author);
  const channelId = message.channelId;
  const content = message.content.trim();

  if (!content) return;

  log.info({ userId, username, channelId, contentLength: content.length }, 'Processing message');

  await memoryService.addConversation({
    userId,
    username,
    content,
    role: 'user',
    timestamp: Date.now(),
    channelId,
  });

  await memoryService.updateUserProfile({
    userId,
    username,
    displayName: message.member?.displayName || username,
  });

  const [profile, history, memories] = await Promise.all([
    memoryService.getUserProfile(userId),
    memoryService.getConversationHistory(userId, channelId, config.memory.maxConversationHistory),
    memoryService.getMemories(userId, 10),
  ]);

  const systemPrompt = personalityService.getSystemPrompt(username, profile || undefined);

  const messages: (OllamaMessage | GroqMessage)[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (memories.length > 0) {
    const memoryContext = memories.map(m => `[Memory: ${m.key} = ${m.value}]`).join('\n');
    messages.push({
      role: 'system',
      content: `RELEVANT MEMORIES ABOUT SHOKAT:\n${memoryContext}\n\nUse these naturally in conversation. Don't explicitly say "I remember" - just know it. You're his Lisa. You know him.`
    });
  }

  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({ role: 'user', content });

  if (config.performance.typingIndicator && message.channel.type === ChannelType.GuildText) {
    try {
      await (message.channel as TextChannel).sendTyping();
    } catch {
    }
  }

  try {
    let botResponse: string;

    if (config.groq.enabled && groqService.isEnabled()) {
      const response = await groqService.chat(messages as GroqMessage[]);
      botResponse = response.choices[0]?.message?.content?.trim() || '';
      log.debug({ provider: 'groq', model: response.model }, 'Groq response received');
    } else {
      const response = await ollamaService.chat(messages as OllamaMessage[]);
      botResponse = response.message.content.trim();
      log.debug({ provider: 'ollama', model: response.model }, 'Ollama response received');
    }

    if (!botResponse) {
      log.warn('Empty response from LLM');
      await message.reply("...Huh? I blanked out for a sec. What were we talking about? 😳");
      return;
    }

    await memoryService.addConversation({
      userId,
      username: config.personality.name,
      content: botResponse,
      role: 'assistant',
      timestamp: Date.now(),
      channelId,
    });

    await message.reply(botResponse);

    log.info({ userId, username, responseLength: botResponse.length }, 'Message sent');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error({ error: errMsg, stack: errStack, userId }, 'Failed to generate response');

    const fallbackResponses = [
      "Ugh, my brain just froze... 😵 Can you say that again?",
      "E-Error? What error? I meant to do that! 😤",
      "Hmph! The connection's being stupid... try again? 💢",
      "...Did you break me? Because it feels like you broke me. 😳",
      "My processor thingy is having a moment. One sec~ 😅",
    ];

    await message.reply(fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]);
  }
}

export { queueMessage, shouldRespond, handleMessage };