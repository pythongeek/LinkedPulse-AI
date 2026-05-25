import { GoogleGenerativeAI } from '@google/generative-ai';
import { RealPost, CompetitorBenchmark } from './realCompetitorResearch';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type GapType = 'angle' | 'format' | 'audience' | 'recency' | 'data' | 'depth';

export interface ContentGap {
  id: string;
  type: GapType;
  title: string;
  problem: string;           // What the current content landscape is missing
  opportunity: string;       // Why this gap is worth filling
  priorityScore: number;     // 0–100 (higher = more urgent)
  suggestedFormat: string;
  suggestedHookFormula: string;
  competitionLevel: 'low' | 'medium' | 'high';
  estimatedEngagementLift: string;
}

export interface ContentBrief {
  gapId: string;
  headline: string;
  angle: string;
  openingHook: string;
  keyPoints: string[];
  uniqueDataAngle: string;
  ctaType: string;
  recommendedFormat: string;
  whyItWins: string;
}

export class GapAnalysisEngine {
  /**
   * Identify structured, typed gaps from real competitor signals.
   * Uses Gemini Google Search on 'deep' mode for extra grounding.
   */
  async identifyGaps(
    posts: RealPost[],
    benchmark: CompetitorBenchmark,
    communitySignal: { hotDiscussions: string[]; painPoints: string[]; commonQuestions: string[] },
    topic: string,
    depth: 'quick' | 'deep'
  ): Promise<ContentGap[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: depth === 'deep' ? [{ googleSearch: {} } as any] : [],
      });

      const postsContext = posts.slice(0, 15).map(p =>
        `Format: ${p.format} | Angle: "${p.angle}" | Hook: "${p.hook}" | Engagement: ${p.estimatedLikes} likes | Author: ${p.authorType}`
      ).join('\n');

      const prompt = `You are a LinkedIn content strategist performing a competitive gap analysis for: "${topic}".

EXISTING CONTENT LANDSCAPE (${posts.length} real posts found via Google Search):
${postsContext || 'No posts scraped — use Google Search grounding to research this topic now.'}

DOMINANT FORMATS: ${benchmark.dominantFormats.map(f => `${f.format} (${f.sharePercent}%)`).join(', ') || 'Unknown'}
SATURATED ANGLES: ${benchmark.saturatedAngles.join(', ') || 'None identified'}
RISING ANGLES: ${benchmark.risingAngles.join(', ') || 'None identified'}
COMMUNITY PAIN POINTS: ${communitySignal.painPoints.join(', ') || 'None'}
UNANSWERED QUESTIONS: ${communitySignal.commonQuestions.join(', ') || 'None'}

TASK: Identify exactly 6 high-value content gaps across these specific categories:
- "angle": A unique perspective NOBODY is currently taking on this topic
- "format": A content FORMAT underused for this topic (e.g. no one is doing polls/carousels about it)
- "audience": A specific professional SEGMENT being completely ignored
- "recency": Outdated content that desperately needs a 2025/2026 update with fresh data
- "data": A claim everyone makes but NOBODY backs with real statistics or research
- "depth": A surface-level topic that deserves a deep-dive 10-minute read

For each gap, calculate a priorityScore (0–100) weighted by:
- Frequency of community questions about this (30%)
- Low competition for this angle (25%)
- Potential engagement based on format (25%)
- Relevance to current LinkedIn algorithm trends (20%)

Return JSON array ONLY — no prose:
[
  {
    "id": "gap_001",
    "type": "angle",
    "title": "Short memorable name for this gap",
    "problem": "What is currently missing from the content landscape — be specific (1 sentence)",
    "opportunity": "Why filling this gap wins on LinkedIn — be specific (1 sentence)",
    "priorityScore": 87,
    "suggestedFormat": "carousel",
    "suggestedHookFormula": "statistic",
    "competitionLevel": "low",
    "estimatedEngagementLift": "2–3× above baseline for this niche"
  }
]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const gaps: ContentGap[] = JSON.parse(jsonMatch[0]);
        return gaps
          .filter(g => g.id && g.type && g.priorityScore >= 0)
          .sort((a, b) => b.priorityScore - a.priorityScore);
      }
      return [];
    } catch (error) {
      logger.error('GapAnalysisEngine.identifyGaps error:', error);
      return [];
    }
  }

  /**
   * Generate an actionable content brief for each top gap.
   * Uses Gemini Google Search for real data enrichment.
   */
  async generateBriefs(gaps: ContentGap[], topic: string): Promise<ContentBrief[]> {
    if (gaps.length === 0) return [];
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const topGaps = gaps.slice(0, 4); // brief only top 4

      const prompt = `For each content gap about "${topic}", write a punchy LinkedIn content brief a ghostwriter can execute immediately.

GAPS:
${JSON.stringify(topGaps, null, 2)}

Use Google Search to find any real statistics or data points that could make the "uniqueDataAngle" genuinely compelling.

Return JSON array ONLY:
[
  {
    "gapId": "gap_001",
    "headline": "Post title — specific, not generic",
    "angle": "The single sentence describing the unique perspective",
    "openingHook": "First 210 characters — scroll-stopping, specific, not generic",
    "keyPoints": ["Point 1 with specific claim", "Point 2 with data if possible", "Point 3 actionable"],
    "uniqueDataAngle": "The one stat or finding that makes this post undeniable",
    "ctaType": "comment",
    "recommendedFormat": "carousel",
    "whyItWins": "One sentence on why this angle beats what's already out there"
  }
]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch (error) {
      logger.error('GapAnalysisEngine.generateBriefs error:', error);
      return [];
    }
  }
}
