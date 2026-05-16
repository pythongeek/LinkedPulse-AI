import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { competitorAnalysisSchema } from '../utils/validation';
import { CompetitorAnalyzer } from '../services/competitorAnalyzer';
import { LinkedInScraper } from '../services/linkedinScraper';
import { Encryption } from '../utils/encryption';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Analyze competitors for a topic
 * POST /api/competitor/analyze
 */
router.post('/analyze', authenticate, validateBody(competitorAnalysisSchema), async (req, res) => {
  try {
    const { topic, depth, postLimit } = req.body;
    const userId = req.user!.id;

    // Get user's LinkedIn session
    const session = await prisma.linkedInSession.findUnique({
      where: { userId },
    });

    if (!session || !session.isActive) {
      return res.status(400).json({
        error: {
          message: 'LinkedIn session required for competitor analysis',
          code: 'NO_LINKEDIN_SESSION',
        },
      });
    }

    // Decrypt cookies
    const cookies = {
      liAt: session.liAt,
      jsessionId: session.jsessionId,
    };

    // Scrape posts
    const scraper = new LinkedInScraper();
    const posts = await scraper.scrapeTopicPosts(topic, cookies, postLimit);

    // Analyze competitors
    const analyzer = new CompetitorAnalyzer();
    const analysis = await analyzer.analyze(posts, topic, depth);

    // Save competitor posts to database
    const topicRecord = await prisma.topic.upsert({
      where: { keyword: topic.toLowerCase() },
      update: {
        competitionData: analysis as any,
        lastAnalyzed: new Date(),
      },
      create: {
        keyword: topic.toLowerCase(),
        competitionData: analysis as any,
        lastAnalyzed: new Date(),
      },
    });

    // Save individual posts
    await prisma.competitorPost.createMany({
      data: posts.map((post) => ({
        topicId: topicRecord.id,
        author: post.author,
        authorProfile: post.authorProfile,
        content: post.content,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        postUrl: post.postUrl,
        postedAt: post.timestamp ? new Date(post.timestamp) : null,
      })),
      skipDuplicates: true,
    });

    res.json({
      analysis,
      posts: posts.slice(0, 10),
    });
  } catch (error) {
    logger.error('Competitor analysis error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to analyze competitors',
        code: 'ANALYSIS_ERROR',
      },
    });
  }
});

/**
 * Get content gaps for a topic
 * GET /api/competitor/gaps/:topic
 */
router.get('/gaps/:topic', authenticate, async (req, res) => {
  try {
    const topic = req.params.topic as string;

    const topicRecord = await prisma.topic.findUnique({
      where: { keyword: topic.toLowerCase() },
      include: {
        competitors: {
          orderBy: { likes: 'desc' },
          take: 50,
        },
      },
    });

    if (!topicRecord || !topicRecord.competitors.length) {
      return res.status(404).json({
        error: {
          message: 'No competitor data found. Run analysis first.',
          code: 'NO_DATA',
        },
      });
    }

    const analyzer = new CompetitorAnalyzer();
    const gaps = await analyzer.identifyGaps(topicRecord.competitors, topic);

    res.json({ gaps });
  } catch (error) {
    logger.error('Get gaps error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to identify gaps',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get top performers for a topic
 * GET /api/competitor/top-performers/:topic
 */
router.get('/top-performers/:topic', authenticate, async (req, res) => {
  try {
    const topic = req.params.topic as string;
    const { limit = '10' } = req.query;

    const topicRecord = await prisma.topic.findUnique({
      where: { keyword: topic.toLowerCase() },
    });

    if (!topicRecord) {
      return res.status(404).json({
        error: {
          message: 'Topic not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const topPerformers = await prisma.competitorPost.findMany({
      where: { topicId: topicRecord.id },
      orderBy: [
        { likes: 'desc' },
        { comments: 'desc' },
      ],
      take: parseInt(limit as string),
    });

    res.json({ topPerformers });
  } catch (error) {
    logger.error('Get top performers error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get top performers',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export default router;
