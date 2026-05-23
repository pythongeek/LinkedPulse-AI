import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiSearchService } from './geminiSearchService';
import { GoogleTrendsService } from './googleTrendsService';
import { RedditSignalService } from './redditSignalService';
import { prisma } from '../server';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface TopicResearchResult {
  topic: string;
  normalizedTopic: string;

  // Trend data (real or estimated)
  trendScore: number;
  velocity7d: number;
  isPeaking: boolean;
  interestOverTime: Array<{ date: string; value: number }>;
  relatedQueries: { rising: any[]; top: any[] };
  trendDataSource: 'serpapi' | 'rapidapi' | 'gemini_estimated';

  // Source-verified research
  keyStatistics: Array<{ fact: string; value: string; source: string; url: string; credibility?: 'high' | 'medium' | 'low'; publishedDate?: string }>;
  expertInsights: Array<{ insight: string; source: string; url: string }>;
  verifiedSources: Array<{ title: string; url: string; credibility: 'high' | 'medium'; domain: string }>;

  // Community signal
  redditSignal: {
    hotAngles: string[];
    sentiment: string;
    weeklyPostCount: number;
    isDataReal: boolean;
    painPoints?: string[];
    unansweredQuestions?: string[];
  };

  // LinkedIn context
  linkedinContext: {
    topHashtags: string[];
    contentGaps: string[];
    recommendedFormats: string[];
    bestHookStyles: string[];
    bestPostingDays?: string[];
    formatPerformanceScores?: Record<string, number>;
    saturatedAngles?: string[];
  };

  // Gap analysis result (enriched)
  editorialCalendar?: Array<{
    week: number;
    contentIdea: string;
    format: string;
    hook: string;
    priorityScore: number;
  }>;

  // Computed quality
  researchQuality: number;   // 0-100
  dataSourceCount: number;
  isFullyGrounded: boolean;
  estimatedFields: string[];
}

export interface ResearchContext {
  contentTypeTarget?: string;
  topicType?: string;
  audienceSegment?: string;
  industryVertical?: string;
  isBtoB?: boolean;
  competitorContext?: string;
  existingContentContext?: string;
  customResearchDirective?: string;
  personaSystemPrompt?: string;
}

export class TopicResearchOrchestrator {
  private searchService = new GeminiSearchService();
  private trendsService = new GoogleTrendsService();
  private redditService = new RedditSignalService();

