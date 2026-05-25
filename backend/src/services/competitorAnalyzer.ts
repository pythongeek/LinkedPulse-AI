import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIClient } from './minimax';
import { LinkedInDataFetcher, RealPostData } from './linkedInDataFetcher';
import { RealCompetitorResearch, CompetitorBenchmark as RealBenchmark } from './realCompetitorResearch';
import { GapAnalysisEngine } from './gapAnalysisEngine';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ── Output Schema ──────────────────────────────────────────────

export interface EnrichedPost {
  author: string;
  authorProfile: string;
  authorFollowers: number;
  authorJobTitle: string;
  content: string;
  hookText: string;
  contentFormat: 'text' | 'carousel' | 'poll' | 'article' | 'video';
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;           // (likes+comments)/followers * 100
  viralScore: number;               // engagementRate / topicAvgEngagementRate
  wordCount: number;
  emojiCount: number;
  hashtagsUsed: string[];
  hasMedia: boolean;
  hasLink: boolean;
  ctaPresent: boolean;
  dayOfWeek: number;
  hourPosted: number;
  postUrl: string;
  postedAt: string | null;
  dataSource: string;
}

export interface ShareOfVoice {
  author: string;
  authorProfile: string;
  postCount: number;
  sharePercent: number;             // % of total analyzed posts
  avgEngagement: number;
  topPost: EnrichedPost;
}

export interface FormatBreakdown {
  format: string;
  count: number;
  percent: number;
  avgLikes: number;
  avgComments: number;
  topPerformer: EnrichedPost | null;
}

export interface PostingPatterns {
  byDayOfWeek: { day: string; avgEngagement: number; postCount: number }[];
  byHour: { hour: number; avgEngagement: number; postCount: number }[];
  bestDay: string;
  bestHour: number;
  avgPostsPerWeek: number;
}

export interface HashtagIntelligence {
  tag: string;
  frequency: number;
  avgEngagementWhenUsed: number;
  trendDirection: 'rising' | 'stable' | 'declining';
}

export interface ContentGap {
  title: string;
  description: string;
  opportunityScore: number;       // 0-100
  suggestedAngle: string;
  estimatedEngagementLift: string;
  contentFormat: string;
}

export interface CompetitorAnalysis {
  // Raw counts
  totalPostsAnalyzed: number;
  dataSource: string;             // 'google_search' | 'ai_synthesis' | 'hybrid'
  analyzedAt: string;

  // Engagement benchmarks
  avgEngagement: { likes: number; comments: number; shares: number };
  medianEngagement: { likes: number; comments: number };
  topPercentileThreshold: number; // engagement score to be in top 10%
  engagementBenchmark: 'below' | 'average' | 'above' | 'viral';

  // Share of Voice
  shareOfVoice: ShareOfVoice[];

  // Format intelligence
  formatBreakdown: FormatBreakdown[];
  topFormat: string;

  // Posting patterns
  postingPatterns: PostingPatterns;

  // Hashtag intelligence
  hashtagIntelligence: HashtagIntelligence[];
  topHashtags: string[];

  // Viral post analysis
  viralPosts: EnrichedPost[];     // top 5 by viral score
  viralPatterns: {
    commonHooks: string[];
    commonFormats: string[];
    commonCTAs: string[];
    avgWordCount: number;
    emojiUsage: string;
  };

  // Gap analysis (the core value)
  contentGaps: ContentGap[];
  opportunities: string[];

  // Competitive threats
  threats: string[];

  // Raw posts (top 20 for display)
  topPosts: EnrichedPost[];
  allPosts: EnrichedPost[];
}

// ── Analyzer ───────────────────────────────────────────────────

export class CompetitorAnalyzer {
  private minimax = new AIClient();
  private fetcher = new LinkedInDataFetcher();

  // Phase 0: Collect signals
  async generatePhase0(topic: string, depth: 'quick' | 'deep'): Promise<any> {
    logger.info(`[CompetitorAnalyzer Phase 0] Collecting signals for: "${topic}"`);
    const realResearch = new RealCompetitorResearch();
    
    const [realSignalResult, communitySignal] = await Promise.all([
      realResearch.collectSignalsWithBenchmark(topic, depth),
      realResearch.collectCommunitySignal(topic),
    ]);
    
    return {
      realSignalResult,
      communitySignal,
    };
  }

