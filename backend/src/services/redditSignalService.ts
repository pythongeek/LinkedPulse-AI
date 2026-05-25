import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  selftext?: string;
  createdUtc: number;
  upvoteRatio: number;
}

export interface RedditSignal {
  totalPosts: number;
  avgScore: number;
  hotAngles: string[];
  activeSubreddits: string[];
  topPosts: RedditPost[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  weeklyPostCount: number;
  isDataReal: boolean;
  painPoints?: string[];
  unansweredQuestions?: string[];
}

export class RedditSignalService {
  /**
   * Use Gemini Google Search to find real Reddit B2B community discussions and extract hot angles
   */
  async getTopicSignal(topic: string): Promise<RedditSignal> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} } as any],
    });

    try {
      logger.info(`Fetching Reddit signal for ${topic} using Gemini Search`);
      const result = await model.generateContent(
        `Search for recent Reddit posts discussing "${topic}" in professional or B2B subreddits (like r/entrepreneur, r/marketing, r/b2b, r/saas, r/linkedin).
         Based on the real search results, provide:
         1. A summary of the sentiment (positive, neutral, negative, mixed)
         2. Estimated weekly post count based on recency
         3. 5 specific, actionable "hot angles" or narratives currently being discussed
         4. A list of active subreddits where this is discussed
         5. The top 5 posts found (title, subreddit, estimated score, url)

         Return ONLY JSON:
         {
           "sentiment": "positive" | "neutral" | "negative" | "mixed",
           "weeklyPostCount": 1-1000,
           "hotAngles": ["angle 1", "angle 2"],
           "activeSubreddits": ["r/saas", "r/marketing"],
           "painPoints": ["specific pain 1", "specific pain 2"],
           "unansweredQuestions": ["question 1?", "question 2?"],
           "topPosts": [
             {
               "title": "Post title",
               "subreddit": "r/saas",
               "score": 100,
               "numComments": 50,
               "url": "https://reddit.com/r/saas/...",
               "createdUtc": 1700000000,
               "upvoteRatio": 0.95
             }
           ]
         }`
      );
      
      const text = result.response.text();
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      const parsed = json ? JSON.parse(json) : {};
      
      const topPosts = parsed.topPosts || [];
      const totalPosts = topPosts.length;
      const avgScore = totalPosts > 0 ? topPosts.reduce((acc: number, p: any) => acc + (p.score || 0), 0) / totalPosts : 0;
      
      return {
        totalPosts,
        avgScore: Math.round(avgScore),
        hotAngles: parsed.hotAngles || [],
        activeSubreddits: parsed.activeSubreddits || [],
        topPosts: topPosts,
        sentiment: parsed.sentiment || 'neutral',
        weeklyPostCount: parsed.weeklyPostCount || 0,
        isDataReal: true,
        painPoints: parsed.painPoints || [],
        unansweredQuestions: parsed.unansweredQuestions || [],
      };
    } catch (error) {
      logger.error('RedditSignalService error:', error);
      return this.emptySignal();
    }
  }

  private emptySignal(): RedditSignal {
    return {
      totalPosts: 0,
      avgScore: 0,
      hotAngles: [],
      activeSubreddits: [],
      topPosts: [],
      sentiment: 'neutral',
      weeklyPostCount: 0,
      isDataReal: false,
      painPoints: [],
      unansweredQuestions: [],
    };
  }
}
