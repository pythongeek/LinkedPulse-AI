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
    // Automatically map legacy 'gemini-pro' (1.0 Pro) to 'gemini-2.5-flash'
    // for native JSON mode support and larger output limits.
    this.model = GEMINI_MODEL === 'gemini-pro' ? 'gemini-2.5-flash' : GEMINI_MODEL;
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
   * Helper to repair truncated or slightly malformed JSON responses by balancing braces and quotes.
   */
  private repairJSON(json: string): string {
    try {
      JSON.parse(json);
      return json;
    } catch (_) {
      // Continue to repair
    }

    let repaired = json.trim();

    // Remove potential markdown fence artifacts if present
    if (repaired.startsWith('```json')) {
      repaired = repaired.substring(7);
    } else if (repaired.startsWith('```')) {
      repaired = repaired.substring(3);
    }
    if (repaired.endsWith('```')) {
      repaired = repaired.substring(0, repaired.length - 3);
    }
    repaired = repaired.trim();

    let inString = false;
    let escape = false;
    const stack: string[] = [];

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
          }
        }
      }
    }

    // If we ended inside a string value, close the string
    if (inString) {
      repaired += '"';
    }

    // Close any open braces or brackets
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') {
        repaired += '}';
      } else if (open === '[') {
        repaired += ']';
      }
    }

    return repaired;
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

    // First try: exact matches
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        logger.warn('Failed to parse AI JSON response directly, attempting repair');
      }
    }

    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // fall through
      }
    }

    // Second try: repair truncated JSON
    try {
      const repaired = this.repairJSON(cleanText);
      const repairedMatch = repaired.match(/\{[\s\S]*\}/) || repaired.match(/\[[\s\S]*\]/);
      if (repairedMatch) {
        return JSON.parse(repairedMatch[0]);
      }
    } catch (repairError) {
      logger.error('Failed to parse repaired JSON:', repairError);
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