  // Phase 1: Gap Analysis
  async generatePhase1(topic: string, depth: 'quick' | 'deep', intermediateResult: any): Promise<any> {
    logger.info(`[CompetitorAnalyzer Phase 1] Identifying gaps for: "${topic}"`);
    const { realSignalResult, communitySignal } = intermediateResult;
    const realResearch = new RealCompetitorResearch();
    const gapEngine = new GapAnalysisEngine();
    
    const { posts: realPosts, rawBenchmark } = realSignalResult;
    const realBenchmark = realResearch.extractBenchmarks(realPosts, topic, rawBenchmark);
    
    const [structuredGaps, legacyGapAnalysis] = await Promise.all([
      gapEngine.identifyGaps(realPosts, realBenchmark, communitySignal, topic, depth),
      this.runGapAnalysis([], topic, depth),
    ]);
    
    return {
      ...intermediateResult,
      realBenchmark,
      structuredGaps,
      legacyGapAnalysis,
    };
  }

  // Phase 2: Content Briefs & LinkedIn Fetch
  async generatePhase2(topic: string, depth: 'quick' | 'deep', intermediateResult: any): Promise<any> {
    logger.info(`[CompetitorAnalyzer Phase 2] Generating briefs for: "${topic}"`);
    const gapEngine = new GapAnalysisEngine();
    const { structuredGaps } = intermediateResult;
    
    const contentBriefs = await gapEngine.generateBriefs(structuredGaps, topic);
    
    const limit = depth === 'deep' ? 40 : 20;
    const fetchedPosts = await this.fetcher.searchLinkedInPosts(topic, limit).catch(() => []);
    
    return {
      ...intermediateResult,
      contentBriefs,
      fetchedPosts,
    };
  }

  // Phase 3: Enrich & Final Analysis
  async generatePhase3(existingPosts: any[], topic: string, depth: 'quick' | 'deep', intermediateResult: any): Promise<CompetitorAnalysis> {
    logger.info(`[CompetitorAnalyzer Phase 3] Finalizing analysis for: "${topic}"`);
    const { realSignalResult, communitySignal, realBenchmark, structuredGaps, legacyGapAnalysis, contentBriefs, fetchedPosts } = intermediateResult;
    const { posts: realPosts } = realSignalResult;
    
    const rawPosts = [...existingPosts, ...fetchedPosts];
    const enrichedPosts = await this.enrichPosts(
      [
        ...realPosts.map((rp: any) => ({
          author: rp.authorName || rp.authorType || 'LinkedIn Creator',
          authorProfile: rp.url || '',
          content: `${rp.hook}\n\n${rp.excerpt}`,
          contentFormat: rp.format,
          likes: rp.estimatedLikes,
          comments: rp.estimatedComments,
          shares: 0,
          dataSource: rp.source,
        })),
        ...rawPosts,
      ],
      topic
    );

    const [
      shareOfVoice,
      formatBreakdown,
      postingPatterns,
      hashtagIntelligence,
      viralAnalysis,
    ] = await Promise.all([
      this.analyzeShareOfVoice(enrichedPosts),
      this.analyzeFormats(enrichedPosts),
      this.analyzePostingPatterns(enrichedPosts),
      this.analyzeHashtags(enrichedPosts),
      this.analyzeViralPatterns(enrichedPosts, topic),
    ]);

    const avgLikes = this.mean(enrichedPosts.map((p: any) => p.likes));
    const avgComments = this.mean(enrichedPosts.map((p: any) => p.comments));
    const topPercentile = this.percentile(enrichedPosts.map((p: any) => p.likes + p.comments), 90);

    return {
      totalPostsAnalyzed: enrichedPosts.length,
      dataSource: realPosts.length > 0 ? 'google_grounding' : 'ai_synthesis',
      analyzedAt: new Date().toISOString(),
      avgEngagement: {
        likes: realBenchmark.avgEngagement.likes || Math.round(avgLikes),
        comments: realBenchmark.avgEngagement.comments || Math.round(avgComments),
        shares: realBenchmark.avgEngagement.shares,
      },
      medianEngagement: {
        likes: this.median(enrichedPosts.map((p: any) => p.likes)),
        comments: this.median(enrichedPosts.map((p: any) => p.comments)),
      },
      topPercentileThreshold: topPercentile,
      engagementBenchmark: avgLikes > topPercentile * 0.5 ? 'above' : 'average',
      shareOfVoice,
      formatBreakdown,
      topFormat: realBenchmark.dominantFormats[0]?.format || formatBreakdown[0]?.format || 'text',
      postingPatterns,
      hashtagIntelligence,
      topHashtags: hashtagIntelligence.slice(0, 10).map((h: any) => h.tag),
      viralPosts: enrichedPosts
        .sort((a: any, b: any) => b.viralScore - a.viralScore)
        .slice(0, 5),
      viralPatterns: viralAnalysis.patterns,
      contentGaps: structuredGaps.length > 0 ? structuredGaps as any : legacyGapAnalysis.gaps,
      opportunities: contentBriefs.length > 0 ? contentBriefs.map((b: any) => `${b.headline}: ${b.whyItWins}`) : legacyGapAnalysis.opportunities,
      threats: legacyGapAnalysis.threats,
      topPosts: enrichedPosts
        .sort((a: any, b: any) => (b.likes + b.comments) - (a.likes + a.comments))
        .slice(0, 20),
      allPosts: enrichedPosts,
      benchmark: realBenchmark,
      communitySignal,
      structuredGaps,
      contentBriefs,
      isGrounded: realPosts.length > 0,
    } as any;
  }

