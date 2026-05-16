import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { trendAnalysisSchema } from '../utils/validation';
import { TrendAnalyzer } from '../services/trendAnalyzer';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Analyze trends for keywords
 * POST /api/trends/analyze
 */
router.post('/analyze', authenticate, validateBody(trendAnalysisSchema), async (req, res) => {
  try {
    const { keywords, timeframe, geo } = req.body;

    // Check cache first
    const cacheKey = `trends:${keywords.join(',')}:${timeframe}:${geo}`;
    const cached = await prisma.researchCache.findFirst({
      where: {
        query: cacheKey,
        expiresAt: { gt: new Date() },
      },
    });

    if (cached) {
      logger.info('Returning cached trend data');
      return res.json({
        cached: true,
        data: cached.results,
      });
    }

    // Analyze trends
    const analyzer = new TrendAnalyzer();
    const results = await analyzer.analyzeTrends(keywords, timeframe, geo);

    // Cache results for 6 hours
    await prisma.researchCache.create({
      data: {
        query: cacheKey,
        queryType: 'trends',
        results: results as any,
        source: 'google_trends',
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });

    // Update usage stats
    await prisma.usageStats.updateMany({
      where: { userId: req.user!.id },
      data: { topicsResearched: { increment: 1 } },
    });

    res.json({
      cached: false,
      data: results,
    });
  } catch (error) {
    logger.error('Trend analysis error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to analyze trends',
        code: 'TREND_ERROR',
      },
    });
  }
});

/**
 * Get trending topics
 * GET /api/trends/trending
 */
router.get('/trending', authenticate, async (req, res) => {
  try {
    const { category = 'business', limit = '10' } = req.query;

    const analyzer = new TrendAnalyzer();
    const trending = await analyzer.getTrendingTopics(
      category as string,
      parseInt(limit as string)
    );

    res.json({ trending });
  } catch (error) {
    logger.error('Get trending error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get trending topics',
        code: 'TREND_ERROR',
      },
    });
  }
});

/**
 * Get topic opportunities
 * GET /api/trends/opportunities
 */
router.get('/opportunities', authenticate, async (req, res) => {
  try {
    const { limit = '10', minScore = '60' } = req.query;

    // Get topics with opportunity scores
    const topics = await prisma.topic.findMany({
      where: {
        opportunityScore: {
          gte: parseInt(minScore as string),
        },
      },
      orderBy: { opportunityScore: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ topics });
  } catch (error) {
    logger.error('Get opportunities error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get opportunities',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Compare multiple topics
 * POST /api/trends/compare
 */
router.post('/compare', authenticate, async (req, res) => {
  try {
    const { topics } = req.body;

    if (!Array.isArray(topics) || topics.length < 2 || topics.length > 5) {
      return res.status(400).json({
        error: {
          message: 'Please provide 2-5 topics to compare',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const analyzer = new TrendAnalyzer();
    const comparison = await analyzer.compareTopics(topics);

    res.json({ comparison });
  } catch (error) {
    logger.error('Topic comparison error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to compare topics',
        code: 'TREND_ERROR',
      },
    });
  }
});

/**
 * Get interest over time for a topic
 * GET /api/trends/interest/:topic
 */
router.get('/interest/:topic', authenticate, async (req, res) => {
  try {
    const topic = req.params.topic as string;
    const { timeframe = 'today 12-m' } = req.query;

    const analyzer = new TrendAnalyzer();
    const interestData = await analyzer.getInterestOverTime(
      topic,
      timeframe as string
    );

    res.json({ interestData });
  } catch (error) {
    logger.error('Interest data error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get interest data',
        code: 'TREND_ERROR',
      },
    });
  }
});

/**
 * Get related queries for a topic
 * GET /api/trends/related/:topic
 */
router.get('/related/:topic', authenticate, async (req, res) => {
  try {
    const topic = req.params.topic as string;

    const analyzer = new TrendAnalyzer();
    const related = await analyzer.getRelatedQueries(topic);

    res.json({ related });
  } catch (error) {
    logger.error('Related queries error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get related queries',
        code: 'TREND_ERROR',
      },
    });
  }
});

/**
 * Calculate opportunity score for a topic
 * POST /api/trends/opportunity-score
 */
router.post('/opportunity-score', authenticate, async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: {
          message: 'Topic is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Get existing topic data for competition stats
    const existingTopic = await prisma.topic.findUnique({
      where: { keyword: topic.toLowerCase() },
    });

    let competitionStats;
    if (existingTopic?.competitionData) {
      const data = existingTopic.competitionData as any;
      if (data.avgEngagement) {
        // Normalize engagement (0-100)
        // Assume 500 likes is high engagement
        const engagement = Math.min(100, (data.avgEngagement.likes / 500) * 100);

        // Normalize competition based on posts analyzed (0-100)
        // Assume 50 posts analyzed means high competition data availability
        // This is a proxy since we don't have total global posts count
        const competition = Math.min(100, (data.totalPosts / 50) * 100);

        competitionStats = {
          competition,
          engagement
        };
      }
    }

    const analyzer = new TrendAnalyzer();
    const score = await analyzer.calculateOpportunityScore(topic, competitionStats);

    // Save or update topic
    await prisma.topic.upsert({
      where: { keyword: topic.toLowerCase() },
      update: {
        opportunityScore: score.score,
        trendData: score.trendData,
        competitionData: score.competitionData,
        lastAnalyzed: new Date(),
      },
      create: {
        keyword: topic.toLowerCase(),
        opportunityScore: score.score,
        trendData: score.trendData,
        competitionData: score.competitionData,
        lastAnalyzed: new Date(),
      },
    });

    res.json({ score });
  } catch (error) {
    logger.error('Opportunity score error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to calculate opportunity score',
        code: 'TREND_ERROR',
      },
    });
  }
});

export default router;
