import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiSearchService } from './geminiSearchService';
import { GoogleTrendsService, TrendResult } from './googleTrendsService';
import { RedditSignalService, RedditSignal } from './redditSignalService';
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
  keyStatistics: Array<{ fact: string; value: string; source: string; url: string }>;
  expertInsights: Array<{ insight: string; source: string; url: string }>;
  verifiedSources: Array<{ title: string; url: string; credibility: 'high' | 'medium'; domain: string }>;

  // Community signal
  redditSignal: {
    hotAngles: string[];
    sentiment: string;
    weeklyPostCount: number;
    isDataReal: boolean;
  };

  // LinkedIn context
  linkedinContext: {
    topHashtags: string[];
    contentGaps: string[];
    recommendedFormats: string[];
    bestHookStyles: string[];
  };

  // Computed quality
  researchQuality: number;   // 0-100, computed from real source count
  dataSourceCount: number;
  isFullyGrounded: boolean;  // true only if all 3 tiers returned data
  estimatedFields: string[]; // list of fields that used AI estimation
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

  async research(topic: string, depth: 'quick' | 'deep' = 'quick'): Promise<TopicResearchResult> {
    const normalizedTopic = this.normalizeTopic(topic);
    logger.info(`[TopicResearch] Starting ${depth} research for: "${topic}"`);

    const cached = await this.checkCache(normalizedTopic);
    if (cached) {
      logger.info(`[TopicResearch] Cache hit for: "${normalizedTopic}"`);
      return cached;
    }

    const maxResults = depth === 'deep' ? 15 : 8;

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
      this.getLinkedInContext(topic),
    ]);

    const trends = trendResult.status === 'fulfilled' ? trendResult.value : null;
    const sources = searchResults.status === 'fulfilled' ? searchResults.value : [];
    const statSources = searchStats.status === 'fulfilled' ? searchStats.value : [];
    const reddit = redditSignal.status === 'fulfilled' ? redditSignal.value : null;
    const linkedin = linkedinContext.status === 'fulfilled' ? linkedinContext.value : null;

    const [statistics, expertInsights] = await Promise.all([
      this.extractStatisticsFromSources([...sources, ...statSources], topic),
      this.synthesizeExpertInsights(sources, topic),
    ]);

    const verifiedSources = [...sources, ...statSources]
      .filter(s => s.url && s.url.startsWith('http'))
      .map(s => ({
        title: s.title,
        url: s.url,
        credibility: this.assessCredibility(s.url),
        domain: new URL(s.url).hostname.replace('www.', ''),
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

    const result: TopicResearchResult = {
      topic,
      normalizedTopic,
      trendScore: trends?.trendScore ?? 50,
      velocity7d: trends?.velocity7d ?? 0,
      isPeaking: trends?.isPeaking ?? false,
      interestOverTime: trends?.interestOverTime ?? [],
      relatedQueries: trends?.relatedQueries ?? { rising: [], top: [] },
      trendDataSource: hasRealTrends ? 'serpapi' : 'gemini_estimated',
      keyStatistics: statistics,
      expertInsights,
      verifiedSources,
      redditSignal: {
        hotAngles: reddit?.hotAngles ?? [],
        sentiment: reddit?.sentiment ?? 'neutral',
        weeklyPostCount: reddit?.weeklyPostCount ?? 0,
        isDataReal: reddit?.isDataReal ?? false,
      },
      linkedinContext: linkedin ?? {
        topHashtags: [],
        contentGaps: [],
        recommendedFormats: [],
        bestHookStyles: [],
      },
      researchQuality,
      dataSourceCount: realSourceCount,
      isFullyGrounded: hasRealTrends && hasReddit && realSourceCount >= 5,
      estimatedFields,
    };

    await this.persistResults(normalizedTopic, result);

    return result;
  }

  private async extractStatisticsFromSources(sources: any[], topic: string) {
    if (sources.length === 0) return [];
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const sourceContent = sources.slice(0, 8).map(s => `SOURCE: ${s.title}\nURL: ${s.url}\nCONTENT: ${s.content}`).join('\n\n---\n\n');

    try {
      const result = await model.generateContent(
        `Extract ONLY real statistics and data points mentioned in these sources about "${topic}".
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

  private async synthesizeExpertInsights(sources: any[], topic: string) {
    if (sources.length === 0) return [];
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const topSources = sources.slice(0, 6).map(s => `${s.title} (${s.url}): ${s.content?.substring(0, 400)}`).join('\n\n');

    try {
      const result = await model.generateContent(
        `Based ONLY on these real sources about "${topic}", extract 3-5 key expert insights.
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

  private async getLinkedInContext(topic: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [{ googleSearch: {} } as any] });
    try {
      const result = await model.generateContent(
        `Search LinkedIn and professional content sites for the current content landscape around "${topic}":
1. What are the most-used LinkedIn hashtags for this topic right now?
2. What content gaps exist (what's NOT being written)?
3. What content formats perform best for this topic on LinkedIn?
4. What hook styles get the most engagement for this topic?

Return JSON: {
  "topHashtags": ["#tag1", "#tag2"],
  "contentGaps": ["specific gap 1"],
  "recommendedFormats": ["carousel", "long-form post"],
  "bestHookStyles": ["contrarian take", "specific stat"]
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
