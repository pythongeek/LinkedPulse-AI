import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { profileAuditSchema } from '../utils/validation';
import { ProfileAuditor } from '../services/profileAuditor';
import { LinkedInScraper } from '../services/linkedinScraper';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Run profile audit
 * POST /api/audit/run
 */
router.post('/run', authenticate, validateBody(profileAuditSchema), async (req, res) => {
  try {
    const { linkedinUrl, industry, focusAreas } = req.body;
    const userId = req.user!.id;

    // Get user's LinkedIn session
    const session = await prisma.linkedInSession.findUnique({
      where: { userId },
    });

    if (!session || !session.isActive) {
      return res.status(400).json({
        error: {
          message: 'LinkedIn session required for profile audit',
          code: 'NO_LINKEDIN_SESSION',
        },
      });
    }

    const cookies = {
      liAt: session.liAt,
      jsessionId: session.jsessionId,
    };

    // Scrape profile
    const scraper = new LinkedInScraper();
    const profile = await scraper.scrapeProfile(linkedinUrl, cookies);

    // Run audit
    const auditor = new ProfileAuditor();
    const audit = await auditor.audit(profile, industry, focusAreas);

    // Save audit to database
    const savedAudit = await prisma.profileAudit.create({
      data: {
        userId,
        headline: profile.headline,
        about: profile.about,
        bannerUrl: profile.bannerUrl,
        profileUrl: linkedinUrl,
        auditScore: audit.overallScore,
        seoScore: audit.seoScore,
        brandScore: audit.brandScore,
        gaps: audit.gaps,
        suggestions: audit.suggestions,
        topCreators: audit.topCreators,
        industryTrends: audit.industryTrends,
      },
    });

    // Update user's LinkedIn profile data
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkedinProfile: profile,
      },
    });

    res.json({
      audit: {
        id: savedAudit.id,
        ...audit,
      },
    });
  } catch (error) {
    logger.error('Profile audit error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to run profile audit',
        code: 'AUDIT_ERROR',
      },
    });
  }
});

/**
 * Get audit history
 * GET /api/audit/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const audits = await prisma.profileAudit.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ audits });
  } catch (error) {
    logger.error('Get audit history error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get audit history',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get latest audit
 * GET /api/audit/latest
 */
router.get('/latest', authenticate, async (req, res) => {
  try {
    const audit = await prisma.profileAudit.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!audit) {
      return res.status(404).json({
        error: {
          message: 'No audits found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ audit });
  } catch (error) {
    logger.error('Get latest audit error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get latest audit',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Generate headline variations
 * POST /api/audit/headlines
 */
router.post('/headlines', authenticate, async (req, res) => {
  try {
    const { currentHeadline, industry, focus } = req.body;

    const auditor = new ProfileAuditor();
    const headlines = await auditor.generateHeadlines(currentHeadline, industry, focus);

    res.json({ headlines });
  } catch (error) {
    logger.error('Generate headlines error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate headlines',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Generate About section
 * POST /api/audit/about
 */
router.post('/about', authenticate, async (req, res) => {
  try {
    const { persona, achievements, targetAudience } = req.body;

    const auditor = new ProfileAuditor();
    const about = await auditor.generateAbout(persona, achievements, targetAudience);

    res.json({ about });
  } catch (error) {
    logger.error('Generate about error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate About section',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get industry trends
 * GET /api/audit/industry-trends/:industry
 */
router.get('/industry-trends/:industry', authenticate, async (req, res) => {
  try {
    const industry = req.params.industry as string;

    const auditor = new ProfileAuditor();
    const trends = await auditor.getIndustryTrends(industry);

    res.json({ trends });
  } catch (error) {
    logger.error('Get industry trends error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get industry trends',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export default router;
