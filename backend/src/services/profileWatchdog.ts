import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LinkedInScraper } from './linkedinScraper';
import { ProfileAuditor } from './profileAuditor';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Profile Watchdog Service
 * 
 * Runs weekly audits to:
 * 1. Monitor industry trends
 * 2. Compare user profile against top creators
 * 3. Identify outdated content
 * 4. Send alerts for improvements
 */
export class ProfileWatchdogService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Run weekly audit for all users
   */
  async runWeeklyAudit(): Promise<void> {
    try {
      logger.info('[Profile Watchdog] Starting weekly audit...');

      // Get all users with LinkedIn connected
      const users = await this.prisma.user.findMany({
        where: {
          linkedinCookies: { not: null },
        },
      });

      logger.info(`[Profile Watchdog] Auditing ${users.length} users`);

      for (const user of users) {
        try {
          await this.auditUser(user);
        } catch (error) {
          logger.error(`[Profile Watchdog] Error auditing user ${user.id}:`, error);
        }
      }

      logger.info('[Profile Watchdog] Weekly audit completed');
    } catch (error) {
      logger.error('[Profile Watchdog] Audit error:', error);
    }
  }

  /**
   * Audit a single user
   */
  private async auditUser(user: any): Promise<void> {
    // Get latest audit
    const latestAudit = await this.prisma.profileAudit.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAudit) {
      logger.info(`[Profile Watchdog] No audit found for user ${user.id}`);
      return;
    }

    // Check for outdated content
    await this.checkOutdatedContent(user, latestAudit);

    // Check industry trends
    await this.checkIndustryTrends(user, latestAudit);

    // Compare with top creators
    await this.compareWithTopCreators(user, latestAudit);
  }

  /**
   * Check for outdated content
   */
  private async checkOutdatedContent(user: any, audit: any): Promise<void> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze this LinkedIn profile content for outdated information:

Headline: ${audit.headline}
About: ${audit.about?.substring(0, 500)}

Current year: 2025

Identify:
1. Outdated job titles or roles
2. Old achievements that should be updated
3. References to past years that need refreshing
4. Skills that may no longer be relevant

Return JSON array of outdated items with suggestions.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const outdated = JSON.parse(jsonMatch[0]);
        
        if (outdated.length > 0) {
          // Create alert
          await this.prisma.topicAlert.create({
            data: {
              userId: user.id,
              topic: 'Profile Update Needed',
              alertType: 'outdated_content',
              message: `Your profile has ${outdated.length} outdated items that need attention.`,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Check outdated content error:', error);
    }
  }

  /**
   * Check industry trends
   */
  private async checkIndustryTrends(user: any, audit: any): Promise<void> {
    try {
      const auditor = new ProfileAuditor();
      const trends = await auditor.getIndustryTrends('general');

      // Compare with user's current profile
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Compare this LinkedIn profile with current industry trends:

PROFILE:
Headline: ${audit.headline}
About: ${audit.about?.substring(0, 300)}

CURRENT TRENDS:
${JSON.stringify(trends, null, 2)}

Identify gaps where the profile doesn't align with trends.

Return JSON with recommendations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // If gaps found, create alert
      if (text.includes('gap') || text.includes('missing')) {
        await this.prisma.topicAlert.create({
          data: {
            userId: user.id,
            topic: 'Industry Trends Update',
            alertType: 'trend_alert',
            message: 'Industry trends have shifted. Consider updating your profile to stay relevant.',
          },
        });
      }
    } catch (error) {
      logger.error('Check industry trends error:', error);
    }
  }

  /**
   * Compare with top creators
   */
  private async compareWithTopCreators(user: any, audit: any): Promise<void> {
    try {
      // Get top creators (simulated for now)
      const topCreators = await new ProfileAuditor().getTopCreators('general');

      // Analyze gaps
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Compare this LinkedIn profile with top performers:

USER PROFILE:
Headline: ${audit.headline}
About: ${audit.about?.substring(0, 300)}

TOP CREATORS:
${JSON.stringify(topCreators.slice(0, 3), null, 2)}

What are the top creators doing that this profile is missing?

Return JSON with specific action items.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Create alert with actionable insights
      await this.prisma.topicAlert.create({
        data: {
          userId: user.id,
          topic: 'Competitive Insights',
          alertType: 'competitive_alert',
          message: 'New insights available from top performers in your industry.',
        },
      });
    } catch (error) {
      logger.error('Compare with top creators error:', error);
    }
  }

  /**
   * Generate headline variations for user
   */
  async generateHeadlineSuggestions(userId: string): Promise<any[]> {
    try {
      const audit = await this.prisma.profileAudit.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!audit) {
        return [];
      }

      const auditor = new ProfileAuditor();
      return await auditor.generateHeadlines(
        audit.headline || '',
        'general',
        ''
      );
    } catch (error) {
      logger.error('Generate headline suggestions error:', error);
      return [];
    }
  }
}
