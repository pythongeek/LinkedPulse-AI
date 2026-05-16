import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { researchSchema } from '../utils/validation';
import { ResearchService } from '../services/researchService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Perform research
 * POST /api/research/search
 */
router.post('/search', authenticate, validateBody(researchSchema), async (req, res) => {
  try {
    const { query, sources, limit } = req.body;

    // Check cache
    const cacheKey = `research:${query}:${sources.join(',')}`;
    const cached = await prisma.researchCache.findFirst({
      where: {
        query: cacheKey,
        expiresAt: { gt: new Date() },
      },
    });

    if (cached) {
      return res.json({
        cached: true,
        results: cached.results,
      });
    }

    const researchService = new ResearchService();
    let results: any[] = [];

    // Search based on sources
    if (sources.includes('web')) {
      const webResults = await researchService.webSearch(query, limit);
      results = [...results, ...webResults];
    }

    if (sources.includes('news')) {
      const newsResults = await researchService.newsSearch(query, limit);
      results = [...results, ...newsResults];
    }

    // Cache results
    await prisma.researchCache.create({
      data: {
        query: cacheKey,
        queryType: 'research',
        results,
        source: sources.join(','),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    res.json({
      cached: false,
      results,
    });
  } catch (error) {
    logger.error('Research search error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to perform research',
        code: 'RESEARCH_ERROR',
      },
    });
  }
});

/**
 * Extract information from URL
 * POST /api/research/extract
 */
router.post('/extract', authenticate, async (req, res) => {
  try {
    const { url } = req.body;

    const researchService = new ResearchService();
    const extracted = await researchService.extractFromUrl(url);

    res.json({ extracted });
  } catch (error) {
    logger.error('URL extraction error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to extract information',
        code: 'EXTRACTION_ERROR',
      },
    });
  }
});

/**
 * Summarize research findings
 * POST /api/research/summarize
 */
router.post('/summarize', authenticate, async (req, res) => {
  try {
    const { results } = req.body;

    const researchService = new ResearchService();
    const summary = await researchService.summarizeFindings(results);

    res.json({ summary });
  } catch (error) {
    logger.error('Summarize error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to summarize findings',
        code: 'SUMMARY_ERROR',
      },
    });
  }
});

export default router;
