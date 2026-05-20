import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface CommunitySignal {
  discussionsCount: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  hotAngles: string[];
  trendingHashtags: string[];
  recentPosts: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export class LinkedinTopicSignalService {
  async getCommunitySignal(keyword: string): Promise<CommunitySignal> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Perform a search to assess the professional community signal, hot discussions, and trending topics on LinkedIn and Reddit related to the keyword: "${keyword}".
Query Google Search targeting site:linkedin.com/posts or site:reddit.com/r/linkedin or similar discussions.

Analyze the search results and return a structured JSON report:
{
  "discussionsCount": 150, // estimated volume from search
  "sentiment": "positive", // positive, neutral, negative, mixed
  "hotAngles": ["a list of specific, hot content angles developers/marketers are debating"],
  "trendingHashtags": ["#Tag1", "#Tag2"],
  "recentPosts": [
    {
      "title": "A summary of a recent notable post or thread found",
      "url": "URL of the post/thread if cited",
      "source": "LinkedIn or Reddit"
    }
  ]
}

Be fact-based. If no direct LinkedIn posts are found, extract insights from standard B2B developer/professional sites.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('No JSON output from community signal analyzer');
    } catch (error) {
      logger.error('Error fetching community signal:', error);
      return {
        discussionsCount: 0,
        sentiment: 'neutral',
        hotAngles: [`General interest around ${keyword}`],
        trendingHashtags: [`#${keyword.replace(/\s+/g, '')}`],
        recentPosts: [],
      };
    }
  }
}
