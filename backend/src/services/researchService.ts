import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export class ResearchService {
  /**
   * Perform web search using Google Custom Search API
   */
  async webSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !cx) {
        logger.warn('Google Search API not configured, using Gemini fallback');
        return this.geminiSearch(query, limit);
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: cx,
          q: query,
          num: Math.min(limit, 10),
        },
      });

      return (response.data.items || []).map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        source: item.displayLink,
      }));
    } catch (error) {
      logger.error('Web search error:', error);
      return this.geminiSearch(query, limit);
    }
  }

  /**
   * Fallback search using Gemini with grounding
   */
  async geminiSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Search for information about: "${query}"

Provide ${limit} relevant results with:
- Title
- Brief summary
- Source/website
- URL (if known)

Return in JSON format:
{
  "results": [
    {"title": "...", "snippet": "...", "url": "...", "source": "..."}
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.results || [];
      }

      return [];
    } catch (error) {
      logger.error('Gemini search error:', error);
      return [];
    }
  }

  /**
   * Search for news articles
   */
  async newsSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !cx) {
        return this.geminiSearch(`${query} news`, limit);
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: cx,
          q: query,
          num: Math.min(limit, 10),
          sort: 'date',
        },
      });

      return (response.data.items || []).map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        source: item.displayLink,
      }));
    } catch (error) {
      logger.error('News search error:', error);
      return [];
    }
  }

  /**
   * Extract key information from a URL
   */
  async extractFromUrl(url: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Extract key information from this URL: ${url}

Provide:
1. Main topic/title
2. Key points (3-5 bullet points)
3. Important statistics or data
4. Author/Source
5. Publication date (if available)

Return in JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      logger.error('URL extraction error:', error);
      return null;
    }
  }

  /**
   * Summarize research findings
   */
  async summarizeFindings(results: ResearchResult[]): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Summarize these research findings into key insights:

${results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}`).join('\n\n')}

Provide:
1. 3-5 key takeaways
2. Common themes
3. Notable statistics
4. Expert opinions mentioned

Keep it concise and actionable.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Summarize findings error:', error);
      return '';
    }
  }
}
