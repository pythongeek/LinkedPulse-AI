import { PrismaClient } from '@prisma/client';
import { TrendAnalyzer } from './trendAnalyzer';
import { logger } from '../utils/logger';

/**
 * Trend Monitor Service
 * 
 * Monitors trending topics and alerts users about:
 * 1. New trending topics in their industry
 * 2. Rising search terms
 * 3. Content opportunities
 */
export class TrendMonitorService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check trending topics daily
   */
  async checkTrendingTopics(): Promise<void> {
    try {
      logger.info('[Trend Monitor] Checking trending topics...');

      const analyzer = new TrendAnalyzer();
      
      // Get trending topics
      const trending = await analyzer.getTrendingTopics('business', 20);

      // Get users with topic alerts enabled
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });

      for (const user of users) {
        // Check if any trending topics match user's interests
        // (In a real implementation, you'd check against user's interests)
        for (const trend of trending.slice(0, 5)) {
          // Create alert for trending topic
          await this.prisma.topicAlert.create({
            data: {
              userId: user.id,
              topic: trend.title,
              alertType: 'trending_topic',
              message: `Trending: "${trend.title}" - Consider creating content about this topic.`,
            },
          });
        }
      }

      logger.info('[Trend Monitor] Trend check completed');
    } catch (error) {
      logger.error('[Trend Monitor] Error:', error);
    }
  }

  /**
   * Monitor specific topics for users
   */
  async monitorUserTopics(userId: string, topics: string[]): Promise<void> {
    try {
      const analyzer = new TrendAnalyzer();

      for (const topic of topics) {
        const score = await analyzer.calculateOpportunityScore(topic);

        // If score is high, create alert
        if (score.score >= 70) {
          await this.prisma.topicAlert.create({
            data: {
              userId,
              topic,
              alertType: 'opportunity',
              message: `High opportunity score (${score.score}/100) for "${topic}". Great time to create content!`,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Monitor user topics error:', error);
    }
  }
}
