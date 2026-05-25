import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface RealPost {
  title: string;
  excerpt: string;
  estimatedLikes: number;
  estimatedComments: number;
  format: 'post' | 'carousel' | 'article' | 'poll' | 'video';
  hook: string;
  angle: string;
  authorName?: string;
  authorType: 'thought_leader' | 'brand' | 'practitioner' | 'agency';
  url?: string;
  source: 'google_grounding' | 'community_signal';
}

export interface CompetitorBenchmark {
  topicNiche: string;
  estimatedPostsPerWeek: number;
  avgEngagement: { likes: number; comments: number; shares: number };
  dominantFormats: Array<{ format: string; sharePercent: number }>;
  topCreators: Array<{ name: string; style: string; strength: string }>;
  risingAngles: string[];
  saturatedAngles: string[];
  dataGaps: string[];
}

export class RealCompetitorResearch {
  /**
   * Phase A: Collect real signals via Gemini Google Search Grounding.
   * Returns synthesised competitor post proxies from live web results.
   */
  async collectSignals(topic: string, depth: 'quick' | 'deep'): Promise<RealPost[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const postCount = depth === 'deep' ? 20 : 10;

      const prompt = `
Search LinkedIn, Reddit (r/linkedin, r/marketing, r/b2b, r/saas), and Google for the top-performing content about: "${topic}".

Find real posts, articles, or discussions that are performing well. For each result, extract:
- What specific angle or perspective is the author taking?
- What format are they using (text post, carousel, poll, article, video)?
- What is the opening hook or headline?
- Estimate engagement level (likes/comments) based on any visible signals in snippets
- What is the author's real name or brand name?
- What is their creator type? (thought_leader, brand, practitioner, agency)

Find ${postCount} distinct pieces of content. Base your analysis on actual search results you find.

Return JSON ONLY — no prose before or after:
{
  "posts": [
    {
      "title": "Specific content title or opening line",
      "excerpt": "What the content covers in 1-2 sentences",
      "estimatedLikes": 250,
      "estimatedComments": 45,
      "format": "carousel",
      "hook": "The opening line or headline",
      "angle": "The specific perspective being argued",
      "authorName": "Real Name of Creator",
      "authorType": "thought_leader",
      "url": "https://...",
      "source": "google_grounding"
    }
  ],
  "benchmark": {
    "topicNiche": "${topic}",
    "estimatedPostsPerWeek": 150,
    "dominantFormats": [{"format":"carousel","sharePercent":40}],
    "risingAngles": ["angle1", "angle2"],
    "saturatedAngles": ["angle3", "angle4"],
    "topCreators": [{"name":"Creator Name","style":"analytical","strength":"data-driven frameworks"}]
  }
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.posts || []).slice(0, postCount);
      }
      return [];
    } catch (error) {
      logger.error('RealCompetitorResearch.collectSignals error:', error);
      return [];
    }
  }

  /**
   * Phase A extended: Extract benchmark from collected posts
   * and also grab structured benchmark from the search result.
   */
  async collectSignalsWithBenchmark(
    topic: string,
    depth: 'quick' | 'deep'
  ): Promise<{ posts: RealPost[]; rawBenchmark: Partial<CompetitorBenchmark> }> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const postCount = depth === 'deep' ? 20 : 10;

      const prompt = `
Search LinkedIn, Reddit (r/linkedin, r/marketing, r/b2b, r/saas), and Google for the top-performing content about: "${topic}".

Find ${postCount} distinct real pieces of content. Analyze:
- Format distribution (what percentage use carousel vs post vs article vs poll)
- Rising angles (perspectives gaining traction)
- Saturated angles (overdone, everyone says this)
- Top creators in this niche (their style and strength)

Return JSON ONLY:
{
  "posts": [
    {
      "title": "Specific content title or opening line",
      "excerpt": "What the content covers in 1-2 sentences",
      "estimatedLikes": 250,
      "estimatedComments": 45,
      "format": "carousel",
      "hook": "The opening line or headline",
      "angle": "The specific perspective being argued",
      "authorName": "Real Name of Creator",
      "authorType": "thought_leader",
      "url": "https://...",
      "source": "google_grounding"
    }
  ],
  "benchmark": {
    "dominantFormats": [{"format":"carousel","sharePercent":40},{"format":"post","sharePercent":35}],
    "risingAngles": ["rising angle 1", "rising angle 2"],
    "saturatedAngles": ["tired angle 1", "tired angle 2"],
    "topCreators": [{"name":"Creator Name","style":"analytical","strength":"data-driven frameworks"}],
    "estimatedPostsPerWeek": 150
  }
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          posts: (parsed.posts || []).slice(0, postCount),
          rawBenchmark: parsed.benchmark || {},
        };
      }
      return { posts: [], rawBenchmark: {} };
    } catch (error) {
      logger.error('RealCompetitorResearch.collectSignalsWithBenchmark error:', error);
      return { posts: [], rawBenchmark: {} };
    }
  }

  /**
   * Phase A (extended): Reddit/forum community signal via Gemini Search Grounding.
   */
  async collectCommunitySignal(topic: string): Promise<{
    hotDiscussions: string[];
    painPoints: string[];
    commonQuestions: string[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  }> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `
Search Reddit, Quora, and professional forums for real discussions about: "${topic}".

Based on actual search results you find, identify:
1. What are people actively debating or asking about this topic RIGHT NOW?
2. What pain points do professionals have related to this topic?
3. What common questions remain unanswered by existing content?
4. What is the general community sentiment (positive enthusiasm, negative frustration, neutral interest, mixed)?

Return JSON ONLY:
{
  "hotDiscussions": ["specific discussion topic 1", "specific discussion topic 2"],
  "painPoints": ["specific pain point 1", "specific pain point 2"],
  "commonQuestions": ["specific question 1", "specific question 2"],
  "sentiment": "mixed"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { hotDiscussions: [], painPoints: [], commonQuestions: [], sentiment: 'neutral' };
    } catch (error) {
      logger.error('Community signal error:', error);
      return { hotDiscussions: [], painPoints: [], commonQuestions: [], sentiment: 'neutral' };
    }
  }

  /**
   * Phase B: Extract and compute benchmark data from collected posts.
   */
  extractBenchmarks(posts: RealPost[], topic: string, rawBenchmark: Partial<CompetitorBenchmark> = {}): CompetitorBenchmark {
    if (posts.length === 0) {
      return {
        topicNiche: topic,
        estimatedPostsPerWeek: rawBenchmark.estimatedPostsPerWeek ?? 0,
        avgEngagement: { likes: 0, comments: 0, shares: 0 },
        dominantFormats: rawBenchmark.dominantFormats ?? [],
        topCreators: rawBenchmark.topCreators ?? [],
        risingAngles: rawBenchmark.risingAngles ?? [],
        saturatedAngles: rawBenchmark.saturatedAngles ?? [],
        dataGaps: [],
      };
    }

    const avgLikes = Math.round(posts.reduce((s, p) => s + p.estimatedLikes, 0) / posts.length);
    const avgComments = Math.round(posts.reduce((s, p) => s + p.estimatedComments, 0) / posts.length);

    // Compute format distribution from posts
    const formatCounts: Record<string, number> = {};
    posts.forEach(p => { formatCounts[p.format] = (formatCounts[p.format] || 0) + 1; });
    const computedFormats = Object.entries(formatCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([format, count]) => ({
        format,
        sharePercent: Math.round((count / posts.length) * 100),
      }));

    return {
      topicNiche: topic,
      estimatedPostsPerWeek: rawBenchmark.estimatedPostsPerWeek ?? posts.length * 7,
      avgEngagement: {
        likes: avgLikes,
        comments: avgComments,
        shares: Math.round(avgLikes * 0.1),
      },
      dominantFormats: rawBenchmark.dominantFormats?.length ? rawBenchmark.dominantFormats : computedFormats,
      topCreators: rawBenchmark.topCreators ?? [],
      risingAngles: rawBenchmark.risingAngles ?? [],
      saturatedAngles: rawBenchmark.saturatedAngles ?? [],
      dataGaps: [],
    };
  }
}
