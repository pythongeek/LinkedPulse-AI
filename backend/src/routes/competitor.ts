import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { competitorAnalysisSchema } from '../utils/validation';
import { CompetitorAnalyzer } from '../services/competitorAnalyzer';
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

    // 1. Check cache (6-hour TTL for deep analysis)
    const cacheKey = `competitor:${topic.toLowerCase()}:${depth}`;
    const cached = await prisma.researchCache.findFirst({
      where: { query: cacheKey, expiresAt: { gt: new Date() } },
    });
    
    if (cached) {
      return res.json({
        analysis: cached.results,
        posts: (cached.results as any).topPosts?.slice(0, 10) || [],
        cached: true,
      });
    }

    // 2. Enqueue job instead of processing synchronously
    const { JobService } = await import('../services/jobService.js');
    const job = await JobService.enqueue('COMPETITOR_ANALYSIS', {
      topic,
      depth,
      postLimit,
      userId,
      cacheKey
    });

    return res.status(202).json({
      message: 'Analysis started',
      jobId: job.id,
      cached: false,
    });
  } catch (error) {
    logger.error('Competitor analysis error:', error);
    res.status(500).json({ error: { message: 'Analysis failed', code: 'ANALYSIS_ERROR' } });
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
    });

    if (!topicRecord || !topicRecord.competitionData) {
      return res.status(404).json({
        error: {
          message: 'No competitor data found. Run analysis first.',
          code: 'NO_DATA',
        },
      });
    }

    const gaps = (topicRecord.competitionData as any).contentGaps || [];
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

/**
 * Get snapshot history for a topic
 * GET /api/competitor/history/:topic
 */
router.get('/history/:topic', authenticate, async (req, res) => {
  try {
    const topic = req.params.topic as string;
    const snapshots = await prisma.analysisSnapshot.findMany({
      where: { userId: req.user!.id, topicKeyword: topic.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        postCount: true,
        avgEngagement: true,
        topGaps: true,
      },
    });
    res.json({ snapshots });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to get history' } });
  }
});

/**
 * Generate content from a specific gap
 * POST /api/competitor/generate-from-gap
 */
router.post('/generate-from-gap', authenticate, async (req, res) => {
  try {
    const { gap, topic } = req.body;
    const { JobService } = await import('../services/jobService.js');
    const jobId = await JobService.enqueue(
      'CONTENT_GENERATION',
      {
        userId: req.user!.id,
        options: {
          topic: `${topic}: ${gap.suggestedAngle}`,
          contentType: gap.contentFormat || 'post',
          researchDepth: 'quick',
          customInstructions: `Fill this content gap: ${gap.description}. Angle: ${gap.suggestedAngle}`,
          includeImages: false,
        }
      }
    );
    res.json({ jobId });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to generate content from gap' } });
  }
});

/**
 * Export analysis data
 * GET /api/competitor/export/:topicId?format=csv|json
 */
router.get('/export/:topicId', authenticate, async (req, res) => {
  const topicId = req.params.topicId as string;
  const format = (req.query.format as string) || 'json';
  
  const posts = await prisma.competitorPost.findMany({
    where: { topicId },
    orderBy: { likes: 'desc' },
  });

  if (format === 'csv') {
    const headers = [
      'Author', 'Format', 'Likes', 'Comments', 'Shares',
      'Engagement Rate', 'Viral Score', 'Word Count',
      'Hashtags', 'Has Media', 'CTA Present', 'Posted At'
    ];
    const rows = posts.map(p => [
      p.author, p.contentFormat, p.likes, p.comments, p.shares,
      p.engagementRate, p.viralScore, p.wordCount,
      p.hashtagsUsed.join(';'), p.hasMedia, p.ctaPresent, p.postedAt
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="competitor-${topicId}.csv"`);
    return res.send(csv);
  }

  res.json({ posts });
});

/**
 * Generate 90-day AI Overtake Strategy
 * POST /api/competitor/strategy
 */
router.post('/strategy', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: { message: 'Prompt is required' } });
    }
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.json({ strategy: text });
  } catch (error) {
    logger.error('Generate strategy error:', error);
    res.status(500).json({ error: { message: 'Failed to generate strategy' } });
  }
});

export default router;
