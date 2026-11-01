import { config } from '../config';
import { logger } from '../utils/logger';
import type { OllamaChatRequest, OllamaChatResponse, OllamaMessage, OllamaOptions } from '../types';

const log = logger.child({ module: 'ollama' });

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private defaultModel: string;
  private defaultOptions: OllamaOptions;

  private constructor() {
    this.baseUrl = config.ollama.host.replace(/\/$/, '');
    this.defaultModel = config.ollama.model;
    this.defaultOptions = {
      temperature: config.ollama.temperature,
      top_p: config.ollama.topP,
      num_predict: config.ollama.maxTokens,
      num_ctx: 8192,
      repeat_penalty: 1.1,
    };
  }

  static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      log.warn({ error }, 'Ollama health check failed');
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to list models');
      const data = await response.json() as { models: { name: string }[] };
      return data.models.map(m => m.name);
    } catch (error) {
      log.error({ error }, 'Failed to list models');
      return [];
    }
  }

  async pullModel(model: string): Promise<boolean> {
    try {
      log.info({ model }, 'Pulling model...');
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
        signal: AbortSignal.timeout(300000),
      });
      return response.ok;
    } catch (error) {
      log.error({ error, model }, 'Failed to pull model');
      return false;
    }
  }

  async chat(
    messages: OllamaMessage[],
    options?: Partial<OllamaOptions>,
    model?: string
  ): Promise<OllamaChatResponse> {
    const startTime = Date.now();

    const request: OllamaChatRequest = {
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

      const data = await response.json() as OllamaChatResponse;
      const latency = Date.now() - startTime;

      log.debug({
        model: data.model,
        latency,
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
      }, 'Ollama chat completed');

      return data;
    } catch (error) {
      const latency = Date.now() - startTime;
      log.error({ error, latency }, 'Ollama chat failed');
      throw error;
    }
  }

  async *chatStream(
    messages: OllamaMessage[],
    options?: Partial<OllamaOptions>,
    model?: string
  ): AsyncGenerator<OllamaChatResponse, void, unknown> {
    const request: OllamaChatRequest = {
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
          if (line.trim()) {
            try {
              yield JSON.parse(line) as OllamaChatResponse;
            } catch {
              log.warn({ line }, 'Failed to parse stream line');
            }
          }
        }
      }
    } catch (error) {
      log.error({ error }, 'Ollama stream chat failed');
      throw error;
    }
  }

  async generateEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) throw new Error('Failed to generate embedding');
      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch (error) {
      log.error({ error }, 'Failed to generate embedding');
      return [];
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
}

export const ollamaService = OllamaService.getInstance();