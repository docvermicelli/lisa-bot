import { config } from '../config';
import { logger } from '../utils/logger';
import type { GroqChatRequest, GroqChatResponse, GroqMessage } from '../types';

const log = logger.child({ module: 'groq' });

export class GroqService {
  private static instance: GroqService;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private defaultModel: string;
  private apiKey: string;

  private constructor() {
    this.defaultModel = config.groq.model;
    this.apiKey = config.groq.apiKey;
  }

  static getInstance(): GroqService {
    if (!GroqService.instance) {
      GroqService.instance = new GroqService();
    }
    return GroqService.instance;
  }

  isEnabled(): boolean {
    return config.groq.enabled && !!this.apiKey;
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      log.warn({ error }, 'Groq health check failed');
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.isEnabled()) return [];

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Failed to list models');
      const data = await response.json() as { data: { id: string }[] };
      return data.data.map(m => m.id);
    } catch (error) {
      log.error({ error }, 'Failed to list Groq models');
      return [];
    }
  }

  async chat(
    messages: GroqMessage[],
    options?: { temperature?: number; top_p?: number; max_tokens?: number },
    model?: string
  ): Promise<GroqChatResponse> {
    if (!this.isEnabled()) {
      throw new Error('Groq is not enabled or API key not set');
    }

    const startTime = Date.now();

    const request: GroqChatRequest = {
      model: model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? config.groq.temperature,
      top_p: options?.top_p ?? config.groq.topP,
      max_tokens: options?.max_tokens ?? config.groq.maxTokens,
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

      const data = await response.json() as GroqChatResponse;
      const latency = Date.now() - startTime;

      log.debug({
        model: data.model,
        latency,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      }, 'Groq chat completed');

      return data;
    } catch (error) {
      const latency = Date.now() - startTime;
      const err = error as Error;
      log.error({
        error: err.message,
        stack: err.stack,
        latency
      }, 'Groq chat failed');
      throw error;
    }
  }

  async *chatStream(
    messages: GroqMessage[],
    options?: { temperature?: number; top_p?: number; max_tokens?: number },
    model?: string
  ): AsyncGenerator<GroqChatResponse, void, unknown> {
    if (!this.isEnabled()) {
      throw new Error('Groq is not enabled or API key not set');
    }

    const request: GroqChatRequest = {
      model: model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? config.groq.temperature,
      top_p: options?.top_p ?? config.groq.topP,
      max_tokens: options?.max_tokens ?? config.groq.maxTokens,
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
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              yield JSON.parse(data) as GroqChatResponse;
            } catch {
              log.warn({ line: data }, 'Failed to parse stream line');
            }
          }
        }
      }
    } catch (error) {
      log.error({ error }, 'Groq stream chat failed');
      throw error;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
}

export const groqService = GroqService.getInstance();