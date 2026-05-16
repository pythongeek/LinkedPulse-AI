import { logger } from '../utils/logger';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MiniMaxOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * MiniMax AI Client — OpenAI-compatible API
 * Main agent for content planning, writing, engagement, analysis.
 */
export class MiniMaxClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = MINIMAX_API_KEY;
    this.baseUrl = MINIMAX_BASE_URL;
    this.model = MINIMAX_MODEL;
  }

  /**
   * Chat completion — main method
   */
  async chat(
    messages: MiniMaxMessage[],
    options: MiniMaxOptions = {}
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 4096, stream = false } = options;

    if (!this.apiKey) {
      logger.error('MINIMAX_API_KEY not configured');
      throw new Error('MiniMax API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`MiniMax API error ${response.status}: ${errorBody}`);
        throw new Error(`MiniMax API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('MiniMax chat error:', error);
      throw error;
    }
  }

  /**
   * Generate JSON response — parses JSON from MiniMax output
   */
  async chatJSON<T = any>(
    messages: MiniMaxMessage[],
    options: MiniMaxOptions = {}
  ): Promise<T> {
    const text = await this.chat(messages, options);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        logger.warn('Failed to parse MiniMax JSON response, returning raw text');
      }
    }

    // Try array match
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // fall through
      }
    }

    throw new Error('MiniMax did not return valid JSON');
  }

  /**
   * Simple prompt → response helper
   */
  async prompt(systemPrompt: string, userPrompt: string, options?: MiniMaxOptions): Promise<string> {
    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], options);
  }

  /**
   * Simple prompt → JSON helper
   */
  async promptJSON<T = any>(systemPrompt: string, userPrompt: string, options?: MiniMaxOptions): Promise<T> {
    return this.chatJSON<T>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], options);
  }
}