  async analyze(
    existingPosts: any[],
    topic: string,
    depth: 'quick' | 'deep'
  ): Promise<CompetitorAnalysis> {
    logger.info(`[CompetitorAnalyzer] Running ${depth} analysis for: "${topic}"`);

    // Phase A: Collect real signals via Gemini Google Search grounding (REPLACES empty stub)
    const realResearch = new RealCompetitorResearch();
    const gapEngine = new GapAnalysisEngine();

    const [realSignalResult, communitySignal] = await Promise.all([
      realResearch.collectSignalsWithBenchmark(topic, depth),
      realResearch.collectCommunitySignal(topic),
    ]);

    const { posts: realPosts, rawBenchmark } = realSignalResult;
    logger.info(`[CompetitorAnalyzer] Collected ${realPosts.length} real posts + community signals`);

    // Phase B: Extract benchmarks from real data
    const realBenchmark = realResearch.extractBenchmarks(realPosts, topic, rawBenchmark);

    // Phase C: Structured gap analysis with typed ContentGap[]
    const [structuredGaps, legacyGapAnalysis] = await Promise.all([
      gapEngine.identifyGaps(realPosts, realBenchmark, communitySignal, topic, depth),
      // Keep legacy gap analysis as fallback / enrichment
      this.runGapAnalysis([], topic, depth),
    ]);

    // Generate actionable briefs for top 4 gaps
    const contentBriefs = await gapEngine.generateBriefs(structuredGaps, topic);

    // Also enrich with any fetched LinkedIn posts for enriched post analysis
    const limit = depth === 'deep' ? 40 : 20;
    const fetchedPosts = await this.fetcher.searchLinkedInPosts(topic, limit).catch(() => []);
    const rawPosts = [...existingPosts, ...fetchedPosts];
    const enrichedPosts = await this.enrichPosts(
      [
        // Convert real grounded posts into EnrichedPost-compatible shape
        ...realPosts.map(rp => ({
          author: rp.authorName || rp.authorType || 'LinkedIn Creator',
          authorProfile: rp.url || '',
          content: `${rp.hook}\n\n${rp.excerpt}`,
          contentFormat: rp.format,
          likes: rp.estimatedLikes,
          comments: rp.estimatedComments,
          shares: 0,
          dataSource: rp.source,
        })),
        ...rawPosts,
      ],
      topic
    );

    const [
      shareOfVoice,
      formatBreakdown,
      postingPatterns,
      hashtagIntelligence,
      viralAnalysis,
    ] = await Promise.all([
      this.analyzeShareOfVoice(enrichedPosts),
      this.analyzeFormats(enrichedPosts),
      this.analyzePostingPatterns(enrichedPosts),
      this.analyzeHashtags(enrichedPosts),
      this.analyzeViralPatterns(enrichedPosts, topic),
    ]);

    const avgLikes = this.mean(enrichedPosts.map(p => p.likes));
    const avgComments = this.mean(enrichedPosts.map(p => p.comments));
    const topPercentile = this.percentile(enrichedPosts.map(p => p.likes + p.comments), 90);

    return {
      totalPostsAnalyzed: enrichedPosts.length,
      dataSource: realPosts.length > 0 ? 'google_grounding' : 'ai_synthesis',
      analyzedAt: new Date().toISOString(),
      avgEngagement: {
        likes: realBenchmark.avgEngagement.likes || Math.round(avgLikes),
        comments: realBenchmark.avgEngagement.comments || Math.round(avgComments),
        shares: realBenchmark.avgEngagement.shares,
      },
      medianEngagement: {
        likes: this.median(enrichedPosts.map(p => p.likes)),
        comments: this.median(enrichedPosts.map(p => p.comments)),
      },
      topPercentileThreshold: topPercentile,
      engagementBenchmark: avgLikes > topPercentile * 0.5 ? 'above' : 'average',
      shareOfVoice,
      formatBreakdown,
      topFormat: realBenchmark.dominantFormats[0]?.format || formatBreakdown[0]?.format || 'text',
      postingPatterns,
      hashtagIntelligence,
      topHashtags: hashtagIntelligence.slice(0, 10).map(h => h.tag),
      viralPosts: enrichedPosts
        .sort((a, b) => b.viralScore - a.viralScore)
        .slice(0, 5),
      viralPatterns: viralAnalysis.patterns,
      // Typed gaps from GapAnalysisEngine — the real deal
      contentGaps: structuredGaps.length > 0
        ? structuredGaps as any  // ContentGap[] extends the legacy shape
        : legacyGapAnalysis.gaps,
      opportunities: contentBriefs.length > 0
        ? contentBriefs.map(b => `${b.headline}: ${b.whyItWins}`)
        : legacyGapAnalysis.opportunities,
      threats: legacyGapAnalysis.threats,
      topPosts: enrichedPosts
        .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
        .slice(0, 20),
      allPosts: enrichedPosts,
      // New enriched fields
      benchmark: realBenchmark,
      communitySignal,
      structuredGaps,
      contentBriefs,
      isGrounded: realPosts.length > 0,
    } as any;
  }

