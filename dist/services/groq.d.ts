import type { GroqChatResponse, GroqMessage } from '../types';
export declare class GroqService {
    private static instance;
    private baseUrl;
    private defaultModel;
    private apiKey;
    private constructor();
    static getInstance(): GroqService;
    isEnabled(): boolean;
    checkHealth(): Promise<boolean>;
    listModels(): Promise<string[]>;
    chat(messages: GroqMessage[], options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
    }, model?: string): Promise<GroqChatResponse>;
    chatStream(messages: GroqMessage[], options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
    }, model?: string): AsyncGenerator<GroqChatResponse, void, unknown>;
    getDefaultModel(): string;
    setDefaultModel(model: string): void;
}
export declare const groqService: GroqService;
//# sourceMappingURL=groq.d.ts.map