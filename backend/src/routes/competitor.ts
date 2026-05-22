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

    // 2. Run analysis
    const analyzer = new CompetitorAnalyzer();
    const analysis = await analyzer.analyze([], topic, depth);

    // 3. Upsert topic record
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

    // 4. Save enriched posts to database
    if (analysis.allPosts.length > 0) {
      await prisma.competitorPost.createMany({
        data: analysis.allPosts.map((post: any) => ({
          topicId: topicRecord.id,
          author: post.author,
          authorProfile: post.authorProfile,
          content: post.content,
          hookText: post.hookText,
          contentFormat: post.contentFormat,
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          engagementRate: post.engagementRate,
          viralScore: post.viralScore,
          wordCount: post.wordCount,
          emojiCount: post.emojiCount,
          hashtagsUsed: post.hashtagsUsed,
          hasMedia: post.hasMedia,
          hasLink: post.hasLink,
          ctaPresent: post.ctaPresent,
          dayOfWeek: post.dayOfWeek >= 0 ? post.dayOfWeek : null,
          hourPosted: post.hourPosted >= 0 ? post.hourPosted : null,
          postUrl: post.postUrl,
          postedAt: post.postedAt ? new Date(post.postedAt) : null,
          dataSource: post.dataSource,
        })),
        skipDuplicates: true,
      });
    }

    // 5. Save analysis snapshot for historical comparison
    await prisma.analysisSnapshot.create({
      data: {
        userId,
        topicKeyword: topic.toLowerCase(),
        snapshotData: analysis as any,
        postCount: analysis.totalPostsAnalyzed,
        avgEngagement: analysis.avgEngagement.likes + analysis.avgEngagement.comments,
        topGaps: analysis.contentGaps.slice(0, 5).map((g: any) => g.title),
      },
    });

    // 6. Cache result
    await prisma.researchCache.create({
      data: {
        query: cacheKey,
        queryType: 'competitor_analysis',
        results: analysis as any,
        source: analysis.dataSource,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
      },
    });

    res.json({
      analysis,
      posts: analysis.topPosts.slice(0, 10),
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

export default router;
