import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface RealPostData {
  author: string;
  authorProfile: string;
  content: string;
  estimatedLikes: number;
  estimatedComments: number;
  postUrl: string;
  postedAt: string | null;
  dataSource: 'google_search' | 'ai_synthesis';
}

export class LinkedInDataFetcher {
  /**
   * Strategy 1: Google Custom Search API targeting site:linkedin.com
   * Returns real post URLs and snippet data
   */
  async searchLinkedInPosts(
    topic: string,
    limit: number = 20
  ): Promise<RealPostData[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      logger.warn('[LinkedInDataFetcher] Google Search API not configured, falling back to Gemini');
      return this.synthesizeWithGeminiSearch(topic, limit);
    }

    try {
      const query = `site:linkedin.com/posts "${topic}"`;
      const url = `https://www.googleapis.com/customsearch/v1`;
      const response = await axios.get(url, {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: Math.min(limit, 10), // Google API max is 10 per call
        },
        timeout: 8000,
      });

      const items = response.data.items || [];
      return items.map((item: any) => ({
        author: this.extractAuthorFromTitle(item.title),
        authorProfile: item.link,
        content: item.snippet || '',
        estimatedLikes: 0,
        estimatedComments: 0,
        postUrl: item.link,
        postedAt: null,
        dataSource: 'google_search' as const,
      }));
    } catch (error) {
      logger.error('[LinkedInDataFetcher] Google Search failed:', error);
      return this.synthesizeWithGeminiSearch(topic, limit);
    }
  }

  /**
   * Strategy 2: Gemini with Google Search Grounding
   * Grounds real LinkedIn creator statistics and topic engagement data
   */
  async synthesizeWithGeminiSearch(
    topic: string,
    limit: number = 20
  ): Promise<RealPostData[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Search LinkedIn and professional content networks for the top performing posts about "${topic}". 
      
For each post found, provide:
- The author's name and LinkedIn handle
- The main content/message of the post (summarized)
- Approximate engagement (likes, comments) based on available data
- When it was posted

Return a JSON array of exactly ${Math.min(limit, 15)} posts:
[{
  "author": "Full Name",
  "authorProfile": "linkedin.com/in/handle",
  "authorJobTitle": "Job Title",
  "authorFollowers": 1000,
  "content": "Post content summary...",
  "hookText": "First sentence of the post",
  "estimatedLikes": 100,
  "estimatedComments": 10,
  "contentFormat": "text",
  "hashtagsUsed": ["#tag1", "#tag2"],
  "hasMedia": false,
  "hasLink": false,
  "dayOfWeek": 2,
  "hourPosted": 10,
  "postUrl": "linkedin.com/posts/...",
  "postedAt": "2023-10-01"
}]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const posts = JSON.parse(jsonMatch[0]);
        return posts.map((p: any) => ({ ...p, dataSource: 'ai_synthesis' as const }));
      }
      return [];
    } catch (error) {
      logger.error('[LinkedInDataFetcher] Gemini synthesis failed:', error);
      return [];
    }
  }

  private extractAuthorFromTitle(title: string): string {
    // "Post by John Doe on LinkedIn" → "John Doe"
    const match = title.match(/(?:Post by|by) ([^|•-]+)/i);
    return match ? match[1].trim() : 'LinkedIn Creator';
  }

  /**
   * Deep analysis of a single creator's posting patterns
   */
  async analyzeCreatorProfile(linkedinUrl: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Research the LinkedIn creator at ${linkedinUrl}. Find data on:
1. Posting frequency (posts per week)
2. Average engagement rate
3. Most common content formats they use
4. Top performing topics
5. Audience size estimate
6. Posting time patterns

Return JSON:
{
  "name": "...",
  "followers": 1000,
  "postFrequency": 3.5,
  "avgLikes": 100,
  "avgComments": 10,
  "topFormats": {"text": 0.6, "carousel": 0.3, "poll": 0.1},
  "topHashtags": ["#tag"],
  "bestPostingDays": ["Tuesday", "Wednesday"],
  "bestPostingHours": [9, 10, 17],
  "growthTrend": "growing|stable|declining"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
      logger.error('[LinkedInDataFetcher] Creator analysis failed:', error);
      return {};
    }
  }
}
