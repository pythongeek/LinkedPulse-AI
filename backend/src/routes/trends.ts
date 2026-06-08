import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { trendAnalysisSchema } from '../utils/validation';
import { TrendAnalyzer } from '../services/trendAnalyzer';
import { TopicResearchOrchestrator } from '../services/topicResearchOrchestrator';
import { LinkedInContentGapAnalyzer } from '../services/linkedinContentGapAnalyzer';
import { OpportunityScorer } from '../services/opportunityScorer';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Analyze trends for keywords
 * POST /api/trends/analyze
 */
router.post('/analyze', authenticate, validateBody(trendAnalysisSchema), async (req, res) => {
  try {
    const {
      keywords, timeframe, geo,
      contentTypeTarget, topicType, audienceSegment, industryVertical,
      isBtoB, personaId, competitorContext, existingContentContext,
      customResearchDirective, researchDepth, noCache
    } = req.body;

    const primaryKeyword = keywords[0];
    const compareKeyword = keywords[1];

    // Build context object for orchestrator
    let personaSystemPrompt: string | undefined;
    if (personaId) {
      try {
        const persona = await prisma.persona.findFirst({
          where: { id: personaId, userId: req.user!.id }
        });
        if (persona) {
          personaSystemPrompt = `${persona.jobRole}. Voice: ${persona.tone}. Expertise: ${(persona.expertiseNodes as string[]).join(', ')}.`;
        }
      } catch { /* ignore persona fetch errors */ }
    } else {
      // Try default persona
      const defaultPersona = await prisma.persona.findFirst({
        where: { userId: req.user!.id, isDefault: true }
      });
      if (defaultPersona) {
        personaSystemPrompt = `${defaultPersona.jobRole}. Voice: ${defaultPersona.tone}`;
      }
    }

    const researchContext = {
      contentTypeTarget,
      topicType,
      audienceSegment,
      industryVertical,
      isBtoB: isBtoB !== undefined ? isBtoB : true,
      competitorContext,
      existingContentContext,
      customResearchDirective,
      personaSystemPrompt,
    };

    // Check cache (unless noCache flag set)
    const cacheKey = `trends:${keywords.join(',')}:${timeframe}:${geo}`;
    if (!noCache) {
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
          cachedAt: cached.createdAt,
          data: cached.results,
        });
      }
    }

    // Analyze trends
    const orchestrator = new TopicResearchOrchestrator();
    const gapAnalyzer = new LinkedInContentGapAnalyzer();
    const scorer = new OpportunityScorer();

    logger.info(`Running Orchestrated Research for: ${primaryKeyword} (depth: ${researchDepth || 'deep'})`);

    const depth = researchDepth === 'deep' ? 'deep' : 'deep'; // Always deep for quality
    const researchResult = await orchestrator.research(primaryKeyword, depth, researchContext, !!noCache);

    // Persona context for gap analyzer
    const personaContext = personaSystemPrompt;
    const gapResult = await gapAnalyzer.analyzeGaps(primaryKeyword, personaContext);
    const opportunityScore = scorer.score(researchResult, gapResult);

    // Compute velocity category
    const velocity7d = researchResult.velocity7d;
    let velocityLabel = 'stable';
    if (velocity7d > 30) velocityLabel = 'exploding';
    else if (velocity7d > 10) velocityLabel = 'rising';
    else if (velocity7d < -20) velocityLabel = 'dying';
    else if (velocity7d < -5) velocityLabel = 'cooling';

    // Determine best content type from format performance scores
    const formatScores = researchResult.linkedinContext.formatPerformanceScores || {};
    const bestContentType = Object.entries(formatScores).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'carousel';

    const enhancedOpportunity = {
      ...opportunityScore,
      velocity: velocityLabel,
      isPeaking: researchResult.isPeaking,
      bestContentType,
      estimatedEngagementScore: Math.min(100, opportunityScore.overallScore + 10),
      hashtagRecommendations: researchResult.linkedinContext.topHashtags.slice(0, 5),
      isDataReal: researchResult.isFullyGrounded,
    };

    let comparisonResult = null;
    if (compareKeyword) {
      try {
        const compareResearch = await orchestrator.research(compareKeyword, 'quick', researchContext, !!noCache);
        const compareGaps = await gapAnalyzer.analyzeGaps(compareKeyword, personaContext);
        const compareScore = scorer.score(compareResearch, compareGaps);
        comparisonResult = {
          keyword: compareKeyword,
          research: compareResearch,
          gaps: compareGaps,
          opportunity: compareScore,
        };
      } catch (e) {
        logger.error('Comparison topic research failed:', e);
      }
    }

    const legacyData = await new TrendAnalyzer().analyzeTrends(keywords, timeframe, geo).catch(() => []);

    const enrichedResult = {
      research: researchResult,
      gaps: gapResult,
      opportunity: enhancedOpportunity,
      comparison: comparisonResult,
      legacyComparison: legacyData,
      meta: {
        keyword: primaryKeyword,
        compareWith: compareKeyword,
        timeframe,
        geo,
        context: { contentTypeTarget, topicType, audienceSegment, industryVertical },
        analyzedAt: new Date().toISOString(),
      },
    };

    // Cache results for 6 hours
    await prisma.researchCache.create({
      data: {
        query: cacheKey,
        queryType: 'trends_v2',
        results: enrichedResult as any,
        source: 'orchestrator_v2',
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
      data: enrichedResult,
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

    const topics = await prisma.topic.findMany({
      where: {
        opportunityScore: {
          gte: parseInt(minScore as string),
        },
      },
      orderBy: { opportunityScore: 'desc' },
      take: parseInt(limit as string),
      // ⚡ Bolt: Prevent over-fetching large JSON blobs in list endpoints
      omit: {
        trendData: true,
        competitionData: true,
        linkedinData: true,
        contentAngleMap: true,
      },
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

    const existingTopic = await prisma.topic.findUnique({
      where: { keyword: topic.toLowerCase() },
    });

    let competitionStats;
    if (existingTopic?.competitionData) {
      const data = existingTopic.competitionData as any;
      if (data.avgEngagement) {
        const engagement = Math.min(100, (data.avgEngagement.likes / 500) * 100);
        const competition = Math.min(100, (data.totalPosts / 50) * 100);
        competitionStats = { competition, engagement };
      }
    }

    const analyzer = new TrendAnalyzer();
    const score = await analyzer.calculateOpportunityScore(topic, competitionStats);

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

/**
 * Share analysis result
 * POST /api/trends/share
 */
router.post('/share', authenticate, async (req, res) => {
  try {
    const { analysisData, keyword } = req.body;
    if (!analysisData) {
      return res.status(400).json({ error: { message: 'Analysis data required', code: 'VALIDATION_ERROR' } });
    }

    const shareId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await prisma.researchCache.create({
      data: {
        query: shareId,
        queryType: 'shared_analysis',
        results: analysisData,
        source: 'user_share',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.json({ shareId, url: `/trends/shared/${shareId}`, keyword });
  } catch (error) {
    logger.error('Share trend error:', error);
    res.status(500).json({ error: { message: 'Failed to create share link', code: 'INTERNAL_ERROR' } });
  }
});

/**
 * Get shared analysis (public)
 * GET /api/trends/share/:shareId
 */
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const shared = await prisma.researchCache.findFirst({
      where: { query: shareId, queryType: 'shared_analysis', expiresAt: { gt: new Date() } },
    });

    if (!shared) {
      return res.status(404).json({ error: { message: 'Shared analysis not found or expired', code: 'NOT_FOUND' } });
    }

    res.json({ data: shared.results, createdAt: shared.createdAt });
  } catch (error) {
    logger.error('Get shared trend error:', error);
    res.status(500).json({ error: { message: 'Failed to retrieve shared analysis', code: 'INTERNAL_ERROR' } });
  }
});

/**
 * Export analysis as PDF
 * POST /api/trends/export
 */
router.post('/export', authenticate, async (req, res) => {
  try {
    const { analysisData } = req.body;
    if (!analysisData) {
      return res.status(400).json({ error: { message: 'Analysis data required', code: 'VALIDATION_ERROR' } });
    }

    const { PdfGeneratorService } = await import('../services/pdfGenerator.js');
    const research = analysisData.research || {};
    const gaps = analysisData.gaps || {};
    const opportunity = analysisData.opportunity || {};

    // Build slides from analysis
    const slides = [
      {
        slideNumber: 1,
        headline: `Topic Intelligence: ${research.topic || 'Analysis'}`,
        body: `Opportunity Score: ${opportunity.overallScore || 'N/A'}/100 · Level: ${opportunity.opportunityLevel || 'N/A'} · Velocity: ${opportunity.velocity || 'stable'}`,
        type: 'cover',
      },
      {
        slideNumber: 2,
        headline: 'Opportunity Scorecard',
        body: `Trend Momentum: ${opportunity.factors?.trendMomentum || 0}/100\nCommunity Interest: ${opportunity.factors?.communityInterest || 0}/100\nContent Gap Size: ${opportunity.factors?.contentGapSize || 0}/100\nB2B Relevance: ${opportunity.factors?.b2bRelevance || 0}/100`,
      },
      ...(gaps.topGaps || []).slice(0, 6).map((gap: any, i: number) => ({
        slideNumber: 3 + i,
        headline: gap.gap || `Content Gap ${i + 1}`,
        body: gap.rationale || gap.opportunity || '',
      })),
      {
        slideNumber: 9,
        headline: 'Top Verified Statistics',
        body: (research.keyStatistics || []).slice(0, 4).map((s: any) => `• ${s.fact}`).join('\n'),
      },
      {
        slideNumber: 10,
        headline: 'Related Topics to Explore',
        body: (research.relatedQueries?.rising || []).slice(0, 5).map((q: any) => `↑ ${q.query || q}`).join('\n'),
      },
    ];

    const pdfBuffer = await PdfGeneratorService.generateCarouselPdf(slides, `Trend Intelligence: ${research.topic}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="trend-analysis-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Export trend PDF error:', error);
    res.status(500).json({ error: { message: 'Failed to generate PDF export', code: 'INTERNAL_ERROR' } });
  }
});

export default router;
