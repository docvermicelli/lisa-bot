export interface BotConfig {
    discord: {
        token: string;
        clientId: string;
        guildId: string;
        channelId: string;
    };
    ollama: {
        host: string;
        model: string;
        temperature: number;
        topP: number;
        maxTokens: number;
    };
    groq: {
        apiKey: string;
        model: string;
        temperature: number;
        topP: number;
        maxTokens: number;
        enabled: boolean;
    };
    memory: {
        dbPath: string;
        maxConversationHistory: number;
        maxMemoryEntries: number;
        tursoUrl: string;
        tursoAuthToken: string;
    };
    personality: {
        name: string;
        type: PersonalityType;
        language: string;
    };
    relationship: {
        enabled: boolean;
        pointsPerMessage: number;
        pointsPerMention: number;
        pointsPerLongMessage: number;
        longMessageThreshold: number;
        strangerMaxPoints: number;
        acquaintanceMaxPoints: number;
        friendsMaxPoints: number;
        closeFriendsMaxPoints: number;
    };
    logging: {
        level: string;
        pretty: boolean;
    };
    performance: {
        messageCacheSize: number;
        typingIndicator: boolean;
    };
}
export interface GroqChatRequest {
    model: string;
    messages: GroqMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stream?: boolean;
}
export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface GroqChatResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: GroqChoice[];
    usage: GroqUsage;
}
export interface GroqChoice {
    index: number;
    message: GroqMessage;
    finish_reason: string;
}
export interface GroqUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
export interface ConversationMessage {
    id?: number;
    userId: string;
    username: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: number;
    channelId: string;
}
export interface MemoryEntry {
    id?: number;
    userId: string;
    key: string;
    value: string;
    importance: number;
    createdAt: number;
    updatedAt: number;
    accessCount: number;
}
export type RelationshipLevel = 'stranger' | 'acquaintance' | 'friends' | 'close_friends' | 'lovers';
export interface RelationshipMeter {
    userId: string;
    level: RelationshipLevel;
    points: number;
    maxPoints: number;
    percentage: number;
    lastInteraction: number;
    totalInteractions: number;
}
export interface UserProfile {
    userId: string;
    username: string;
    displayName: string;
    firstSeen: number;
    lastSeen: number;
    messageCount: number;
    favoriteTopics: string[];
    personalityNotes: string;
    relationship: RelationshipMeter;
}
export interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    options?: OllamaOptions;
}
export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface OllamaOptions {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    num_ctx?: number;
    repeat_penalty?: number;
}
export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: OllamaMessage;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
    eval_duration?: number;
}
export interface BotStats {
    uptime: number;
    messagesProcessed: number;
    memoriesStored: number;
    errors: number;
    ollamaLatency: number;
}
export type PersonalityType = 'mature' | 'friendly' | 'cool' | 'shy' | 'genki' | 'custom';
export interface PersonalityTraits {
    name: string;
    emojis: string[];
    catchphrases: string[];
    speechPatterns: string[];
    tsundereLevel: number;
    playfulness: number;
}
//# sourceMappingURL=index.d.ts.map