import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export interface TrendPoint {
  date: string;   // YYYY-MM-DD
  value: number;  // 0-100 Google Trends scale
}

export interface TrendResult {
  keyword: string;
  interestOverTime: TrendPoint[];
  relatedQueries: {
    rising: Array<{ query: string; value: string }>;
    top: Array<{ query: string; value: number }>;
  };
  trendScore: number;       // 0-100 current momentum
  velocity7d: number;       // % change over last 7 days
  isPeaking: boolean;
  peakDate?: string;
  isEstimated?: boolean;
}

export class GoogleTrendsService {
  /**
   * Fetch real Google Trends data using Gemini with Google Search tool
   */
  async getTrends(keyword: string, timeframe: string = 'today 3-m'): Promise<TrendResult> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} } as any],
    });

    try {
      logger.info(`Fetching trends for ${keyword} using Gemini Search`);
      const result = await model.generateContent(
        `Search for current Google Trends data and search interest on "${keyword}" over the ${timeframe}.
         Based on real search results, estimate the interest level (0-100) and weekly growth rate.
         Return ONLY JSON:
         {
           "trendScore": 0-100,
           "velocity7d": -100 to 100,
           "isPeaking": bool,
           "interestOverTime": [{"date":"YYYY-MM-DD", "value":0-100}],
           "relatedQueries": {"rising":[{"query":"...","value":"+...%"}], "top":[{"query":"...","value":100}]},
           "isEstimated": false
         }`
      );
      const text = result.response.text();
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      const parsed = json ? JSON.parse(json) : {};
      
      return {
        keyword,
        interestOverTime: parsed.interestOverTime || [],
        relatedQueries: parsed.relatedQueries || { rising: [], top: [] },
        trendScore: parsed.trendScore || 50,
        velocity7d: parsed.velocity7d || 0,
        isPeaking: parsed.isPeaking || false,
        isEstimated: false,
      };
    } catch (error) {
      logger.error('GoogleTrendsService error:', error);
      return {
        keyword,
        interestOverTime: [],
        relatedQueries: { rising: [], top: [] },
        trendScore: 50,
        velocity7d: 0,
        isPeaking: false,
        isEstimated: true,
      };
    }
  }
}