  // ── Enrichment ──────────────────────────────────────────────

  private async enrichPosts(
    rawPosts: any[],
    topic: string
  ): Promise<EnrichedPost[]> {
    const topicAvgEngagement = 100; // Will be recalculated after first pass

    return rawPosts.map(post => {
      const content = post.content || post.snippet || '';
      const followers = post.authorFollowers || post.followers || 1000;
      const likes = post.likes || post.estimatedLikes || 0;
      const comments = post.comments || post.estimatedComments || 0;
      const shares = post.shares || 0;
      
      const engagementRate = followers > 0
        ? ((likes + comments + shares) / followers) * 100
        : 0;

      return {
        author: post.author || 'Unknown',
        authorProfile: post.authorProfile || '',
        authorFollowers: followers,
        authorJobTitle: post.authorJobTitle || '',
        content,
        hookText: content.substring(0, 210),
        contentFormat: this.detectFormat(content, post.contentFormat),
        likes,
        comments,
        shares,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        viralScore: parseFloat((engagementRate / topicAvgEngagement).toFixed(2)),
        wordCount: content.split(/\s+/).filter(Boolean).length,
        emojiCount: (content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length,
        hashtagsUsed: (content.match(/#[a-zA-Z0-9_]+/g) || post.hashtagsUsed || []),
        hasMedia: post.hasMedia || /\[image\]|\[video\]|📸|🎥/i.test(content),
        hasLink: post.hasLink || /https?:\/\//.test(content),
        ctaPresent: this.detectCTA(content),
        dayOfWeek: post.dayOfWeek ?? -1,
        hourPosted: post.hourPosted ?? -1,
        postUrl: post.postUrl || post.authorProfile || '',
        postedAt: post.postedAt || null,
        dataSource: post.dataSource || 'ai_synthesis',
      };
    });
  }

  private detectFormat(
    content: string,
    hint?: string
  ): 'text' | 'carousel' | 'poll' | 'article' | 'video' {
    if (hint && ['text','carousel','poll','article','video'].includes(hint)) {
      return hint as any;
    }
    if (/slide|swipe|carousel|pdf/i.test(content)) return 'carousel';
    if (/vote|poll|option/i.test(content)) return 'poll';
    if (content.length > 2000) return 'article';
    if (/video|watch|youtube|loom/i.test(content)) return 'video';
    return 'text';
  }

  private detectCTA(content: string): boolean {
    return /comment|share|follow|dm|link|thoughts|agree|disagree|vote|below/i.test(content);
  }

  // ── Share of Voice ────────────────────────────────────────

  private analyzeShareOfVoice(posts: EnrichedPost[]): ShareOfVoice[] {
    const authorMap: Map<string, EnrichedPost[]> = new Map();
    
    for (const post of posts) {
      if (!authorMap.has(post.author)) authorMap.set(post.author, []);
      authorMap.get(post.author)!.push(post);
    }

    const total = posts.length;
    return Array.from(authorMap.entries())
      .map(([author, authorPosts]) => {
        const sorted = [...authorPosts].sort((a, b) => 
          (b.likes + b.comments) - (a.likes + a.comments)
        );
        return {
          author,
          authorProfile: authorPosts[0].authorProfile,
          postCount: authorPosts.length,
          sharePercent: parseFloat(((authorPosts.length / total) * 100).toFixed(1)),
          avgEngagement: Math.round(this.mean(authorPosts.map(p => p.likes + p.comments))),
          topPost: sorted[0],
        };
      })
      .sort((a, b) => b.sharePercent - a.sharePercent)
      .slice(0, 10);
  }

  // ── Format Breakdown ─────────────────────────────────────

  private analyzeFormats(posts: EnrichedPost[]): FormatBreakdown[] {
    const formats = ['text', 'carousel', 'poll', 'article', 'video'];
    const total = posts.length;

    return formats.map(format => {
      const matching = posts.filter(p => p.contentFormat === format);
      const sorted = [...matching].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
      return {
        format,
        count: matching.length,
        percent: parseFloat(((matching.length / total) * 100).toFixed(1)),
        avgLikes: Math.round(this.mean(matching.map(p => p.likes))),
        avgComments: Math.round(this.mean(matching.map(p => p.comments))),
        topPerformer: sorted[0] || null,
      };
    })
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count);
  }

  // ── Posting Patterns ─────────────────────────────────────

  private analyzePostingPatterns(posts: EnrichedPost[]): PostingPatterns {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const byDay = days.map((day, idx) => {
      const dayPosts = posts.filter(p => p.dayOfWeek === idx);
      return {
        day,
        avgEngagement: Math.round(this.mean(dayPosts.map(p => p.likes + p.comments))),
        postCount: dayPosts.length,
      };
    });

    const byHour = Array.from({ length: 24 }, (_, hour) => {
      const hourPosts = posts.filter(p => p.hourPosted === hour);
      return {
        hour,
        avgEngagement: Math.round(this.mean(hourPosts.map(p => p.likes + p.comments))),
        postCount: hourPosts.length,
      };
    }).filter(h => h.postCount > 0);

    const bestDayObj = [...byDay].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    const bestHourObj = [...byHour].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    return {
      byDayOfWeek: byDay,
      byHour,
      bestDay: bestDayObj?.day || 'Tuesday',
      bestHour: bestHourObj?.hour || 9,
      avgPostsPerWeek: parseFloat((posts.length / 4).toFixed(1)), // approximate
    };
  }

  // ── Hashtag Intelligence ──────────────────────────────────

  private analyzeHashtags(posts: EnrichedPost[]): HashtagIntelligence[] {
    const tagMap: Map<string, { count: number; totalEngagement: number }> = new Map();

    for (const post of posts) {
      const eng = post.likes + post.comments;
      for (const tag of post.hashtagsUsed) {
        const existing = tagMap.get(tag) || { count: 0, totalEngagement: 0 };
        tagMap.set(tag, {
          count: existing.count + 1,
          totalEngagement: existing.totalEngagement + eng,
        });
      }
    }

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        frequency: data.count,
        avgEngagementWhenUsed: Math.round(data.totalEngagement / data.count),
        trendDirection: 'stable' as const, // Would use historical data in production
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 30);
  }

  // ── Viral Pattern Analysis ────────────────────────────────

  private async analyzeViralPatterns(
    posts: EnrichedPost[],
    topic: string
  ): Promise<{ patterns: any }> {
    const topPosts = [...posts]
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 10);

    try {
      const result = await this.minimax.promptJSON(
        'You are a LinkedIn content virality analyst.',
        `Analyze these top-performing LinkedIn posts about "${topic}" and identify viral patterns:

${JSON.stringify(topPosts.map(p => ({
  hook: p.hookText,
  format: p.contentFormat,
  wordCount: p.wordCount,
  emojiCount: p.emojiCount,
  hasMedia: p.hasMedia,
  ctaPresent: p.ctaPresent,
  likes: p.likes,
  comments: p.comments,
})), null, 2)}

Return JSON:
{
  "commonHooks": ["Pattern 1: ...", "Pattern 2: ..."],
  "commonFormats": ["carousel with 7-10 slides", "..."],
  "commonCTAs": ["Question at end", "..."],
  "avgWordCount": 200,
  "emojiUsage": "1-3 emojis in hook line",
  "visualPattern": "...",
  "structurePattern": "..."
}`
      );
      return { patterns: result };
    } catch (e) {
      return {
        patterns: {
          commonHooks: ['Question-based openers', 'Statistic leads'],
          commonFormats: ['Text posts with 3-5 paragraphs'],
          commonCTAs: ['Comment with your answer'],
          avgWordCount: 200,
          emojiUsage: '1-2 per post',
        }
      };
    }
  }

