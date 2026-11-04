"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueMessage = queueMessage;
exports.shouldRespond = shouldRespond;
exports.handleMessage = handleMessage;
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const memory_1 = require("../services/memory");
const ollama_1 = require("../services/ollama");
const groq_1 = require("../services/groq");
const personality_1 = require("../services/personality");
const log = logger_1.logger.child({ module: 'handler:message' });
const AUTHORIZED_USER_ID = config_1.config.discord.authorizedUserId;
const messageQueue = [];
let isProcessing = false;
const PROCESSING_DELAY = 500;
function getDisplayName(user) {
    return user.globalName || user.username;
}
function shouldRespond(message) {
    if (message.author.bot)
        return false;
    if (message.channel.type !== discord_js_1.ChannelType.GuildText && message.channel.type !== discord_js_1.ChannelType.DM)
        return false;
    if (message.channel.type === discord_js_1.ChannelType.GuildText) {
        if (message.guildId !== config_1.config.discord.guildId)
            return false;
        if (message.channelId !== config_1.config.discord.channelId)
            return false;
    }
    // ONLY respond to authorized user
    if (message.author.id !== AUTHORIZED_USER_ID) {
        return false;
    }
    const hasMention = message.mentions.has(config_1.config.discord.clientId);
    const isDM = message.channel.type === discord_js_1.ChannelType.DM;
    const isReply = message.reference?.messageId !== undefined;
    return hasMention || isDM || isReply;
}
async function queueMessage(message) {
    messageQueue.push({ message, timestamp: Date.now() });
    if (!isProcessing) {
        processQueue();
    }
}
async function processQueue() {
    if (isProcessing || messageQueue.length === 0)
        return;
    isProcessing = true;
    while (messageQueue.length > 0) {
        const queued = messageQueue.shift();
        try {
            await handleMessage(queued.message);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const errStack = error instanceof Error ? error.stack : undefined;
            log.error({ error: errMsg, stack: errStack, messageId: queued.message.id }, 'Failed to handle message');
        }
        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    }
    isProcessing = false;
}
async function handleMessage(message) {
    const userId = message.author.id;
    const username = getDisplayName(message.author);
    const channelId = message.channelId;
    const content = message.content.trim();
    if (!content)
        return;
    log.info({ userId, username, channelId, contentLength: content.length }, 'Processing message');
    await memory_1.memoryService.addConversation({
        userId,
        username,
        content,
        role: 'user',
        timestamp: Date.now(),
        channelId,
    });
    await memory_1.memoryService.updateUserProfile({
        userId,
        username,
        displayName: message.member?.displayName || username,
    });
    const [profile, history, memories] = await Promise.all([
        memory_1.memoryService.getUserProfile(userId),
        memory_1.memoryService.getConversationHistory(userId, channelId, config_1.config.memory.maxConversationHistory),
        memory_1.memoryService.getMemories(userId, 10),
    ]);
    const systemPrompt = personality_1.personalityService.getSystemPrompt(username, profile || undefined);
    const messages = [
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
    if (config_1.config.performance.typingIndicator && message.channel.type === discord_js_1.ChannelType.GuildText) {
        try {
            await message.channel.sendTyping();
        }
        catch {
        }
    }
    try {
        let botResponse;
        if (config_1.config.groq.enabled && groq_1.groqService.isEnabled()) {
            const response = await groq_1.groqService.chat(messages);
            botResponse = response.choices[0]?.message?.content?.trim() || '';
            log.debug({ provider: 'groq', model: response.model }, 'Groq response received');
        }
        else {
            const response = await ollama_1.ollamaService.chat(messages);
            botResponse = response.message.content.trim();
            log.debug({ provider: 'ollama', model: response.model }, 'Ollama response received');
        }
        if (!botResponse) {
            log.warn('Empty response from LLM');
            await message.reply("...Huh? I blanked out for a sec. What were we talking about? 😳");
            return;
        }
        await memory_1.memoryService.addConversation({
            userId,
            username: config_1.config.personality.name,
            content: botResponse,
            role: 'assistant',
            timestamp: Date.now(),
            channelId,
        });
        await message.reply(botResponse);
        log.info({ userId, username, responseLength: botResponse.length }, 'Message sent');
    }
    catch (error) {
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
//# sourceMappingURL=message.js.map