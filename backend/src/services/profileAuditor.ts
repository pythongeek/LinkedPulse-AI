import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ProfileAuditResult {
  overallScore: number;
  seoScore: number;
  brandScore: number;
  headlineAnalysis: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  aboutAnalysis: {
    score: number;
    feedback: string[];
    suggestions: string[];
  };
  bannerAnalysis: {
    score: number;
    feedback: string[];
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
    try {
      // Analyze headline
      const headlineAnalysis = await this.analyzeHeadline(profile.headline, industry);

      // Analyze About section
      const aboutAnalysis = await this.analyzeAbout(profile.about, industry);

      // Analyze banner
      const bannerAnalysis = await this.analyzeBanner(profile.bannerUrl);

      // Calculate scores
      const seoScore = this.calculateSEOScore(profile, industry);
      const brandScore = this.calculateBrandScore(headlineAnalysis, aboutAnalysis);
      const overallScore = Math.round((seoScore + brandScore + headlineAnalysis.score + aboutAnalysis.score + bannerAnalysis.score) / 5);

      // Identify gaps
      const gaps = await this.identifyGaps(profile, industry, focusAreas);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(profile, headlineAnalysis, aboutAnalysis, industry);

      // Get top creators in industry
      const topCreators = await this.getTopCreators(industry);

      // Get industry trends
      const industryTrends = await this.getIndustryTrends(industry);

      return {
        overallScore,
        seoScore,
        brandScore,
        headlineAnalysis,
        aboutAnalysis,
        bannerAnalysis,
        gaps,
        suggestions,
        topCreators,
        industryTrends,
      };
    } catch (error) {
      logger.error('Profile audit error:', error);
      throw error;
    }
  }

  /**
   * Analyze headline
   */
  private async analyzeHeadline(headline: string, industry: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { score: 50, feedback: [], suggestions: [] };
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { score: 50, feedback: [], suggestions: [] };
    } catch (error) {
      logger.error('About analysis error:', error);
      return { score: 50, feedback: [], suggestions: [] };
    }
  }

  /**
   * Analyze banner image
   */
  private async analyzeBanner(bannerUrl?: string): Promise<any> {
    if (!bannerUrl) {
      return {
        score: 0,
        feedback: ['No banner image detected. Adding a professional banner can significantly improve your profile.'],
      };
    }

    try {
      // Fetch image
      const response = await axios.get(bannerUrl, { responseType: 'arraybuffer' });
      const mimeType = response.headers['content-type'];
      const data = Buffer.from(response.data).toString('base64');

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Analyze this LinkedIn profile banner image.

Evaluate:
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

      return {
        score: 70,
        feedback: ['Banner image analyzed but could not parse details. Ensure it is professional.'],
      };
    } catch (error) {
      logger.error('Banner analysis error:', error);
      return {
        score: 70,
        feedback: ['Banner image present. Ensure it reflects your personal brand. (Analysis failed)'],
      };
    }
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(profile: any, industry: string): number {
    let score = 50;

    // Check headline keywords
    if (profile.headline?.toLowerCase().includes(industry.toLowerCase())) {
      score += 15;
    }

    // Check About section length
    if (profile.about && profile.about.length > 500) {
      score += 15;
    }

    // Check for keywords in About
    const keywords = [industry, 'expert', 'specialist', 'leader', 'manager'];
    const aboutLower = profile.about?.toLowerCase() || '';
    const keywordMatches = keywords.filter((k) => aboutLower.includes(k.toLowerCase())).length;
    score += Math.min(20, keywordMatches * 5);

    return Math.min(100, score);
  }

  /**
   * Calculate brand score
   */
  private calculateBrandScore(headlineAnalysis: any, aboutAnalysis: any): number {
    return Math.round((headlineAnalysis.score + aboutAnalysis.score) / 2);
  }

  /**
   * Identify profile gaps
   */
  private async identifyGaps(profile: any, industry: string, focusAreas?: string[]): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Identify gaps in this LinkedIn profile for a ${industry} professional:

Headline: ${profile.headline || 'None'}
About: ${profile.about ? profile.about.substring(0, 500) : 'None'}
${focusAreas ? `Focus Areas: ${focusAreas.join(', ')}` : ''}

What important elements are missing or could be improved?

Return a JSON array of gap descriptions.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      logger.error('Identify gaps error:', error);
      return [];
    }
  }

  /**
   * Generate improvement suggestions
   */
  private async generateSuggestions(
    profile: any,
    headlineAnalysis: any,
    aboutAnalysis: any,
    industry: string
  ): Promise<any[]> {
    const suggestions: any[] = [];

    // Headline suggestions
    if (headlineAnalysis.suggestions) {
      headlineAnalysis.suggestions.forEach((s: string) => {
        suggestions.push({
          priority: 'high',
          section: 'headline',
          suggestion: s,
        });
      });
    }

    // About suggestions
    if (aboutAnalysis.suggestions) {
      aboutAnalysis.suggestions.forEach((s: string) => {
        suggestions.push({
          priority: 'high',
          section: 'about',
          suggestion: s,
        });
      });
    }

    return suggestions;
  }

  /**
   * Get top creators in industry
   */
  async getTopCreators(industry: string): Promise<any[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `List 5 top LinkedIn creators in the ${industry} industry.

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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `What are the current LinkedIn content trends for ${industry} professionals in 2025?

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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
