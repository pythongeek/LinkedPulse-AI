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
const unpackAudit = (dbAudit: any) => {
  if (!dbAudit) return null;
  const extra = dbAudit.industryTrends as any;
  if (extra && extra.pillars) {
    return {
      ...dbAudit,
      profileType: extra.profileType || 'personal',
      pillars: extra.pillars,
      headlineAnalysis: extra.headlineAnalysis,
      aboutAnalysis: extra.aboutAnalysis,
      experienceAnalysis: extra.experienceAnalysis,
      skillsAnalysis: extra.skillsAnalysis,
      taglineAnalysis: extra.taglineAnalysis,
      overviewAnalysis: extra.overviewAnalysis,
      conversionAnalysis: extra.conversionAnalysis,
      companyDetailsAnalysis: extra.companyDetailsAnalysis,
      industryTrends: extra.trends
    };
  }
  return dbAudit;
};

/**
 * Run profile audit
 * POST /api/audit/run
 */
router.post('/run', authenticate, validateBody(profileAuditSchema), async (req, res) => {
  try {
    const {
      linkedinUrl,
      industry,
      focusAreas,
      profileType = 'personal',
      headline,
      about,
      bannerUrl,
      profilePicUrl,
      experience,
      skills,
      customUrlPresent = false,
      featuredPresent = false,
      tagline,
      description,
      ctaButton,
      websiteUrl,
      companySize
    } = req.body;
    const userId = req.user!.id;

    // Build profile object from manual overrides or scraper fallback
    let profile: any = {
      profileType,
      headline: headline || null,
      about: about || null,
      bannerUrl: bannerUrl || null,
      profilePicUrl: profilePicUrl || null,
      experience: experience || null,
      skills: skills || null,
      customUrlPresent: !!customUrlPresent,
      featuredPresent: !!featuredPresent,
      tagline: tagline || null,
      description: description || null,
      ctaButton: ctaButton || null,
      websiteUrl: websiteUrl || null,
      companySize: companySize || null
    };

    const isManual = headline || about || tagline || description;

    if (!isManual) {
      // Priority 2: Use stored LinkedIn profile from user record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { linkedinProfile: true },
      });

      if (user?.linkedinProfile) {
        const stored = user.linkedinProfile as any;
        profile = {
          ...profile,
          ...stored
        };
      }

      // Priority 3: Attempt scraper if user has an active session and URL is provided
      const isProfileEmpty = profileType === 'company' ? !profile.tagline : !profile.headline;
      if (isProfileEmpty && linkedinUrl) {
        const session = await prisma.linkedInSession.findUnique({ where: { userId } });
        if (session?.isActive && session.liAt && session.jsessionId) {
          const { Encryption } = await import('../utils/encryption.js');
          const cookies = {
            liAt: Encryption.decrypt(session.liAt),
            jsessionId: Encryption.decrypt(session.jsessionId),
          };
          const scraper = new LinkedInScraper();
          const scraped = await scraper.scrapeProfile(linkedinUrl, cookies);
          if (scraped.headline || scraped.about || scraped.tagline || scraped.description) {
            profile = {
              ...profile,
              ...scraped
            };
          }
        }
      }
    }

    // Run audit
    const auditor = new ProfileAuditor();
    const audit = await auditor.audit(profile, industry, focusAreas);

    // Save audit to database with extra metadata serialized inside industryTrends JSON
    const savedAudit = await prisma.profileAudit.create({
      data: {
        userId,
        headline: profile.headline || profile.tagline,
        about: profile.about || profile.description,
        bannerUrl: profile.bannerUrl,
        profileUrl: linkedinUrl || null,
        auditScore: audit.overallScore,
        seoScore: audit.seoScore,
        brandScore: audit.brandScore,
        gaps: audit.gaps as any,
        suggestions: audit.suggestions as any,
        topCreators: audit.topCreators as any,
        industryTrends: {
          trends: audit.industryTrends,
          pillars: audit.pillars,
          profileType: audit.profileType,
          headlineAnalysis: audit.headlineAnalysis,
          aboutAnalysis: audit.aboutAnalysis,
          experienceAnalysis: audit.experienceAnalysis,
          skillsAnalysis: audit.skillsAnalysis,
          taglineAnalysis: audit.taglineAnalysis,
          overviewAnalysis: audit.overviewAnalysis,
          conversionAnalysis: audit.conversionAnalysis,
          companyDetailsAnalysis: audit.companyDetailsAnalysis
        } as any,
      },
    });

    // Update user's LinkedIn profile cache
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

    res.json({ audits: audits.map(unpackAudit) });
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

    res.json({ audit: unpackAudit(audit) });
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
