"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ollamaService = exports.OllamaService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const log = logger_1.logger.child({ module: 'ollama' });
class OllamaService {
    static instance;
    baseUrl;
    defaultModel;
    defaultOptions;
    constructor() {
        this.baseUrl = config_1.config.ollama.host.replace(/\/$/, '');
        this.defaultModel = config_1.config.ollama.model;
        this.defaultOptions = {
            temperature: config_1.config.ollama.temperature,
            top_p: config_1.config.ollama.topP,
            num_predict: config_1.config.ollama.maxTokens,
            num_ctx: 8192,
            repeat_penalty: 1.1,
        };
    }
    static getInstance() {
        if (!OllamaService.instance) {
            OllamaService.instance = new OllamaService();
        }
        return OllamaService.instance;
    }
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch (error) {
            log.warn({ error }, 'Ollama health check failed');
            return false;
        }
    }
    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok)
                throw new Error('Failed to list models');
            const data = await response.json();
            return data.models.map(m => m.name);
        }
        catch (error) {
            log.error({ error }, 'Failed to list models');
            return [];
        }
    }
    async pullModel(model) {
        try {
            log.info({ model }, 'Pulling model...');
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: model, stream: false }),
                signal: AbortSignal.timeout(300000),
            });
            return response.ok;
        }
        catch (error) {
            log.error({ error, model }, 'Failed to pull model');
            return false;
        }
    }
    async chat(messages, options, model) {
        const startTime = Date.now();
        const request = {
            model: model || this.defaultModel,
            messages,
            stream: false,
            options: { ...this.defaultOptions, ...options },
        };
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(120000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const latency = Date.now() - startTime;
            log.debug({
                model: data.model,
                latency,
                promptTokens: data.prompt_eval_count,
                completionTokens: data.eval_count,
            }, 'Ollama chat completed');
            return data;
        }
        catch (error) {
            const latency = Date.now() - startTime;
            log.error({ error, latency }, 'Ollama chat failed');
            throw error;
        }
    }
    async *chatStream(messages, options, model) {
        const request = {
            model: model || this.defaultModel,
            messages,
            stream: true,
            options: { ...this.defaultOptions, ...options },
        };
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(120000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }
            const reader = response.body?.getReader();
            if (!reader)
                throw new Error('No response body');
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            yield JSON.parse(line);
                        }
                        catch {
                            log.warn({ line }, 'Failed to parse stream line');
                        }
                    }
                }
            }
        }
        catch (error) {
            log.error({ error }, 'Ollama stream chat failed');
            throw error;
        }
    }
    async generateEmbedding(text, model = 'nomic-embed-text') {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: text }),
                signal: AbortSignal.timeout(30000),
            });
            if (!response.ok)
                throw new Error('Failed to generate embedding');
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            log.error({ error }, 'Failed to generate embedding');
            return [];
        }
    }
    getDefaultModel() {
        return this.defaultModel;
    }
    setDefaultModel(model) {
        this.defaultModel = model;
    }
}
exports.OllamaService = OllamaService;
exports.ollamaService = OllamaService.getInstance();
//# sourceMappingURL=ollama.js.map