  normalizeTopic(topic: string): string {
    return topic
      .toLowerCase()
      .replace(/\bin\b|\bfor\b|\bthe\b|\band\b|\bof\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildContextPrompt(context?: ResearchContext): string {
    if (!context) return '';
    const lines: string[] = ['RESEARCH CONTEXT (apply these constraints to ALL outputs):'];
    if (context.contentTypeTarget)
      lines.push(`- Target format: ${context.contentTypeTarget.toUpperCase()} (optimize gaps and hooks for this format)`);
    if (context.topicType)
      lines.push(`- Topic category: ${context.topicType.replace(/_/g, ' ')} (frame research from this angle)`);
    if (context.audienceSegment)
      lines.push(`- Primary audience: ${context.audienceSegment.replace(/_/g, ' ')} (calibrate vocabulary and depth)`);
    if (context.industryVertical)
      lines.push(`- Industry vertical: ${context.industryVertical} (prioritize vertical-specific signals)`);
    if (context.isBtoB !== undefined)
      lines.push(`- Context: ${context.isBtoB ? 'B2B' : 'B2C'} (${context.isBtoB ? 'enterprise/professional' : 'consumer'} lens)`);
    if (context.competitorContext)
      lines.push(`- Benchmark against: ${context.competitorContext} (surface gaps relative to this creator/brand)`);
    if (context.existingContentContext)
      lines.push(`- Topics already covered by user (AVOID duplicating, find differentiated angles): ${context.existingContentContext}`);
    if (context.customResearchDirective)
      lines.push(`- CUSTOM DIRECTIVE (follow this exactly): ${context.customResearchDirective}`);
    if (context.personaSystemPrompt)
      lines.push(`- Creator persona: ${context.personaSystemPrompt}`);
    return lines.join('\n');
  }

  async research(topic: string, depth: 'quick' | 'deep' = 'quick', context?: ResearchContext, noCache = false): Promise<TopicResearchResult> {
    const normalizedTopic = this.normalizeTopic(topic);
    logger.info(`[TopicResearch] Starting ${depth} research for: "${topic}"`);

    if (!noCache) {
      const cached = await this.checkCache(normalizedTopic);
      if (cached) {
        logger.info(`[TopicResearch] Cache hit for: "${normalizedTopic}"`);
        return cached;
      }
    }

    const maxResults = depth === 'deep' ? 15 : 8;
    const contextPrompt = this.buildContextPrompt(context);

    const [
      trendResult,
      searchResults,
      searchStats,
      redditSignal,
      linkedinContext,
    ] = await Promise.allSettled([
      this.trendsService.getTrends(topic, depth === 'deep' ? 'today 12-m' : 'today 3-m'),
      this.searchService.researchTopic(topic, maxResults),
      this.searchService.getTopicStatistics(topic),
      this.redditService.getTopicSignal(topic),
      this.getLinkedInContext(topic, contextPrompt),
    ]);

    const trends = trendResult.status === 'fulfilled' ? trendResult.value : null;
    const sources = searchResults.status === 'fulfilled' ? searchResults.value : [];
    const statSources = searchStats.status === 'fulfilled' ? searchStats.value : [];
    const reddit = redditSignal.status === 'fulfilled' ? redditSignal.value : null;
    const linkedin = linkedinContext.status === 'fulfilled' ? linkedinContext.value : null;

    const [statistics, expertInsights] = await Promise.all([
      this.extractStatisticsFromSources([...sources, ...statSources], topic, contextPrompt),
      this.synthesizeExpertInsights(sources, topic, contextPrompt),
    ]);

    const verifiedSources = [...sources, ...statSources]
      .filter(s => s.url && s.url.startsWith('http'))
      .map(s => ({
        title: s.title,
        url: s.url,
        credibility: this.assessCredibility(s.url),
        domain: (() => { try { return new URL(s.url).hostname.replace('www.', ''); } catch { return s.url; } })(),
      }))
      .slice(0, depth === 'deep' ? 15 : 8);

    const realSourceCount = verifiedSources.length;
    const hasRealTrends = !!trends && !trends.isEstimated;
    const hasReddit = !!reddit?.isDataReal;
    const researchQuality = this.computeQualityScore(realSourceCount, hasRealTrends, hasReddit, statistics.length);

    const estimatedFields: string[] = [];
    if (!hasRealTrends) estimatedFields.push('trendScore', 'velocity7d', 'interestOverTime');
    if (!hasReddit) estimatedFields.push('redditSignal');
    if (realSourceCount === 0) estimatedFields.push('keyStatistics', 'verifiedSources');

    // Enrich statistics with credibility tier
    const enrichedStats = statistics.map((stat: any) => ({
      ...stat,
      credibility: this.assessSourceCredibility(stat.url || ''),
    }));

    const result: TopicResearchResult = {
      topic,
      normalizedTopic,
      trendScore: trends?.trendScore ?? 50,
      velocity7d: trends?.velocity7d ?? 0,
      isPeaking: trends?.isPeaking ?? false,
      interestOverTime: trends?.interestOverTime ?? [],
      relatedQueries: trends?.relatedQueries ?? { rising: [], top: [] },
      trendDataSource: hasRealTrends ? 'serpapi' : 'gemini_estimated',
      keyStatistics: enrichedStats,
      expertInsights,
      verifiedSources,
      redditSignal: {
        hotAngles: reddit?.hotAngles ?? [],
        sentiment: reddit?.sentiment ?? 'neutral',
        weeklyPostCount: reddit?.weeklyPostCount ?? 0,
        isDataReal: reddit?.isDataReal ?? false,
        painPoints: reddit?.painPoints ?? [],
        unansweredQuestions: reddit?.unansweredQuestions ?? [],
      },
      linkedinContext: linkedin ?? {
        topHashtags: [],
        contentGaps: [],
        recommendedFormats: [],
        bestHookStyles: [],
        bestPostingDays: ['Tuesday', 'Wednesday', 'Thursday'],
        formatPerformanceScores: {},
        saturatedAngles: [],
      },
      researchQuality,
      dataSourceCount: realSourceCount,
      isFullyGrounded: hasRealTrends && hasReddit && realSourceCount >= 5,
      estimatedFields,
    };

    await this.persistResults(normalizedTopic, result);

    return result;
  }

  private assessSourceCredibility(url: string): 'high' | 'medium' | 'low' {
    if (!url) return 'low';
    const highDomains = ['hbr.org', 'mckinsey.com', 'gartner.com', 'forrester.com', 'mit.edu', 'stanford.edu', 'harvard.edu', 'nature.com', 'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'deloitte.com', 'pwc.com', 'bcg.com', 'bain.com'];
    const mediumDomains = ['forbes.com', 'inc.com', 'businessinsider.com', 'techcrunch.com', 'venturebeat.com', 'wired.com', 'theatlantic.com'];
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (highDomains.some(d => domain.includes(d))) return 'high';
      if (mediumDomains.some(d => domain.includes(d))) return 'medium';
      return 'low';
    } catch { return 'low'; }
  }

  private async extractStatisticsFromSources(sources: any[], topic: string, contextPrompt = '') {
    if (sources.length === 0) return [];
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const sourceContent = sources.slice(0, 8).map(s => `SOURCE: ${s.title}\nURL: ${s.url}\nCONTENT: ${s.content}`).join('\n\n---\n\n');

    try {
      const result = await model.generateContent(
        `${contextPrompt ? contextPrompt + '\n\n' : ''}Extract ONLY real statistics and data points mentioned in these sources about "${topic}".
Do NOT invent numbers. Only quote what is directly stated in the source text.
For each statistic, you MUST provide the source URL it came from.

SOURCES:
${sourceContent}

Return JSON array: [{"fact": "claim text", "value": "specific number/percentage", "source": "domain name", "url": "exact URL from above"}]
If no statistics are found, return []`
      );
      const text = result.response.text();
      const json = text.match(/\[[\s\S]*\]/)?.[0];
      return json ? JSON.parse(json).filter((s: any) => s.url && s.fact) : [];
    } catch {
      return [];
    }
  }

  private async synthesizeExpertInsights(sources: any[], topic: string, contextPrompt = '') {
    if (sources.length === 0) return [];
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const topSources = sources.slice(0, 6).map(s => `${s.title} (${s.url}): ${s.content?.substring(0, 400)}`).join('\n\n');

    try {
      const result = await model.generateContent(
        `${contextPrompt ? contextPrompt + '\n\n' : ''}Based ONLY on these real sources about "${topic}", extract 3-5 key expert insights.
Each insight must be traceable to a specific source URL provided.
Do NOT add insights not found in the sources.

${topSources}

Return JSON: [{"insight": "...", "source": "domain", "url": "exact source URL"}]`
      );
      const text = result.response.text();
      const json = text.match(/\[[\s\S]*\]/)?.[0];
      return json ? JSON.parse(json).filter((i: any) => i.url) : [];
    } catch {
      return [];
    }
  }

  private async getLinkedInContext(topic: string, contextPrompt = '') {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [{ googleSearch: {} } as any] });
    try {
      const result = await model.generateContent(
        `${contextPrompt ? contextPrompt + '\n\n' : ''}Search LinkedIn and professional content sites for the current content landscape around "${topic}":
1. What are the most-used LinkedIn hashtags for this topic right now? (3-5)
2. What content gaps exist (what's NOT being written, specific missing angles)?
3. What content formats perform best for this topic on LinkedIn? Score each 0-100.
4. What hook styles get the most engagement for this topic?
5. What angles are SATURATED (avoid these)?
6. Best posting days for this topic type?

Return JSON: {
  "topHashtags": ["#tag1", "#tag2"],
  "contentGaps": ["specific gap 1", "specific gap 2"],
  "recommendedFormats": ["carousel", "long-form post"],
  "bestHookStyles": ["contrarian take", "specific stat"],
  "formatPerformanceScores": {"carousel": 85, "post": 70, "article": 60, "poll": 45},
  "saturatedAngles": ["angle already overdone"],
  "bestPostingDays": ["Tuesday", "Wednesday", "Thursday"]
}`
      );
      const text = result.response.text();
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : this.defaultLinkedInContext();
    } catch {
      return this.defaultLinkedInContext();
    }
  }

