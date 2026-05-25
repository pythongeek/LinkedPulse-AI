import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export class GeminiSearchService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  private async executeSearch(prompt: string, maxResults: number): Promise<SearchResult[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} } as any],
    });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const json = text.match(/\[[\s\S]*\]/)?.[0];
      const parsed = json ? JSON.parse(json) : [];
      return parsed.slice(0, maxResults);
    } catch (error) {
      logger.error('GeminiSearchService error:', error);
      return [];
    }
  }

  /**
   * B2B-focused topic research with real URL verification via Google Search
   */
  async researchTopic(topic: string, maxResults: number = 10): Promise<SearchResult[]> {
    return this.executeSearch(
      `Search for B2B professional insights on "${topic}" for LinkedIn content.
       Focus on reputable sources like HBR, McKinsey, Forbes, TechCrunch, etc.
       Return a JSON array of up to ${maxResults} results in this exact format:
       [
         {
           "title": "Article title",
           "url": "https://exact-url...",
           "content": "A 3-4 sentence summary of the key insight from the article.",
           "score": 95,
           "publishedDate": "2024-01-01"
         }
       ]`,
      maxResults
    );
  }

  /**
   * Search specifically for recent LinkedIn posts on a topic
   */
  async searchLinkedInContext(topic: string): Promise<SearchResult[]> {
    return this.executeSearch(
      `Search for recent LinkedIn posts or thought leadership about "${topic}".
       Return a JSON array of up to 5 results in this format:
       [
         {
           "title": "Post title or author name",
           "url": "https://linkedin.com/posts/...",
           "content": "Summary of the post content.",
           "score": 90
         }
       ]`,
      5
    );
  }

  /**
   * Get statistics and data points for a topic
   */
  async getTopicStatistics(topic: string): Promise<SearchResult[]> {
    return this.executeSearch(
      `Search for recent statistics, data, percentages, and survey reports about "${topic}".
       Return a JSON array of up to 8 results in this format:
       [
         {
           "title": "Report title",
           "url": "https://source-url...",
           "content": "The specific statistic or data point found.",
           "score": 95,
           "publishedDate": "2024-01-01"
         }
       ]`,
      8
    );
  }
}
