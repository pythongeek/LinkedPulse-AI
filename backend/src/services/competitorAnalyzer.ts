import { GoogleGenerativeAI } from '@google/generative-ai';
import { LinkedInPost } from './linkedinScraper';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface CompetitorAnalysis {
  totalPosts: number;
  avgEngagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  topPerformers: LinkedInPost[];
  contentPatterns: {
    avgLength: number;
    commonFormats: string[];
    popularTopics: string[];
    postingTimes: string[];
  };
  contentGaps: string[];
  opportunities: string[];
}

export class CompetitorAnalyzer {
  /**
   * Analyze competitor posts
   */
  async analyze(posts: LinkedInPost[], topic: string, depth: 'quick' | 'deep'): Promise<CompetitorAnalysis> {
    try {
      // Calculate basic metrics
      const avgLikes = this.calculateAverage(posts.map((p) => p.likes));
      const avgComments = this.calculateAverage(posts.map((p) => p.comments));
      const avgShares = this.calculateAverage(posts.map((p) => p.shares));

      // Get top performers
      const topPerformers = [...posts]
        .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
        .slice(0, 10);

      // Analyze content patterns
      const contentPatterns = await this.analyzeContentPatterns(posts);

      // Identify gaps
      const gaps = await this.identifyGaps(posts, topic);

      // Find opportunities
      const opportunities = await this.findOpportunities(posts, topic, gaps);

      return {
        totalPosts: posts.length,
        avgEngagement: {
          likes: Math.round(avgLikes),
          comments: Math.round(avgComments),
          shares: Math.round(avgShares),
        },
        topPerformers,
        contentPatterns,
        contentGaps: gaps,
        opportunities,
      };
    } catch (error) {
      logger.error('Competitor analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Analyze content patterns
   */
  private async analyzeContentPatterns(posts: LinkedInPost[]): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const postsSample = posts.slice(0, 20).map((p) => p.content).join('\n\n---\n\n');

      const prompt = `Analyze these LinkedIn posts and identify content patterns:

POSTS:
${postsSample}

Identify:
1. Average content length
2. Common formats (story, list, question, etc.)
3. Popular topics/themes
4. Posting patterns

Return in JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        avgLength: 0,
        commonFormats: [],
        popularTopics: [],
        postingTimes: [],
      };
    } catch (error) {
      logger.error('Content patterns analysis error:', error);
      return {
        avgLength: 0,
        commonFormats: [],
        popularTopics: [],
        postingTimes: [],
      };
    }
  }

  /**
   * Identify content gaps
   */
  async identifyGaps(posts: LinkedInPost[], topic?: string): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const postsSample = posts.slice(0, 30).map((p) => p.content).join('\n\n---\n\n');

      const prompt = `Analyze these LinkedIn posts${topic ? ` about "${topic}"` : ''} and identify content gaps:

POSTS:
${postsSample}

Identify:
1. Topics NOT covered that should be
2. Perspectives missing
3. Questions not answered
4. Formats not used
5. Audience segments not addressed

Return a JSON array of gap descriptions.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Identify gaps error:', error);
      return [];
    }
  }

  /**
   * Find content opportunities
   */
  private async findOpportunities(
    posts: LinkedInPost[],
    topic: string,
    gaps: string[]
  ): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Based on these content gaps for "${topic}":

${gaps.join('\n')}

Suggest 5 specific content opportunities that would fill these gaps and perform well on LinkedIn.

Return a JSON array of opportunity descriptions with specific angles.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Find opportunities error:', error);
      return [];
    }
  }

  /**
   * Analyze engagement patterns
   */
  async analyzeEngagementPatterns(posts: LinkedInPost[]): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const postsWithEngagement = posts
        .slice(0, 20)
        .map((p) => `Content: ${p.content.substring(0, 200)}...\nLikes: ${p.likes}, Comments: ${p.comments}`)
        .join('\n\n---\n\n');

      const prompt = `Analyze these LinkedIn posts and their engagement to identify patterns:

${postsWithEngagement}

Identify:
1. What type of content gets the most engagement?
2. Common characteristics of high-performing posts
3. Hook patterns that work
4. CTA patterns that drive comments

Return in JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error) {
      logger.error('Engagement patterns error:', error);
      return {};
    }
  }
}
