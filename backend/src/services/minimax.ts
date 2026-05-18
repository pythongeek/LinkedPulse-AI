import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MiniMaxOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: 'json' | 'text';
}

/**
 * AI Client — Gemini-backed
 * Replaced MiniMax M2.7 with Gemini to consolidate on a single AI provider.
 * Keeps the same API surface for backwards compatibility.
 */
export class AIClient {
  private model: string;

  constructor() {
    this.model = GEMINI_MODEL;
  }

  /**
   * Chat completion — main method
   */
  async chat(
    messages: MiniMaxMessage[],
    options: MiniMaxOptions = {}
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 4096 } = options;

    if (!process.env.GEMINI_API_KEY) {
      logger.error('GEMINI_API_KEY not configured');
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(options.responseFormat === 'json' && { responseMimeType: 'application/json' }),
        },
      });

      // Convert messages: Gemini doesn't have a system role in the same way.
      // Prepend system message to the first user message.
      let systemPrompt = '';
      const geminiParts: string[] = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else {
          geminiParts.push(msg.content);
        }
      }

      const combinedPrompt = systemPrompt
        ? `${systemPrompt}\n\n${geminiParts.join('\n\n')}`
        : geminiParts.join('\n\n');

      const result = await model.generateContent(combinedPrompt);
      return result.response.text();
    } catch (error) {
      logger.error('AI chat error:', error);
      throw error;
    }
  }

  /**
   * Generate JSON response — parses JSON from AI output
   */
  async chatJSON<T = any>(
    messages: MiniMaxMessage[],
    options: MiniMaxOptions = {}
  ): Promise<T> {
    const text = await this.chat(messages, { ...options, responseFormat: 'json' });

    // Strip markdown fences
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    // Extract JSON from response
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        logger.warn('Failed to parse AI JSON response, trying array match');
      }
    }

    // Try array match
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // fall through
      }
    }

    throw new Error('AI did not return valid JSON');
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

// Backwards-compatible alias — all existing imports continue working
export { AIClient as MiniMaxClient };