  // ── Gap Analysis (Core Intelligence) ─────────────────────

  private async runGapAnalysis(
    posts: EnrichedPost[],
    topic: string,
    depth: 'quick' | 'deep'
  ): Promise<{ gaps: ContentGap[]; opportunities: string[]; threats: string[] }> {
    const sample = posts.slice(0, depth === 'deep' ? 40 : 20);
    
    try {
      const result = await this.minimax.promptJSON(
        'You are a senior LinkedIn content strategist at a Silicon Valley growth firm.',
        `Perform a deep competitive gap analysis for the topic: "${topic}"

COMPETITIVE LANDSCAPE (${sample.length} posts analyzed):
${JSON.stringify(sample.map(p => ({
  content: p.content.substring(0, 500),
  format: p.contentFormat,
  engagement: p.likes + p.comments,
  hashtags: p.hashtagsUsed,
})), null, 2)}

Identify:
1. Topics that high-performing creators are NOT covering (content gaps)
2. Angles that could generate 2-5x average engagement
3. Emerging subtopics with rising interest
4. Format opportunities (e.g., nobody is doing polls about this)

Return JSON:
{
  "gaps": [
    {
      "title": "Specific gap title",
      "description": "Why this is an opportunity",
      "opportunityScore": 85,
      "suggestedAngle": "Specific content angle to take",
      "estimatedEngagementLift": "2-3x average",
      "contentFormat": "carousel|text|poll|article"
    }
  ],
  "opportunities": ["Specific actionable opportunity 1", "..."],
  "threats": ["Competitive threat 1: someone is dominating X angle", "..."]
}`
      );
      return result;
    } catch (e) {
      logger.error('[CompetitorAnalyzer] Gap analysis error:', e);
      return { gaps: [], opportunities: [], threats: [] };
    }
  }

  // ── Utility Helpers ───────────────────────────────────────

  private mean(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  private median(nums: number[]): number {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private percentile(nums: number[], p: number): number {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private determineDataSource(posts: EnrichedPost[]): string {
    const sources = new Set(posts.map(p => p.dataSource));
    if (sources.size > 1) return 'hybrid';
    return sources.values().next().value || 'ai_synthesis';
  }
}
