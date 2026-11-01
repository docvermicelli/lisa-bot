import type { OllamaChatResponse, OllamaMessage, OllamaOptions } from '../types';
export declare class OllamaService {
    private static instance;
    private baseUrl;
    private defaultModel;
    private defaultOptions;
    private constructor();
    static getInstance(): OllamaService;
    checkHealth(): Promise<boolean>;
    listModels(): Promise<string[]>;
    pullModel(model: string): Promise<boolean>;
    chat(messages: OllamaMessage[], options?: Partial<OllamaOptions>, model?: string): Promise<OllamaChatResponse>;
    chatStream(messages: OllamaMessage[], options?: Partial<OllamaOptions>, model?: string): AsyncGenerator<OllamaChatResponse, void, unknown>;
    generateEmbedding(text: string, model?: string): Promise<number[]>;
    getDefaultModel(): string;
    setDefaultModel(model: string): void;
}
export declare const ollamaService: OllamaService;
//# sourceMappingURL=ollama.d.ts.map