  private defaultLinkedInContext() {
    return {
      topHashtags: [],
      contentGaps: [],
      recommendedFormats: ['post', 'carousel'],
      bestHookStyles: ['bold_claim', 'statistic'],
      formatPerformanceScores: { carousel: 80, post: 65, article: 55, poll: 40 },
      saturatedAngles: [],
      bestPostingDays: ['Tuesday', 'Wednesday', 'Thursday'],
    };
  }

  private assessCredibility(url: string): 'high' | 'medium' {
    const highCredibilityDomains = ['hbr.org', 'mckinsey.com', 'gartner.com', 'forrester.com', 'mit.edu', 'stanford.edu', 'harvard.edu', 'nature.com', 'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com'];
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return highCredibilityDomains.some(d => domain.includes(d)) ? 'high' : 'medium';
    } catch {
      return 'medium';
    }
  }

  private computeQualityScore(realSourceCount: number, hasRealTrends: boolean, hasReddit: boolean, statisticsCount: number): number {
    let score = 0;
    score += Math.min(40, realSourceCount * 4);
    if (hasRealTrends) score += 25; else score += 8;
    if (hasReddit) score += 20; else score += 5;
    score += Math.min(15, statisticsCount * 3);
    return Math.min(100, Math.round(score));
  }

  private async checkCache(normalizedTopic: string): Promise<TopicResearchResult | null> {
    try {
      const cached = await prisma.researchCache.findFirst({
        where: {
          query: `orchestrated:${normalizedTopic}`,
          queryType: 'topic_research_v2',
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (cached) {
        await prisma.researchCache.update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 }, lastHitAt: new Date() } as any,
        });
        return cached.results as unknown as TopicResearchResult;
      }
    } catch (e) {
      logger.error('Cache check error:', e);
    }
    return null;
  }

  private async persistResults(normalizedTopic: string, result: TopicResearchResult): Promise<void> {
    const ttlHours = result.isFullyGrounded ? 12 : result.estimatedFields.length > 2 ? 3 : 6;
    try {
      await prisma.researchCache.create({
        data: {
          query: `orchestrated:${normalizedTopic}`,
          queryType: 'topic_research_v2',
          results: result as any,
          source: 'orchestrator_v2',
          sourceTier: result.isFullyGrounded ? 1 : 2,
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
        },
      });

      await prisma.topic.upsert({
        where: { keyword: normalizedTopic },
        update: {
          opportunityScore: this.computeOpportunityScore(result),
          trendData: {
            trendScore: result.trendScore,
            velocity7d: result.velocity7d,
            isPeaking: result.isPeaking,
          } as any,
          dataLastRefreshed: new Date(),
          isEstimated: !result.isFullyGrounded,
        } as any,
        create: {
          keyword: normalizedTopic,
          opportunityScore: this.computeOpportunityScore(result),
          trendData: { trendScore: result.trendScore, velocity7d: result.velocity7d } as any,
          dataLastRefreshed: new Date(),
          isEstimated: !result.isFullyGrounded,
        } as any,
      });
    } catch (e) {
      logger.error('Persist research error:', e);
    }
  }

  private computeOpportunityScore(result: TopicResearchResult): number {
    const trendWeight = 0.30;
    const velocityWeight = 0.25;
    const communityWeight = 0.20;
    const contentGapWeight = 0.15;
    const qualityWeight = 0.10;

    const trendComponent = result.trendScore * trendWeight;
    const velocityBonus = Math.min(25, Math.max(0, result.velocity7d)) * velocityWeight;
    const communityComponent = result.redditSignal.isDataReal ? Math.min(100, result.redditSignal.weeklyPostCount * 5) * communityWeight : 30 * communityWeight;
    const gapComponent = Math.min(100, result.linkedinContext.contentGaps.length * 20) * contentGapWeight;
    const qualityComponent = result.researchQuality * qualityWeight;

    return Math.round(Math.min(100, trendComponent + velocityBonus + communityComponent + gapComponent + qualityComponent));
  }
}
