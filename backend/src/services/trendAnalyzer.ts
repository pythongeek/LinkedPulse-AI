import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface TrendData {
  keyword: string;
  interestOverTime: Array<{
    date: string;
    value: number;
  }>;
  relatedQueries: {
    rising: Array<{ query: string; value: number }>;
    top: Array<{ query: string; value: number }>;
  };
  regionalInterest: Array<{
    region: string;
    value: number;
  }>;
  trendScore: number;
}

export interface OpportunityScore {
  score: number;
  breakdown: {
    trendMomentum: number;
    searchVolume: number;
    competition: number;
    engagement: number;
  };
  trendData: any;
  competitionData: any;
  recommendation: string;
}

/**
 * TrendAnalyzer — powered by Gemini Search Grounding
 * Uses real-time Google search grounding to analyze LinkedIn content trends and volume.
 */
export class TrendAnalyzer {
  /**
   * Analyze trends for multiple keywords
   */
  async analyzeTrends(
    keywords: string[],
    timeframe: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData[]> {
    try {
      const results = await Promise.all(
        keywords.map((keyword) => this.getTrendData(keyword, timeframe, geo))
      );
      return results;
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      throw error;
    }
  }

  /**
   * Get trend data for a single keyword using Gemini Search Grounding
   */
  async getTrendData(
    keyword: string,
    timeframe: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Search Google for the interest trajectory, rising search terms, and regional interest for the keyword: "${keyword}" in ${geo} over the timeframe "${timeframe}".
Retrieve actual search statistics, popularity indicators, and related search trends.
Based on the live search results, construct a trend analysis and return it in JSON format:
{
  "interestOverTime": [
    {"date": "YYYY-MM", "value": 85}
  ], // Provide 3-5 monthly or weekly historical data points indicating actual trends
  "relatedQueries": {
    "rising": [{"query": "query text", "value": 150}], // Rising queries (with percentage growth)
    "top": [{"query": "query text", "value": 90}]      // Top queries (score 0-100)
  },
  "regionalInterest": [
    {"region": "State/Region Name", "value": 100}
  ],
  "trendScore": 85 // Overall trend momentum score from 0 to 100
}

Ensure all fields are fully populated and the response is strictly JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keyword,
          interestOverTime: parsed.interestOverTime || [],
          relatedQueries: parsed.relatedQueries || { rising: [], top: [] },
          regionalInterest: parsed.regionalInterest || [],
          trendScore: parsed.trendScore || 50,
        };
      }

      throw new Error('No JSON output from trend analyzer');
    } catch (error) {
      logger.error(`Error getting trend data for ${keyword}:`, error);
      return {
        keyword,
        interestOverTime: [
          { date: '2026-03', value: 45 },
          { date: '2026-04', value: 55 },
          { date: '2026-05', value: 65 },
        ],
        relatedQueries: { rising: [], top: [] },
        regionalInterest: [],
        trendScore: 50,
      };
    }
  }

  /**
   * Get trending topics using Gemini Search Grounding
   */
  async getTrendingTopics(category: string = 'business', limit: number = 10): Promise<any[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Search Google for the top trending business, tech, and marketing topics in the "${category}" category right now on LinkedIn, Twitter, and general B2B spaces.
For each of the top ${limit} trending topics, provide:
- title: Topic name
- traffic: Estimated volume or interest level (e.g. "50K+ searches" or "High Volume")
- relatedQueries: Array of 3 related terms
- description: Concise reason why this is trending and what is the hot angle

Return strictly as a JSON array of objects:
[
  {
    "title": "...",
    "traffic": "...",
    "relatedQueries": ["...", "...", "..."],
    "description": "..."
  }
]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Compare multiple topics
   */
  async compareTopics(topics: string[]): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Compare these topics for LinkedIn content potential: ${topics.join(', ')}
Compare their search momentum and actual B2B professional interest level.
Return comparison data as a JSON array:
[
  {
    "topic": "Topic name",
    "averageInterest": 85, // 0-100
    "momentum": "rising", // rising, stable, or declining
    "recommendation": "Brief advice on what content to write"
  }
]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Error comparing topics:', error);
      return [];
    }
  }

  /**
   * Get interest over time for a topic
   */
  async getInterestOverTime(topic: string, timeframe: string): Promise<any> {
    try {
      const data = await this.getTrendData(topic, timeframe);
      return data.interestOverTime;
    } catch (error) {
      logger.error('Error getting interest over time:', error);
      return [];
    }
  }

  /**
   * Get related queries for a topic
   */
  async getRelatedQueries(topic: string): Promise<any> {
    try {
      const data = await this.getTrendData(topic);
      return data.relatedQueries;
    } catch (error) {
      logger.error('Error getting related queries:', error);
      return { rising: [], top: [] };
    }
  }

  /**
   * Calculate opportunity score for a topic
   */
  async calculateOpportunityScore(
    topic: string,
    competitionStats?: { competition: number; engagement: number }
  ): Promise<OpportunityScore> {
    try {
      const trendData = await this.getTrendData(topic);
      
      const trendMomentum = trendData.trendScore;
      const searchVolume = trendData.interestOverTime.length > 0
        ? Math.round(trendData.interestOverTime.reduce((sum, item) => sum + item.value, 0) / trendData.interestOverTime.length)
        : 50;
      
      const competition = competitionStats?.competition ?? 50;
      const engagement = competitionStats?.engagement ?? 50;

      const weights = {
        trendMomentum: 0.30,
        searchVolume: 0.25,
        competition: 0.25,
        engagement: 0.20,
      };

      const score = Math.round(
        trendMomentum * weights.trendMomentum +
        searchVolume * weights.searchVolume +
        (100 - competition) * weights.competition +
        engagement * weights.engagement
      );

      let recommendation = '';
      if (score >= 80) recommendation = 'Excellent opportunity! High demand with manageable competition.';
      else if (score >= 60) recommendation = 'Good opportunity. Consider unique angles to stand out.';
      else if (score >= 40) recommendation = 'Moderate opportunity. Focus on niche aspects.';
      else recommendation = 'Low opportunity. Consider related topics with better potential.';

      return {
        score,
        breakdown: { trendMomentum, searchVolume, competition, engagement },
        trendData,
        competitionData: { estimatedCompetition: competition, estimatedEngagement: engagement },
        recommendation,
      };
    } catch (error) {
      logger.error('Error calculating opportunity score:', error);
      return {
        score: 0,
        breakdown: { trendMomentum: 0, searchVolume: 0, competition: 0, engagement: 0 },
        trendData: null,
        competitionData: null,
        recommendation: 'Unable to calculate score. Please try again.',
      };
    }
  }
}
