import { AIClient } from './minimax';
import { logger } from '../utils/logger';

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
 * TrendAnalyzer — powered by Gemini
 * Uses AI with grounded knowledge to analyze LinkedIn content trends.
 * NOTE: Results are AI-estimated, not real-time search data.
 * For real-time data, integrate SerpApi or Google Trends API.
 */
export class TrendAnalyzer {
  private ai: AIClient;

  constructor() {
    this.ai = new AIClient();
  }

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
   * Get trend data for a single keyword using Gemini
   */
  async getTrendData(
    keyword: string,
    timeframe: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData> {
    try {
      const result = await this.ai.promptJSON(
        'You are a LinkedIn content trend analyst. Based on your training knowledge, provide your best assessment of actual market trends. Be honest about what you know vs. estimate. Always return valid JSON.',
        `Analyze the LinkedIn content trend for "${keyword}" in the ${geo} region over the ${timeframe} timeframe.

Based on your knowledge of this topic's real-world popularity, engagement patterns, and LinkedIn relevance, provide:

Return JSON:
{
  "interestOverTime": [{"date": "2025-01", "value": 65}, {"date": "2025-02", "value": 72}],
  "relatedQueries": {
    "rising": [{"query": "...", "value": 100}],
    "top": [{"query": "...", "value": 95}]
  },
  "regionalInterest": [{"region": "California", "value": 100}],
  "trendScore": 0-100
}

IMPORTANT: Base your estimates on real industry knowledge, not random numbers. If you're uncertain, use moderate values and fewer data points.`
      );

      return {
        keyword,
        interestOverTime: result.interestOverTime || [],
        relatedQueries: result.relatedQueries || { rising: [], top: [] },
        regionalInterest: result.regionalInterest || [],
        trendScore: result.trendScore || 50,
      };
    } catch (error) {
      logger.error(`Error getting trend data for ${keyword}:`, error);
      return {
        keyword,
        interestOverTime: [],
        relatedQueries: { rising: [], top: [] },
        regionalInterest: [],
        trendScore: 0,
      };
    }
  }

  /**
   * Get trending topics using Gemini
   */
  async getTrendingTopics(category: string = 'business', limit: number = 10): Promise<any[]> {
    try {
      const result = await this.ai.promptJSON(
        'You are a LinkedIn trend expert. Return trending topics as a JSON array based on your real knowledge of current industry trends.',
        `List the top ${limit} trending topics on LinkedIn in the "${category}" category right now.

For each topic, provide:
- title: the topic name
- traffic: estimated search volume (e.g., "500K+")
- relatedQueries: array of 3 related queries
- description: brief why it's trending

Return as a JSON array.`
      );

      return Array.isArray(result) ? result.slice(0, limit) : [];
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
      const result = await this.ai.promptJSON(
        'You are a trend comparison expert. Return comparison data as JSON array.',
        `Compare these topics for LinkedIn content potential: ${topics.join(', ')}

For each topic, provide:
- topic: name
- averageInterest: 0-100
- momentum: "rising", "stable", or "declining"
- recommendation: brief advice

Return as a JSON array.`
      );

      return Array.isArray(result) ? result : [];
    } catch (error) {
      logger.error('Error comparing topics:', error);
      throw error;
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
