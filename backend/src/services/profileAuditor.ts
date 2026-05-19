import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ProfileAuditResult {
  profileType: 'personal' | 'company';
  overallScore: number;
  seoScore: number;
  brandScore: number;
  pillars: {
    firstImpression: { score: number; status: 'good' | 'average' | 'critical'; feedback: string[] };
    headline: { score: number; status: 'good' | 'average' | 'critical'; feedback: string[] };
    summary: { score: number; status: 'good' | 'average' | 'critical'; feedback: string[] };
    seo: { score: number; status: 'good' | 'average' | 'critical'; feedback: string[] };
    completeness: { score: number; status: 'good' | 'average' | 'critical'; feedback: string[] };
  };
  headlineAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  aboutAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  bannerAnalysis: {
    score: number;
    feedback: string[];
  };
  experienceAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  skillsAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  taglineAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  overviewAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  conversionAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  companyDetailsAnalysis?: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  gaps: string[];
  suggestions: {
    priority: 'high' | 'medium' | 'low';
    section: string;
    suggestion: string;
    example?: string;
  }[];
  topCreators: any[];
  industryTrends: any;
}

export class ProfileAuditor {
  /**
   * Run comprehensive profile audit
   */
  async audit(profile: any, industry: string, focusAreas?: string[]): Promise<ProfileAuditResult> {
    const isCompany = profile.profileType === 'company';
    if (isCompany) {
      return this.auditCompany(profile, industry, focusAreas);
    } else {
      return this.auditPersonal(profile, industry, focusAreas);
    }
  }

