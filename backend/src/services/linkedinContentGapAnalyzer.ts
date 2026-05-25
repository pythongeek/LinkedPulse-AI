import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiSearchService } from './geminiSearchService';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ContentGap {
  gap: string;
  rationale: string;
  suggestedHook: string;
  suggestedFormat: 'post' | 'carousel' | 'article' | 'poll';
  estimatedEngagement: 'high' | 'medium' | 'low';
  competitorScore: number; // 0-100, how saturated is this gap
  uniquenessScore: number; // 0-100, how differentiated your content could be
}

export interface GapAnalysisResult {
  topic: string;
  totalGapsFound: number;
  topGaps: ContentGap[];
  saturatedAngles: string[];       // What NOT to write about
  emergingAngles: string[];        // Fastest growing underserved angles
  audienceQuestions: string[];     // Real questions people are asking
  contentCalendarSuggestions: Array<{
    week: number;
    contentIdea: string;
    format: string;
    hook: string;
  }>;
}

export class LinkedInContentGapAnalyzer {
  private searchService = new GeminiSearchService();

  async analyzeGaps(topic: string, userPersonaContext?: string): Promise<GapAnalysisResult> {
    logger.info(`[ContentGapAnalyzer] Analyzing gaps for: ${topic}`);

    const [linkedinPosts, generalContent] = await Promise.allSettled([
      this.searchService.searchLinkedInContext(topic),
      this.searchService.researchTopic(topic, 10),
    ]);

    const liPosts = linkedinPosts.status === 'fulfilled' ? linkedinPosts.value : [];
    const content = generalContent.status === 'fulfilled' ? generalContent.value : [];

    const coveredAngles = await this.identifyCoveredAngles(liPosts, content, topic);
    const gaps = await this.identifyGaps(topic, coveredAngles, userPersonaContext);
    const calendar = await this.generateContentCalendar(topic, gaps.topGaps);

    return {
      topic,
      totalGapsFound: gaps.topGaps.length,
      ...gaps,
      contentCalendarSuggestions: calendar,
    };
  }

  private async identifyCoveredAngles(linkedinPosts: any[], generalContent: any[], topic: string): Promise<string[]> {
    const allContent = [...linkedinPosts, ...generalContent];
    if (allContent.length === 0) return [];

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const titles = allContent.map(c => c.title).join('\n');

    try {
      const result = await model.generateContent(
        `These are titles of content already published about "${topic}":
${titles}

List the 10 specific angles/narratives that are ALREADY heavily covered.
Return ONLY a JSON array of strings.`
      );
      const text = result.response.text();
      const json = text.match(/\[[\s\S]*\]/)?.[0];
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  private async identifyGaps(
    topic: string,
    coveredAngles: string[],
    personaContext?: string
  ): Promise<Omit<GapAnalysisResult, 'topic' | 'totalGapsFound' | 'contentCalendarSuggestions'>> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} } as any],
    });

    const personaPrompt = personaContext
      ? `The content creator is a ${personaContext}.`
      : 'The content creator is a LinkedIn B2B thought leader.';

    try {
      const result = await model.generateContent(
        `${personaPrompt}

Topic: "${topic}"

Content angles ALREADY heavily covered (avoid these):
${coveredAngles.slice(0, 10).join('\n')}

Using your Google Search access, find:
1. Questions professionals are asking about "${topic}" that aren't being answered
2. New developments, research, or angles that haven't been written about yet
3. Contrarian perspectives that challenge conventional wisdom
4. Tactical how-to content that is missing
5. Data-driven angles that are underexplored

Evaluate each gap by how saturated (0=empty, 100=very competitive) and unique (0-100) it is.

Return JSON:
{
  "topGaps": [
    {
      "gap": "specific content angle",
      "rationale": "why this is a gap",
      "suggestedHook": "opening line for a LinkedIn post",
      "suggestedFormat": "post|carousel|article|poll",
      "estimatedEngagement": "high|medium|low",
      "competitorScore": 0-100,
      "uniquenessScore": 0-100
    }
  ],
  "saturatedAngles": ["angle already overdone 1"],
  "emergingAngles": ["fastest growing underserved angle 1"],
  "audienceQuestions": ["real question from professionals 1"]
}`
      );
      const text = result.response.text();
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      const parsed = json ? JSON.parse(json) : {};

      return {
        topGaps: (parsed.topGaps || []).slice(0, 8),
        saturatedAngles: parsed.saturatedAngles || [],
        emergingAngles: parsed.emergingAngles || [],
        audienceQuestions: parsed.audienceQuestions || [],
      };
    } catch (error) {
      logger.error('Gap analysis error:', error);
      return { topGaps: [], saturatedAngles: [], emergingAngles: [], audienceQuestions: [] };
    }
  }

  private async generateContentCalendar(
    topic: string,
    gaps: ContentGap[]
  ): Promise<GapAnalysisResult['contentCalendarSuggestions']> {
    if (gaps.length === 0) return [];

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const gapSummary = gaps.slice(0, 6).map(g => `Gap: ${g.gap} | Format: ${g.suggestedFormat} | Hook: ${g.suggestedHook}`).join('\n');

    try {
      const result = await model.generateContent(
        `Create a 4-week LinkedIn content calendar for the topic "${topic}" using these identified content gaps:

${gapSummary}

Each week should have one main post. Vary the formats.
Optimize posting for Tuesday, Wednesday, and Thursday (highest LinkedIn engagement days).

Return JSON array:
[
  {
    "week": 1,
    "contentIdea": "specific post concept",
    "format": "post|carousel|article|poll",
    "hook": "opening line"
  }
]`
      );
      const text = result.response.text();
      const json = text.match(/\[[\s\S]*\]/)?.[0];
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }
}
