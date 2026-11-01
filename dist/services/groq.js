"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groqService = exports.GroqService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const log = logger_1.logger.child({ module: 'groq' });
class GroqService {
    static instance;
    baseUrl = 'https://api.groq.com/openai/v1';
    defaultModel;
    apiKey;
    constructor() {
        this.defaultModel = config_1.config.groq.model;
        this.apiKey = config_1.config.groq.apiKey;
    }
    static getInstance() {
        if (!GroqService.instance) {
            GroqService.instance = new GroqService();
        }
        return GroqService.instance;
    }
    isEnabled() {
        return config_1.config.groq.enabled && !!this.apiKey;
    }
    async checkHealth() {
        if (!this.isEnabled())
            return false;
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch (error) {
            log.warn({ error }, 'Groq health check failed');
            return false;
        }
    }
    async listModels() {
        if (!this.isEnabled())
            return [];
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok)
                throw new Error('Failed to list models');
            const data = await response.json();
            return data.data.map(m => m.id);
        }
        catch (error) {
            log.error({ error }, 'Failed to list Groq models');
            return [];
        }
    }
    async chat(messages, options, model) {
        if (!this.isEnabled()) {
            throw new Error('Groq is not enabled or API key not set');
        }
        const startTime = Date.now();
        const request = {
            model: model || this.defaultModel,
            messages,
            temperature: options?.temperature ?? config_1.config.groq.temperature,
            top_p: options?.top_p ?? config_1.config.groq.topP,
            max_tokens: options?.max_tokens ?? config_1.config.groq.maxTokens,
            stream: false,
        };
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(120000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const latency = Date.now() - startTime;
            log.debug({
                model: data.model,
                latency,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
            }, 'Groq chat completed');
            return data;
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const err = error;
            log.error({
                error: err.message,
                stack: err.stack,
                latency
            }, 'Groq chat failed');
            throw error;
        }
    }
    async *chatStream(messages, options, model) {
        if (!this.isEnabled()) {
            throw new Error('Groq is not enabled or API key not set');
        }
        const request = {
            model: model || this.defaultModel,
            messages,
            temperature: options?.temperature ?? config_1.config.groq.temperature,
            top_p: options?.top_p ?? config_1.config.groq.topP,
            max_tokens: options?.max_tokens ?? config_1.config.groq.maxTokens,
            stream: true,
        };
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(120000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error: ${response.status} - ${errorText}`);
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
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            return;
                        try {
                            yield JSON.parse(data);
                        }
                        catch {
                            log.warn({ line: data }, 'Failed to parse stream line');
                        }
                    }
                }
            }
        }
        catch (error) {
            log.error({ error }, 'Groq stream chat failed');
            throw error;
        }
    }
    getDefaultModel() {
        return this.defaultModel;
    }
    setDefaultModel(model) {
        this.defaultModel = model;
    }
}
exports.GroqService = GroqService;
exports.groqService = GroqService.getInstance();
//# sourceMappingURL=groq.js.map