  /**
   * Audit Personal LinkedIn Profile
   */
  private async auditPersonal(profile: any, industry: string, focusAreas?: string[]): Promise<ProfileAuditResult> {
    try {
      // Analyze headline
      const headlineAnalysis = await this.analyzeHeadline(profile.headline, industry);

      // Analyze About section
      const aboutAnalysis = await this.analyzeAbout(profile.about, industry);

      // Analyze banner
      const bannerAnalysis = await this.analyzeBanner(profile.bannerUrl);

      // Analyze experience
      const experienceAnalysis = await this.analyzeExperience(profile.experience, industry);

      // Analyze skills & completeness
      const skillsAnalysis = await this.analyzeSkillsAndCompleteness(profile.skills, profile.featuredPresent, profile.customUrlPresent);

      // Calculate pillar scores
      const hasProfilePic = !!(profile.profilePicUrl && profile.profilePicUrl.trim().length > 0);
      const firstImpressionScore = Math.round(
        ( (hasProfilePic ? 100 : 30) + bannerAnalysis.score + (profile.customUrlPresent ? 100 : 40) ) / 3
      );
      const headlineScore = headlineAnalysis.score;
      const summaryScore = aboutAnalysis.score;
      const seoScore = this.calculatePersonalSEOScore(profile, industry);
      const completenessScore = Math.round(
        (experienceAnalysis.score + skillsAnalysis.score + (profile.featuredPresent ? 100 : 30)) / 3
      );

      const overallScore = Math.round(
        (firstImpressionScore + headlineScore + summaryScore + seoScore + completenessScore) / 5
      );

      // Identify gaps
      const gaps = await this.identifyPersonalGaps(profile, industry, focusAreas);

      // Generate suggestions
      const suggestions: any[] = [];
      if (headlineAnalysis.suggestions) {
        headlineAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'high', section: 'headline', suggestion: s });
        });
      }
      if (aboutAnalysis.suggestions) {
        aboutAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'high', section: 'about', suggestion: s });
        });
      }
      if (experienceAnalysis.suggestions) {
        experienceAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'medium', section: 'experience', suggestion: s });
        });
      }
      if (skillsAnalysis.suggestions) {
        skillsAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'low', section: 'skills', suggestion: s });
        });
      }

      // Get top creators in industry
      const topCreators = await this.getTopCreators(industry);

      // Get industry trends
      const industryTrends = await this.getIndustryTrends(industry);

      return {
        profileType: 'personal',
        overallScore,
        seoScore,
        brandScore: Math.round((headlineScore + summaryScore) / 2),
        pillars: {
          firstImpression: {
            score: firstImpressionScore,
            status: firstImpressionScore >= 80 ? 'good' : firstImpressionScore >= 50 ? 'average' : 'critical',
            feedback: [
              hasProfilePic ? 'Profile photo is present.' : 'Profile photo is missing. Profiles with photos get up to 21x more views.',
              bannerAnalysis.score >= 70 ? 'Professional banner is present.' : 'Custom banner is missing or sub-optimal. Banners visually establish your brand.',
              profile.customUrlPresent ? 'Clean custom URL configured.' : 'Default LinkedIn URL in use. Clean it up (e.g., linkedin.com/in/yourname).'
            ]
          },
          headline: {
            score: headlineScore,
            status: headlineScore >= 80 ? 'good' : headlineScore >= 50 ? 'average' : 'critical',
            feedback: headlineAnalysis.feedback || []
          },
          summary: {
            score: summaryScore,
            status: summaryScore >= 80 ? 'good' : summaryScore >= 50 ? 'average' : 'critical',
            feedback: aboutAnalysis.feedback || []
          },
          seo: {
            score: seoScore,
            status: seoScore >= 80 ? 'good' : seoScore >= 50 ? 'average' : 'critical',
            feedback: [
              `Industry keywords density is ${seoScore >= 80 ? 'optimal' : seoScore >= 50 ? 'moderate' : 'low'} for "${industry}".`,
              profile.headline?.toLowerCase().includes(industry.toLowerCase())
                ? 'Primary industry keyword is present in your headline.'
                : 'Primary industry keyword is missing from your headline, impacting search discoverability.'
            ]
          },
          completeness: {
            score: completenessScore,
            status: completenessScore >= 80 ? 'good' : completenessScore >= 50 ? 'average' : 'critical',
            feedback: [
              experienceAnalysis.score >= 75 ? 'Experience section has professional detail.' : 'Experience descriptions are missing metrics or action verbs.',
              profile.featuredPresent ? 'Featured section is active.' : 'Featured section is inactive. Pin posts or project links to highlight credibility.',
              skillsAnalysis.score >= 70 ? 'Skills list contains targeted keywords.' : 'Add more relevant industry skills to assist recruiter search filters.'
            ]
          }
        },
        headlineAnalysis,
        aboutAnalysis,
        bannerAnalysis,
        experienceAnalysis,
        skillsAnalysis,
        gaps,
        suggestions,
        topCreators,
        industryTrends
      };
    } catch (error) {
      logger.error('Personal profile audit error:', error);
      throw error;
    }
  }

  /**
   * Audit Company LinkedIn Page
   */
  private async auditCompany(profile: any, industry: string, focusAreas?: string[]): Promise<ProfileAuditResult> {
    try {
      // Analyze tagline
      const taglineAnalysis = await this.analyzeTagline(profile.tagline, industry);

      // Analyze overview description
      const overviewAnalysis = await this.analyzeOverview(profile.description, industry);

      // Analyze banner
      const bannerAnalysis = await this.analyzeBanner(profile.bannerUrl);

      // Analyze conversion metrics
      const conversionAnalysis = await this.analyzeConversion(profile.ctaButton, profile.websiteUrl);

      // Analyze metadata completeness
      const companyDetailsAnalysis = await this.analyzeCompanyDetails(profile);

      // Calculate scores
      const hasLogo = !!(profile.profilePicUrl && profile.profilePicUrl.trim().length > 0);
      const firstImpressionScore = Math.round(
        ( (hasLogo ? 100 : 30) + bannerAnalysis.score + taglineAnalysis.score ) / 3
      );
      const taglineScore = taglineAnalysis.score;
      const overviewScore = overviewAnalysis.score;
      const seoScore = this.calculateCompanySEOScore(profile, industry);
      const detailsScore = companyDetailsAnalysis.score;

      const overallScore = Math.round(
        (firstImpressionScore + taglineScore + overviewScore + seoScore + detailsScore) / 5
      );

      // Identify gaps
      const gaps = await this.identifyCompanyGaps(profile, industry, focusAreas);

      // Generate suggestions
      const suggestions: any[] = [];
      if (taglineAnalysis.suggestions) {
        taglineAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'high', section: 'tagline', suggestion: s });
        });
      }
      if (overviewAnalysis.suggestions) {
        overviewAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'high', section: 'overview', suggestion: s });
        });
      }
      if (conversionAnalysis.suggestions) {
        conversionAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'medium', section: 'conversion', suggestion: s });
        });
      }
      if (companyDetailsAnalysis.suggestions) {
        companyDetailsAnalysis.suggestions.forEach((s: string) => {
          suggestions.push({ priority: 'low', section: 'details', suggestion: s });
        });
      }

      // Get top companies in industry
      const topCreators = await this.getTopCreators(industry);

      // Get industry trends
      const industryTrends = await this.getIndustryTrends(industry);

      return {
        profileType: 'company',
        overallScore,
        seoScore,
        brandScore: Math.round((taglineScore + overviewScore) / 2),
        pillars: {
          firstImpression: {
            score: firstImpressionScore,
            status: firstImpressionScore >= 80 ? 'good' : firstImpressionScore >= 50 ? 'average' : 'critical',
            feedback: [
              hasLogo ? 'Company logo is present.' : 'Company logo is missing. Logo increases page follow rates.',
              bannerAnalysis.score >= 70 ? 'Branded header banner image is present.' : 'Branded header image is missing or sub-optimal.',
              profile.tagline ? 'Tagline value hook is active.' : 'Tagline value hook is missing. Write a 1-sentence value statement.'
            ]
          },
          headline: {
            score: taglineScore,
            status: taglineScore >= 80 ? 'good' : taglineScore >= 50 ? 'average' : 'critical',
            feedback: taglineAnalysis.feedback || []
          },
          summary: {
            score: overviewScore,
            status: overviewScore >= 80 ? 'good' : overviewScore >= 50 ? 'average' : 'critical',
            feedback: overviewAnalysis.feedback || []
          },
          seo: {
            score: seoScore,
            status: seoScore >= 80 ? 'good' : seoScore >= 50 ? 'average' : 'critical',
            feedback: [
              `Industry keywords density is ${seoScore >= 80 ? 'optimal' : seoScore >= 50 ? 'moderate' : 'low'} for "${industry}".`,
              profile.tagline?.toLowerCase().includes(industry.toLowerCase())
                ? 'Primary industry keyword is present in your tagline.'
                : 'Primary industry keyword is missing from your tagline, affecting search discoverability.'
            ]
          },
          completeness: {
            score: detailsScore,
            status: detailsScore >= 80 ? 'good' : detailsScore >= 50 ? 'average' : 'critical',
            feedback: companyDetailsAnalysis.feedback || []
          }
        },
        taglineAnalysis,
        overviewAnalysis,
        conversionAnalysis,
        companyDetailsAnalysis,
        bannerAnalysis,
        gaps,
        suggestions,
        topCreators,
        industryTrends
      };
    } catch (e) {
      logger.error('Company page audit error:', e);
      throw e;
    }
  }

  /**
   * Analyze headline
   */
  private async analyzeHeadline(headline: string, industry: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this LinkedIn headline for a ${industry} professional:
"${headline || 'No headline provided'}"

Evaluate:
1. SEO optimization (keywords)
2. Clarity and value proposition
3. Differentiation
4. Length appropriateness

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { score: 50, feedback: ['Headline present.'], suggestions: [] };
    } catch (error) {
      logger.error('Headline analysis error:', error);
      return { score: 50, feedback: [], suggestions: [] };
    }
  }

  /**
   * Analyze About section
   */
  private async analyzeAbout(about: string, industry: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this LinkedIn About section for a ${industry} professional:
"${about || 'No About section provided'}"

Evaluate:
1. Storytelling quality
2. Value proposition clarity
3. Call-to-action presence
4. Keyword optimization
5. Readability and structure

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { score: 50, feedback: ['About section present.'], suggestions: [] };
    } catch (error) {
      logger.error('About analysis error:', error);
      return { score: 50, feedback: [], suggestions: [] };
    }
  }

  /**
   * Analyze banner image
   */
  private async analyzeBanner(bannerUrl?: string): Promise<any> {
    if (!bannerUrl || bannerUrl.trim().length === 0) {
      return {
        score: 30,
        feedback: ['No banner image detected. Adding a professional banner can significantly improve visual branding.'],
      };
    }

    try {
      if (bannerUrl.startsWith('http')) {
        const response = await axios.get(bannerUrl, { responseType: 'arraybuffer' });
        const mimeType = response.headers['content-type'];
        const data = Buffer.from(response.data).toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Analyze this LinkedIn profile banner image. Evaluate:
1. Professionalism
2. Branding clarity
3. Design quality
4. Text readability (if any)

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."]
}`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data,
            },
          },
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return { score: 70, feedback: ['Custom banner image detected. Make sure it visually asserts your brand.'] };
    } catch (error) {
      logger.error('Banner analysis error:', error);
      return {
        score: 70,
        feedback: ['Banner image present. Ensure it reflects your brand (Visual analysis skipped).'],
      };
    }
  }

  /**
   * Analyze personal experiences
   */
  private async analyzeExperience(experience: any[] | null | undefined, industry: string): Promise<any> {
    if (!experience || experience.length === 0) {
      return {
        score: 30,
        feedback: ['No experience history provided.'],
        suggestions: ['Add key roles with descriptions detailing your impact and tools used.']
      };
    }
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this list of experiences for a ${industry} professional:
${JSON.stringify(experience)}

Evaluate:
1. Role clarity and structure
2. Use of impact/action verbs
3. Quantified accomplishments/metrics
4. Keyword relevance to ${industry}

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 70, feedback: ['Experiences analyzed successfully.'], suggestions: [] };
    } catch (e) {
      logger.error('Experience analysis error:', e);
      return { score: 70, feedback: ['Experiences present.'], suggestions: [] };
    }
  }

  /**
   * Analyze personal skills
   */
  private async analyzeSkillsAndCompleteness(skills: string[] | null | undefined, featuredPresent: boolean, customUrlPresent: boolean): Promise<any> {
    const skillsCount = skills?.length || 0;
    let score = 50;
    const feedback: string[] = [];
    const suggestions: string[] = [];

    if (skillsCount >= 5) {
      score += 20;
      feedback.push(`Contains a good count of listed skills (${skillsCount}).`);
    } else {
      score += skillsCount * 3;
      feedback.push('Few skills listed. Target listing at least 5-10 core skills.');
      suggestions.push('Add more specific technical, soft, and industry-focused skills to assist recruiter discovery.');
    }

    if (featuredPresent) {
      score += 15;
      feedback.push('Featured section is active.');
    } else {
      suggestions.push('Enable the Featured section to display your best posts or portfolio pieces.');
    }

    if (customUrlPresent) {
      score += 15;
      feedback.push('Custom clean URL configured.');
    } else {
      suggestions.push('Customize your LinkedIn URL suffix to display your name clearly.');
    }

    return {
      score: Math.min(100, score),
      feedback,
      suggestions
    };
  }

  /**
   * Calculate personal SEO score
   */
  private calculatePersonalSEOScore(profile: any, industry: string): number {
    let score = 40;
    const headline = profile.headline?.toLowerCase() || '';
    const about = profile.about?.toLowerCase() || '';
    const industryLower = industry.toLowerCase();

    if (headline.includes(industryLower)) score += 20;
    if (about.includes(industryLower)) score += 20;
    if (about.length > 300) score += 10;
    if (about.length > 800) score += 10;

    return Math.min(100, score);
  }

  /**
   * Identify personal profile gaps
   */
  private async identifyPersonalGaps(profile: any, industry: string, focusAreas?: string[]): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Identify gaps in this LinkedIn profile for a ${industry} professional:
Headline: ${profile.headline || 'None'}
About: ${profile.about ? profile.about.substring(0, 500) : 'None'}
Experience: ${profile.experience ? JSON.stringify(profile.experience).substring(0, 500) : 'None'}
Skills: ${profile.skills ? profile.skills.join(', ') : 'None'}
Featured Section Present: ${profile.featuredPresent ? 'Yes' : 'No'}
Custom URL Present: ${profile.customUrlPresent ? 'Yes' : 'No'}
${focusAreas ? `Focus Areas: ${focusAreas.join(', ')}` : ''}

What important components are missing to convert profile views to connections/leads?
Return a JSON array of string gap descriptions.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return ['Profile is missing detail elements.'];
    } catch (e) {
      logger.error('Identify personal gaps error:', e);
      return [];
    }
  }

  /**
   * Analyze company page tagline
   */
  private async analyzeTagline(tagline: string | null | undefined, industry: string): Promise<any> {
    if (!tagline) {
      return {
        score: 30,
        feedback: ['No tagline configured. The tagline serves as your business elevator pitch.'],
        suggestions: ['Create a clear, brief tagline explaining who you serve and the core value you add.']
      };
    }
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this LinkedIn Company Page tagline for a company in the ${industry} industry:
"${tagline}"

Evaluate:
1. Clarity and value proposition
2. Industry keywords relevance
3. Value hook and brevity

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 70, feedback: ['Tagline analyzed.'], suggestions: [] };
    } catch (e) {
      logger.error('Analyze tagline error:', e);
      return { score: 70, feedback: ['Tagline present.'], suggestions: [] };
    }
  }

  /**
   * Analyze company page overview
   */
  private async analyzeOverview(description: string | null | undefined, industry: string): Promise<any> {
    if (!description) {
      return {
        score: 30,
        feedback: ['About Overview description is missing.'],
        suggestions: ['Write a 200-400 word description clarifying what you do, who you help, and why clients choose you.']
      };
    }
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this LinkedIn Company Page overview description in the ${industry} industry:
"${description}"

Evaluate:
1. Narrative hook and target audience callout
2. Value propositions and product/service benefits
3. Readability, paragraphs, formatting
4. Call-to-action (CTA) clarity

Return JSON:
{
  "score": 0-100,
  "feedback": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 70, feedback: ['Overview analyzed.'], suggestions: [] };
    } catch (e) {
      logger.error('Analyze overview error:', e);
      return { score: 70, feedback: ['Overview description present.'], suggestions: [] };
    }
  }

  /**
   * Analyze company page CTA / conversions
   */
  private async analyzeConversion(ctaButton: string | null | undefined, websiteUrl: string | null | undefined): Promise<any> {
    let score = 50;
    const feedback: string[] = [];
    const suggestions: string[] = [];

    if (ctaButton && ctaButton !== 'None') {
      score += 25;
      feedback.push(`Custom CTA button enabled: "${ctaButton}".`);
    } else {
      suggestions.push('Set up a custom Call to Action button (like "Visit website") instead of the default.');
    }

    if (websiteUrl) {
      score += 25;
      feedback.push(`Website URL link is active.`);
    } else {
      suggestions.push('Provide a valid link to your company website or landing page.');
    }

    return {
      score: Math.min(100, score),
      feedback,
      suggestions
    };
  }

  /**
   * Analyze company page details metadata
   */
  private async analyzeCompanyDetails(profile: any): Promise<any> {
    let score = 60;
    const feedback: string[] = [];
    const suggestions: string[] = [];

    if (profile.companySize) {
      score += 20;
      feedback.push('Company size details are set.');
    } else {
      suggestions.push('Add your company size range to assist candidate and lead targeting.');
    }

    if (profile.websiteUrl) {
      score += 20;
      feedback.push('External website references are configured.');
    }

    return {
      score: Math.min(100, score),
      feedback,
      suggestions
    };
  }

  /**
   * Calculate company SEO score
   */
  private calculateCompanySEOScore(profile: any, industry: string): number {
    let score = 40;
    const tagline = profile.tagline?.toLowerCase() || '';
    const description = profile.description?.toLowerCase() || '';
    const industryLower = industry.toLowerCase();

    if (tagline.includes(industryLower)) score += 30;
    if (description.includes(industryLower)) score += 30;

    return Math.min(100, score);
  }

  /**
   * Identify company page gaps
   */
  private async identifyCompanyGaps(profile: any, industry: string, focusAreas?: string[]): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Identify gaps in this LinkedIn Company Page for a business in the ${industry} industry:
Tagline: ${profile.tagline || 'None'}
Description: ${profile.description ? profile.description.substring(0, 500) : 'None'}
CTA Button: ${profile.ctaButton || 'None'}
Website URL: ${profile.websiteUrl || 'None'}
Company Size: ${profile.companySize || 'None'}
${focusAreas ? `Focus Areas: ${focusAreas.join(', ')}` : ''}

What brand elements, core details, or lead capture paths are missing from this company page?
Return a JSON array of string gap descriptions.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return ['Company page is missing detail items.'];
    } catch (e) {
      logger.error('Identify company gaps error:', e);
      return [];
    }
  }

  /**
   * Get top creators in industry
   */
  async getTopCreators(industry: string): Promise<any[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `List 5 top LinkedIn accounts (creators or companies) in the ${industry} industry.

For each, provide:
- Name
- What they do well
- Their content style
- Key takeaways for others

Return JSON array.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Get top creators error:', error);
      return [];
    }
  }

  /**
   * Get industry trends
   */
  async getIndustryTrends(industry: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `What are the current LinkedIn content trends for ${industry} in 2026?

Include:
1. Popular content formats
2. Trending topics
3. Successful post structures
4. Visual trends
5. Engagement strategies

Return JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error) {
      logger.error('Get industry trends error:', error);
      return {};
    }
  }

  /**
   * Generate headline variations
   */
  async generateHeadlines(currentHeadline: string, industry: string, focus?: string): Promise<any[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Generate 5 LinkedIn headline variations for a ${industry} professional.

Current headline: "${currentHeadline}"
${focus ? `Focus area: ${focus}` : ''}

Create:
- 2 SEO-optimized headlines (keyword-rich)
- 2 brand-focused headlines (unique value proposition)
- 1 hybrid headline

Return JSON array with type and headline.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Generate headlines error:', error);
      return [];
    }
  }

  /**
   * Generate About section
   */
  async generateAbout(persona: string, achievements: string[], targetAudience: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Write a compelling LinkedIn About section:

Persona: ${persona}
Key Achievements: ${achievements.join(', ')}
Target Audience: ${targetAudience}

Requirements:
- Start with a hook
- Tell a story
- Include achievements
- End with a CTA
- 200-300 words
- Professional but authentic tone`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Generate about error:', error);
      return '';
    }
  }
}
