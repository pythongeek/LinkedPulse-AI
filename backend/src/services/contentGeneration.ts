import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from '@prisma/client';
import { AIClient as MiniMaxClient } from './minimax';
import { PersonaService } from './personaService';
import { ResearchService } from './researchService';
import { TrendAnalyzer } from './trendAnalyzer';
import { EngagementPredictor } from './engagementPredictor';
import { logger } from '../utils/logger';
import { HookFormula, PollDuration, CTAType, CarouselSlide, PollOption, LINKEDIN_LIMITS } from '../types/contentTypes';
import { TopicResearchOrchestrator } from './topicResearchOrchestrator';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ContentGenerationOptions {
  topic: string;
  contentType: 'post' | 'carousel' | 'article' | 'poll';
  persona?: Persona | null;
  outline?: any;
  researchDepth: 'none' | 'quick' | 'deep';
  includeImages: boolean;
  targetAudience?: string;
  keywords?: string[];
  customInstructions?: string;
  hookFormula?: HookFormula;
  slideCount?: number;
  pollDuration?: PollDuration;
  articleTargetWords?: number;
  ctaType?: CTAType;
  toneOverride?: string;
  emojiBudget?: number;
  includeFirstComment?: boolean;
  linkToInclude?: string;
  audienceExpertiseLevel?: 'beginner' | 'intermediate' | 'expert';
}

export interface GeneratedContent {
  title: string;
  content: string;
  outline: any;
  researchData: any;
  sources: any[];
  images?: string[];
  imagePrompts?: string[];
  engagementPrediction: number;
  seoScore: number;
  hookSuggestions: string[];
  bestPostingTime: string;
  linkedinOptimization: any;
  competitiveAnalysis: any;
  firstComment?: string;
  slides?: CarouselSlide[];
  pollQuestion?: string;
  pollOptions?: PollOption[];
  articleTitle?: string;
  articleExcerpt?: string;
  charCount?: number;
  wordCount?: number;
  researchQuality?: number;
  dataSourceCount?: number;
  isAiGrounded?: boolean;
}

export interface ContentSuggestion {
  title: string;
  angle: string;
  outline: any;
  format: string;
  targetAudience: string;
}

/**
 * Multi-Agent Content Generation System
 * 
 * All agents powered by Gemini (via AIClient wrapper).
 * Gemini handles: content planning, writing, editing, engagement,
 * research grounding, image generation, and visual analysis.
 */
export class ContentGenerationService {
  private minimax: MiniMaxClient;
  private researchService: ResearchService;
  private trendAnalyzer: TrendAnalyzer;
  private orchestrator: TopicResearchOrchestrator;

  constructor() {
    this.minimax = new MiniMaxClient();
    this.researchService = new ResearchService();
    this.trendAnalyzer = new TrendAnalyzer();
    this.orchestrator = new TopicResearchOrchestrator();
  }

  /**
   * Main content generation — orchestrates all agents
   * Kept for backwards compatibility if needed outside of cron jobs
   */
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent> {
    let state = await this.generatePhase0(options);
    state = await this.generatePhase1(options, state);
    state = await this.generatePhase2(options, state);
    state = await this.generatePhase3(options, state);
    state = await this.generatePhase4(options, state);
    return await this.generatePhase5(options, state);
  }

  /**
   * Phase 0 (REVISED): Parallel multi-source research
   */
  async generatePhase0(options: ContentGenerationOptions): Promise<any> {
    const { topic, researchDepth } = options;
    logger.info(`[Phase 0 v2] Parallel research for: ${topic}`);

    if (researchDepth === 'none') {
      return {
        researchData: { statistics: [], sources: [], keyInsights: [], subtopics: [] },
        researchQuality: 0,
        dataSourceCount: 0,
        isAiGrounded: false,
      };
    }

    const research = await this.orchestrator.research(
      topic,
      researchDepth as 'quick' | 'deep'
    );

    return {
      researchData: {
        statistics: research.keyStatistics.map(s => ({
          fact: s.fact,
          value: s.value,
          source: s.source,
        })),
        expertOpinions: research.expertInsights.map(i => ({
          expert: i.source,
          opinion: i.insight,
        })),
        caseStudies: [],
        keyInsights: research.linkedinContext.contentGaps,
        subtopics: research.relatedQueries.rising.slice(0, 5).map(q => q.query),
        sources: research.verifiedSources,
      },
      researchQuality: research.researchQuality,
      dataSourceCount: research.dataSourceCount,
      isAiGrounded: research.isFullyGrounded,
      _orchestratorResult: research,
    };
  }

  /**
   * Phase 1: Trend & Competitor Analysis (MiniMax)
   */
  async generatePhase1(options: ContentGenerationOptions, intermediateResult: any): Promise<any> {
    const { topic } = options;
    logger.info(`[Phase 1 v2] Trend & Competitor Analysis for: ${topic}`);
    
    const orchestratorResult = intermediateResult._orchestratorResult;

    const trendData = orchestratorResult
      ? {
          trendingAngles: orchestratorResult.redditSignal.hotAngles.map((angle: string) => ({
            angle,
            momentum: orchestratorResult.trendScore,
            source: orchestratorResult.redditSignal.isDataReal ? 'reddit_real' : 'ai_estimated',
          })),
          recommendedHashtags: orchestratorResult.linkedinContext.topHashtags,
          relatedTopics: orchestratorResult.relatedQueries.rising.map((q: any) => q.query),
          contentOpportunities: orchestratorResult.linkedinContext.contentGaps,
          viralityScore: orchestratorResult.trendScore,
          velocity7d: orchestratorResult.velocity7d,
          isPeaking: orchestratorResult.isPeaking,
        }
      : await this.trendAgent(topic);

    const competitiveAnalysis = await this.competitorAnalysisAgent(topic);

    return {
      ...intermediateResult,
      trendData,
      competitiveAnalysis,
    };
  }

  /**
   * Phase 2: SEO & Hooks (MiniMax)
   */
  async generatePhase2(options: ContentGenerationOptions, intermediateResult: any): Promise<any> {
    const { topic, contentType, persona, keywords } = options;
    const { researchData } = intermediateResult;

    logger.info(`[Phase 2] SEO & Hooks for: ${topic}`);
    const [seoData, hookSuggestions] = await Promise.all([
      this.seoAgent(topic, contentType, keywords || [], researchData),
      this.hookAgent(topic, researchData, persona)
    ]);

    return {
      ...intermediateResult,
      seoData,
      hookSuggestions,
    };
  }

  /**
   * Phase 3: Content Writing (MiniMax) — routes to specialized agents
   */
  async generatePhase3(options: ContentGenerationOptions, intermediateResult: any): Promise<any> {
    const {
      topic, contentType, persona, outline, targetAudience, customInstructions,
      hookFormula, ctaType, emojiBudget, slideCount, pollDuration,
      articleTargetWords, linkToInclude, toneOverride, audienceExpertiseLevel,
    } = options;
    const { researchData, seoData, hookSuggestions } = intermediateResult;

    logger.info(`[Phase 3] Content Writing for: ${topic}`);

    const params = {
      topic, persona, outline, researchData, seoData,
      bestHook: hookSuggestions[0], targetAudience, customInstructions,
      hookFormula, ctaType, emojiBudget, slideCount, pollDuration,
      articleTargetWords, linkToInclude, toneOverride, audienceExpertiseLevel,
    };

    let draft;
    switch (contentType) {
      case 'post':     draft = await this.writePostAgent(params); break;
      case 'carousel': draft = await this.writeCarouselAgent(params); break;
      case 'article':  draft = await this.writeArticleAgent(params); break;
      case 'poll':     draft = await this.writePollAgent(params); break;
      default:         draft = await this.writePostAgent(params);
    }

    draft = this.enforceCharacterLimits(draft, contentType);

    return {
      ...intermediateResult,
      draft,
    };
  }

  /**
   * Phase 4: Editing & Fact Checking (MiniMax)
   */
  async generatePhase4(options: ContentGenerationOptions, intermediateResult: any): Promise<any> {
    const { topic, contentType, customInstructions } = options;
    const { draft, seoData, researchData } = intermediateResult;

    logger.info(`[Phase 4] Editing & Fact Checking for: ${topic}`);
    const edited = await this.editingAgent(draft, contentType, seoData, customInstructions);
    const verified = await this.factCheckAgent(edited, researchData.sources);

    return {
      ...intermediateResult,
      verified,
    };
  }

  /**
   * Phase 5: Visuals, Timing, Engagement (Gemini + MiniMax)
   */
  async generatePhase5(options: ContentGenerationOptions, intermediateResult: any): Promise<GeneratedContent> {
    const { topic, contentType, persona, includeImages, targetAudience, includeFirstComment, linkToInclude } = options;
    const { researchData, seoData, hookSuggestions, verified, competitiveAnalysis, researchQuality, dataSourceCount, isAiGrounded } = intermediateResult;

    logger.info(`[Phase 5] Final optimizations for: ${topic}`);
    
    let imagePrompts: string[] = [];
    let images: string[] = [];
    if (includeImages) {
      try {
        const { ImageGenerationService } = await import('./imageGeneration.js');
        const { LinkedInImagePromptEngine } = await import('./linkedinImagePromptEngine.js');
        const imageGen = new ImageGenerationService();
        const promptEngine = new LinkedInImagePromptEngine();

        // Determine correct LinkedIn image purpose based on content type
        const imagePurpose = options.contentType === 'carousel' ? 'carousel_cover'
          : options.contentType === 'article' ? 'article_cover'
          : 'feed_post';

        // Build structured prompt with persona DNA + hook formula
        const structuredPrompt = promptEngine.buildPrompt(
          topic,
          imagePurpose,
          persona,
          verified.content?.substring(0, 500),
          options.hookFormula,
          `campaign-${topic.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}`
        );

        imagePrompts = [structuredPrompt.primaryPrompt];
        logger.info(`[Phase 5] Generating ${imagePurpose} image via provider chain`);
        images = await imageGen.generateLinkedInImage(
          topic,
          imagePurpose,
          persona,
          verified.content?.substring(0, 500),
          options.hookFormula,
          `campaign-${topic.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}`,
          1
        );
      } catch (err) {
        logger.error('[Phase 5] Image generation failed:', err);
      }
    }

    const [bestPostingTime] = await Promise.all([
      this.timingAgent(targetAudience)
    ]);

    // Generate first comment if requested
    let firstComment: string | undefined;
    if (includeFirstComment !== false) {
      firstComment = await this.firstCommentAgent(verified, contentType, topic, linkToInclude);
    }

    // Extract content-type-specific fields from verified draft
    const contentBody = verified.content || verified.body || verified.introText || verified.caption || '';

    // Deterministic prediction using the rules engine
    const predictionResult = EngagementPredictor.predict(contentBody, contentType, researchQuality, firstComment);

    return {
      title: verified.title || verified.question || topic,
      content: contentBody,
      outline: verified.outline || verified.sections || null,
      researchData,
      sources: verified.sources,
      images,
      imagePrompts,
      engagementPrediction: predictionResult.score,
      seoScore: seoData.seoScore || seoData.score || 50,
      hookSuggestions,
      bestPostingTime,
      linkedinOptimization: {
        hashtags: seoData.hashtags,
        keywords: seoData.keywords,
        mentions: seoData.mentions,
        formattedContent: verified.formattedContent,
      },
      competitiveAnalysis,
      firstComment,
      slides: verified.slides || null,
      pollQuestion: verified.question || null,
      pollOptions: verified.options || null,
      articleTitle: verified.articleTitle || verified.title || null,
      articleExcerpt: verified.excerpt || null,
      charCount: verified.charCount || (contentBody ? contentBody.length : null),
      wordCount: verified.wordCount || (contentBody ? this.countWords(contentBody) : null),
      researchQuality: researchQuality || 50,
      dataSourceCount: dataSourceCount || 0,
      isAiGrounded: isAiGrounded || false,
    };
  }

  // ==================== AGENTS ====================

  /**
   * Research Agent — Gemini (Google Search Grounding)
   */
  private async researchAgent(topic: string, depth: 'none' | 'quick' | 'deep'): Promise<any> {
    try {
      const modelConfig: any = { 
        model: 'gemini-2.5-flash'
      };
      if (depth !== 'none') {
        modelConfig.tools = [{ googleSearch: {} } as any];
      }
      const model = genAI.getGenerativeModel(modelConfig);

      const prompt = `Research the topic: "${topic}" thoroughly for LinkedIn content. Search Google to get live, up-to-date facts, statistics, B2B trends, and expert comments.
      
Tasks:
1. Find latest statistics and data (2024-2026 preferred, with sources)
2. Identify expert opinions and thought leaders
3. Locate case studies with numbers
4. Find relevant research papers
5. Identify common misconceptions
6. Find trending subtopics

${depth === 'deep' ? 'Provide comprehensive research with 15+ sources.' : 'Provide key insights with 7-10 sources.'}

Return JSON format:
{
  "statistics": [{"fact": "...", "value": "...", "source": "..."}],
  "expertOpinions": [{"expert": "...", "opinion": "..."}],
  "caseStudies": [{"company": "...", "results": "..."}],
  "keyInsights": ["..."],
  "subtopics": ["..."],
  "sources": [{"title": "...", "url": "...", "credibility": "high/medium/low"}]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return this.getEmptyResearch();
    } catch (error) {
      logger.error('Research agent error:', error);
      return this.getEmptyResearch();
    }
  }

  private getEmptyResearch() {
    return { statistics: [], expertOpinions: [], caseStudies: [], keyInsights: [], subtopics: [], sources: [] };
  }

  /**
   * Trend Agent — MiniMax (content strategy)
   */
  private async trendAgent(topic: string): Promise<any> {
    try {
      return await this.minimax.promptJSON(
        'You are a LinkedIn content trend strategist.',
        `Analyze trends for LinkedIn content about: "${topic}"

Return JSON:
{
  "trendingAngles": [{"angle": "...", "momentum": 0-100}],
  "recommendedHashtags": ["#...", "#..."],
  "relatedTopics": ["..."],
  "contentOpportunities": ["..."],
  "viralityScore": 0-100
}`
      );
    } catch (error) {
      logger.error('Trend agent error:', error);
      return { trendingAngles: [], recommendedHashtags: [], relatedTopics: [], contentOpportunities: [] };
    }
  }

  /**
   * Competitor Analysis Agent — MiniMax
   */
  private async competitorAnalysisAgent(topic: string): Promise<any> {
    try {
      return await this.minimax.promptJSON(
        'You are a LinkedIn competitive content analyst.',
        `Analyze what makes top-performing LinkedIn content about "${topic}" successful.

Return JSON:
{
  "winningFormats": ["..."],
  "effectiveHooks": ["..."],
  "avoidMistakes": ["..."],
  "engagementDrivers": ["..."],
  "optimalLength": "...",
  "bestPractices": ["..."]
}`
      );
    } catch (error) {
      logger.error('Competitor analysis agent error:', error);
      return { winningFormats: [], effectiveHooks: [], avoidMistakes: [], engagementDrivers: [] };
    }
  }

  /**
   * SEO Agent — MiniMax
   */
  private async seoAgent(topic: string, contentType: string, userKeywords: string[], researchData: any): Promise<any> {
    try {
      const hashtagRange = this.getHashtagCount(contentType);

      return await this.minimax.promptJSON(
        'You are a LinkedIn SEO optimization expert.',
        `Create SEO optimization for LinkedIn content about "${topic}"

Context: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
Existing keywords: ${userKeywords.join(', ')}

Generate exactly ${hashtagRange.min}-${hashtagRange.max} hashtags for this ${contentType}.

Return JSON:
{
  "keywords": [{"keyword": "...", "priority": "high/medium/low"}],
  "hashtags": ["#...", "#..."],
  "mentions": [],
  "seoScore": 0-100,
  "linkedinSpecificTips": ["..."]
}`
      );
    } catch (error) {
      logger.error('SEO agent error:', error);
      return { keywords: [], hashtags: [], mentions: [], seoScore: 50 };
    }
  }

  /**
   * Hook Agent — MiniMax (creative writing)
   */
  private async hookAgent(topic: string, researchData: any, persona?: Persona | null): Promise<string[]> {
    try {
      const personaContext = persona ? `Write in the voice of ${persona.name} (${persona.jobRole}, ${persona.tone} tone).` : '';

      const result = await this.minimax.prompt(
        `You are a LinkedIn hook writing specialist. ${personaContext}`,
        `Create 5 scroll-stopping hooks for a LinkedIn post about "${topic}"

Key insights: ${JSON.stringify(researchData.keyInsights?.slice(0, 3))}

Return ONLY a JSON array of 5 hook strings.`,
        { temperature: 0.9 }
      );

      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [`Here's the truth about ${topic}:`, `Let's talk about ${topic}.`, `${topic} is changing fast.`];
    } catch (error) {
      logger.error('Hook agent error:', error);
      return [`Here's the truth about ${topic}:`, `${topic} matters more than ever.`];
    }
  }

  // ==================== SPECIALIZED WRITING AGENTS ====================

  /**
   * Write Post Agent — MiniMax (LinkedIn text post)
   */
  private async writePostAgent(params: any): Promise<any> {
    const {
      topic, persona, outline, researchData, seoData, bestHook,
      targetAudience, customInstructions, hookFormula, ctaType,
      emojiBudget, toneOverride, audienceExpertiseLevel,
    } = params;

    try {
      const personaContext = persona
        ? `Write as ${persona.name} (${persona.jobRole}). Tone: ${toneOverride || persona.tone}.`
        : `Write as a top-tier LinkedIn creator.${toneOverride ? ` Tone: ${toneOverride}.` : ''}`;

      const budget = emojiBudget ?? 3;
      const cta = ctaType || 'comment';
      const formula = hookFormula || 'bold_claim';
      const expertise = audienceExpertiseLevel || 'intermediate';

      const systemPrompt = `You are a world-class LinkedIn ghostwriter. You write for personal profiles using 'I' voice. ${personaContext}

CRITICAL: You MUST return ONLY a valid JSON object matching the requested structure.`;

      const customPrompt = customInstructions
        ? `\nCUSTOM INSTRUCTIONS (MUST ADHERE):\n${customInstructions}`
        : '';

      const result = await this.minimax.promptJSON(
        systemPrompt,
        `Create a LinkedIn text post about "${topic}".

USE THIS HOOK (first line): ${bestHook}
TARGET AUDIENCE: ${targetAudience || 'Professionals'} (expertise: ${expertise})
RESEARCH: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
SEO KEYWORDS: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
HASHTAGS: ${seoData.hashtags?.join(' ')}
${outline ? `OUTLINE: ${JSON.stringify(outline)}` : ''}
${customPrompt}

HOOK WINDOW: First 210 characters must stop the scroll. Use hook formula: ${formula}
CHARACTER LIMIT: Total body ≤ 3,000 characters.
LINE BREAK RULE: Max 3 lines per paragraph. Blank line between every paragraph.
EMOJI BUDGET: Max ${budget} emojis. One in first line boosts impressions ~15%.
LINKS: NEVER in post body. Links suppress reach ~40%. All links go in firstComment.
HASHTAGS: Exactly 3-5 at the very end.
CTA TYPE: Final paragraph uses "${cta}" CTA style.
PERSONAL VOICE: "I" statements, specific personal experience.
BANNED WORDS: leverage, synergy, circle back, innovative, game-changing, paradigm, disruptive, thought leader.

NEGATIVE EXAMPLES (DO NOT write like this):
- "In today's rapidly evolving landscape, it's important to leverage innovative solutions..." (too generic, uses banned words)
- Dense paragraphs with 6+ lines and no spacing.

POSITIVE STRUCTURE:
Line 1: Hook (≤210 chars, emoji ok)
[blank line]
1-3 line paragraph with personal "I" insight
[blank line]
1-3 line paragraph with data/example
[blank line]
1-3 line paragraph with takeaway
[blank line]
CTA question
[blank line]
#hashtag1 #hashtag2 #hashtag3

Return JSON:
{
  "title": "Compelling title",
  "body": "Full post content with hook as first line",
  "hook": "The hook text (first 210 chars)",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "hookFormula": "${formula}",
  "charCount": 0,
  "emojiCount": 0
}`,
        { temperature: 0.8 }
      );

      return {
        ...result,
        content: result.body,
        outline: outline || { sections: [] },
        formattedContent: result.body,
      };
    } catch (error) {
      logger.error('Write post agent error:', error);
      return { title: topic, body: '', content: '', hook: '', hashtags: [], hookFormula: 'bold_claim', charCount: 0, emojiCount: 0, outline: {}, formattedContent: '' };
    }
  }

  /**
   * Write Carousel Agent — MiniMax (LinkedIn PDF carousel)
   */
  private async writeCarouselAgent(params: any): Promise<any> {
    const {
      topic, persona, outline, researchData, seoData, bestHook,
      targetAudience, customInstructions, slideCount, ctaType,
      toneOverride, audienceExpertiseLevel,
    } = params;

    try {
      const personaContext = persona
        ? `Write as ${persona.name} (${persona.jobRole}). Tone: ${toneOverride || persona.tone}.`
        : `Write as a top-tier LinkedIn creator.${toneOverride ? ` Tone: ${toneOverride}.` : ''}`;

      const slides = slideCount || 10;
      const cta = ctaType || 'comment';
      const expertise = audienceExpertiseLevel || 'intermediate';

      const customPrompt = customInstructions
        ? `\nCUSTOM INSTRUCTIONS (MUST ADHERE):\n${customInstructions}`
        : '';

      const result = await this.minimax.promptJSON(
        `You are a LinkedIn carousel specialist. A carousel is a PDF document. ${personaContext}

CRITICAL: You MUST return ONLY a valid JSON object matching the requested structure.`,
        `Create a LinkedIn carousel about "${topic}".

USE THIS HOOK for caption: ${bestHook}
TARGET AUDIENCE: ${targetAudience || 'Professionals'} (expertise: ${expertise})
RESEARCH: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
SEO KEYWORDS: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
${outline ? `OUTLINE: ${JSON.stringify(outline)}` : ''}
${customPrompt}

SLIDE COUNT: Exactly ${slides} slides.
COVER SLIDE: Bold headline ≤ 100 chars, specific outcome promise.
CONTENT SLIDES: One idea per slide. Headline ≤ 150 chars. Body ≤ 300 chars. ≤ 3 bullets.
CTA SLIDE: Last slide with creator handle and specific "${cta}" action.
CAPTION: Text post accompanying PDF, follows post rules, 3-5 hashtags.
ZERO hashtags on actual slides.

Return JSON:
{
  "caption": "Text post accompanying the carousel PDF",
  "captionHashtags": ["#tag1", "#tag2", "#tag3"],
  "slides": [
    {"slideNumber": 1, "type": "cover", "headline": "...", "body": "..."},
    {"slideNumber": 2, "type": "content", "headline": "...", "body": "..."},
    {"slideNumber": ${slides}, "type": "cta", "headline": "...", "body": "..."}
  ],
  "firstComment": ""
}`,
        { temperature: 0.8 }
      );

      return {
        ...result,
        title: result.slides?.[0]?.headline || topic,
        content: result.caption,
        outline: outline || { sections: [] },
        formattedContent: result.caption,
      };
    } catch (error) {
      logger.error('Write carousel agent error:', error);
      return { title: topic, caption: '', captionHashtags: [], slides: [], firstComment: '', content: '', outline: {}, formattedContent: '' };
    }
  }

  /**
   * Write Article Agent — MiniMax (LinkedIn long-form article)
   */
  private async writeArticleAgent(params: any): Promise<any> {
    const {
      topic, persona, outline, researchData, seoData, bestHook,
      targetAudience, customInstructions, articleTargetWords, ctaType,
      toneOverride, audienceExpertiseLevel,
    } = params;

    try {
      const personaContext = persona
        ? `Write as ${persona.name} (${persona.jobRole}). Tone: ${toneOverride || persona.tone}.`
        : `Write as a top-tier LinkedIn creator.${toneOverride ? ` Tone: ${toneOverride}.` : ''}`;

      const targetWords = articleTargetWords || 1500;
      const cta = ctaType || 'comment';
      const expertise = audienceExpertiseLevel || 'intermediate';

      const customPrompt = customInstructions
        ? `\nCUSTOM INSTRUCTIONS (MUST ADHERE):\n${customInstructions}`
        : '';

      const result = await this.minimax.promptJSON(
        `You are a LinkedIn long-form content strategist. ${personaContext}

CRITICAL: You MUST return ONLY a valid JSON object matching the requested structure.`,
        `Create a LinkedIn article about "${topic}".

USE THIS HOOK for excerpt: ${bestHook}
TARGET AUDIENCE: ${targetAudience || 'Professionals'} (expertise: ${expertise})
RESEARCH: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
SEO KEYWORDS: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
${outline ? `OUTLINE: ${JSON.stringify(outline)}` : ''}
${customPrompt}

TITLE: ≤ 100 chars with primary keyword, SEO title.
EXCERPT: First 200 chars as feed card preview, secondary hook.
STRUCTURE: H2 subheading every 200-300 words.
LENGTH: Target ${targetWords} words. Optimal: 1200-2500.
External links ALLOWED, no reach penalty. Include 2-3 credible sources.
HASHTAGS: 0-3 at end.
COVER IMAGE: Provide image generation prompt (16:9, 1920x1080).
CTA: End with "${cta}" call-to-action.

Return JSON:
{
  "title": "SEO-optimized title ≤ 100 chars",
  "excerpt": "First 200 chars preview",
  "body": "Full markdown article with ## headings",
  "sections": [{"heading": "...", "content": "..."}],
  "coverImagePrompt": "16:9 image prompt for...",
  "hashtags": ["#tag1"],
  "readingTimeMinutes": 0,
  "wordCount": 0
}`,
        { temperature: 0.8, maxTokens: 4096 }
      );

      return {
        ...result,
        articleTitle: result.title,
        content: result.body,
        outline: result.sections || outline || { sections: [] },
        formattedContent: result.body,
      };
    } catch (error) {
      logger.error('Write article agent error:', error);
      return { title: topic, excerpt: '', body: '', content: '', sections: [], coverImagePrompt: '', hashtags: [], readingTimeMinutes: 0, wordCount: 0, articleTitle: topic, outline: {}, formattedContent: '' };
    }
  }

  /**
   * Write Poll Agent — MiniMax (LinkedIn poll)
   */
  private async writePollAgent(params: any): Promise<any> {
    const {
      topic, persona, researchData, seoData, bestHook,
      targetAudience, customInstructions, pollDuration, ctaType,
      toneOverride, audienceExpertiseLevel,
    } = params;

    try {
      const personaContext = persona
        ? `Write as ${persona.name} (${persona.jobRole}). Tone: ${toneOverride || persona.tone}.`
        : `Write as a top-tier LinkedIn creator.${toneOverride ? ` Tone: ${toneOverride}.` : ''}`;

      const duration = pollDuration || '1_week';
      const cta = ctaType || 'comment';
      const expertise = audienceExpertiseLevel || 'intermediate';

      const customPrompt = customInstructions
        ? `\nCUSTOM INSTRUCTIONS (MUST ADHERE):\n${customInstructions}`
        : '';

      const result = await this.minimax.promptJSON(
        `You are a LinkedIn engagement specialist focused on poll content. ${personaContext}

CRITICAL: You MUST return ONLY a valid JSON object matching the requested structure.`,
        `Create a LinkedIn poll about "${topic}".

USE THIS HOOK for intro: ${bestHook}
TARGET AUDIENCE: ${targetAudience || 'Professionals'} (expertise: ${expertise})
RESEARCH: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
SEO KEYWORDS: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
${customPrompt}

QUESTION: Max 140 characters. HARD LIMIT.
OPTIONS: 2-4 options, each max 30 characters. HARD LIMIT.
Best performing: binary yes/no, preference, self-assessment, opinion with Neither/Both.
INTRO TEXT: Standard post rules. Set up debate. Share opinion. End with "Vote below 👇"
FIRST COMMENT: Reveal own answer, ask others to share theirs.
CTA: Use "${cta}" style.

Return JSON:
{
  "question": "Poll question ≤ 140 chars",
  "options": [
    {"text": "Option text ≤ 30 chars", "order": 1},
    {"text": "Option text ≤ 30 chars", "order": 2}
  ],
  "duration": "${duration}",
  "introText": "Post body above the poll",
  "introHashtags": ["#tag1", "#tag2", "#tag3"],
  "firstComment": "Creator's answer and CTA"
}`,
        { temperature: 0.8 }
      );

      return {
        ...result,
        title: result.question,
        content: result.introText,
        outline: { sections: [] },
        formattedContent: result.introText,
      };
    } catch (error) {
      logger.error('Write poll agent error:', error);
      return { question: topic, options: [], duration: '1_week', introText: '', introHashtags: [], firstComment: '', title: topic, content: '', outline: {}, formattedContent: '' };
    }
  }

  /**
   * Editing Agent — MiniMax
   */
  private async editingAgent(draft: any, contentType: string, seoData: any, customInstructions?: string): Promise<any> {
    try {
      const customPrompt = customInstructions
        ? `Adhere to these style constraints/templates if provided: ${customInstructions}`
        : '';

      const draftContent = draft.content || draft.caption || draft.introText || draft.body || '';
      
      if (!draftContent) {
        return draft;
      }

      const contentTypeLabel = contentType === 'carousel' ? 'post caption (accompanying the slide deck)' : contentType;

      const result = await this.minimax.promptJSON(
        'You are a LinkedIn content editor specializing in maximum engagement.',
        `Edit this LinkedIn ${contentTypeLabel} for MAXIMUM engagement:

CONTENT: ${draftContent}

Tasks & STRICT RULES:
1. NO DENSE BLOCKS: Break up long paragraphs. Max 1-3 lines per paragraph.
2. SPACING: Ensure double line breaks between paragraphs.
3. Optimize emoji usage (max 3-5 total).
4. Strengthen the hook and call-to-action.
5. Add 3-5 relevant hashtags.
${customPrompt}

Return JSON:
{
  "content": "Edited content string (MUST be a plain text string, NOT a JSON object)"
}

STRICT RULE: Do NOT output any conversational text, greetings, or warnings. ONLY output the requested JSON object. If you encounter an error or missing data, still output valid JSON with your best attempt at editing.`
      );

      let editedContent = result.content;
      if (editedContent && typeof editedContent === 'object') {
        logger.warn('[EditingAgent] result.content returned as object, extracting string');
        editedContent = editedContent.content || editedContent.caption || editedContent.text || JSON.stringify(editedContent);
      }

      return { ...draft, content: editedContent, formattedContent: editedContent };
    } catch (error) {
      logger.error('Editing agent error:', error);
      return draft;
    }
  }

  /**
   * Fact Check Agent — MiniMax
   * Preserves personal narrative; only flags verifiable factual claims.
   */
  private async factCheckAgent(content: any, sources: any[]): Promise<any> {
    try {
      const textToFactCheck = typeof content.content === 'object'
        ? (content.content.content || content.content.caption || content.content.text || JSON.stringify(content.content))
        : (content.content || '');

      const result = await this.minimax.promptJSON(
        `Your job is ONLY to verify or flag specific factual claims. You MUST preserve all personal narrative, opinion, and storytelling completely unchanged.

RULES:
- If the content is primarily personal narrative, return the EXACT original content unchanged.
- Only modify if a specific statistic, date, or quote is verifiably wrong.
- If unsure about a claim, ADD "(stat unverified)" inline next to that claim.
- NEVER replace "I" voice with third-person commentary.
- NEVER rewrite, summarize, or paraphrase the content.
- Return the content as-is unless a concrete factual error exists.`,
        `Fact-check this content:

${textToFactCheck}

SOURCES: ${JSON.stringify(sources?.slice(0, 5))}

Return JSON:
{
  "content": "The content with only factual corrections (or exact original if no changes needed) (MUST be a plain text string, NOT a JSON object)",
  "factsChecked": ["list of facts that were verified"],
  "modified": false
}`,
        { temperature: 0.2 }
      );

      let verifiedContent = result.content;
      if (verifiedContent && typeof verifiedContent === 'object') {
        logger.warn('[FactCheckAgent] result.content returned as object, extracting string');
        verifiedContent = verifiedContent.content || verifiedContent.caption || verifiedContent.text || JSON.stringify(verifiedContent);
      }

      return { ...content, content: verifiedContent, formattedContent: verifiedContent, sources, factsChecked: result.factsChecked || [], modified: result.modified || false };
    } catch (error) {
      logger.error('Fact check agent error:', error);
      return { ...content, verified: false, sources, factsChecked: [], modified: false };
    }
  }

  /**
   * First Comment Agent — MiniMax
   * Generates a strategic first comment for the post.
   */
  private async firstCommentAgent(content: any, contentType: string, topic: string, linkToInclude?: string): Promise<string> {
    try {
      const linkInstruction = linkToInclude
        ? `INCLUDE THIS LINK in the comment: ${linkToInclude}`
        : 'No link to include.';

      const pollInstruction = contentType === 'poll'
        ? 'Reveal your own answer to the poll question and ask others to share theirs.'
        : '';

      const result = await this.minimax.prompt(
        'You are a LinkedIn engagement strategist specializing in first comments.',
        `Write a strategic first comment for this LinkedIn ${contentType} about "${topic}".

MAIN CONTENT PREVIEW: ${(content.content || '').substring(0, 300)}
HASHTAGS ALREADY USED: ${JSON.stringify(content.hashtags || content.introHashtags || content.captionHashtags || [])}

RULES:
- Max 500 characters. HARD LIMIT.
- ${linkInstruction}
- Add 3-5 additional hashtags NOT already used in the main post.
- ${pollInstruction}
- Add value: expand on a point, share a resource, or ask a follow-up question.
- Keep the same voice and tone as the main content.

Return ONLY the first comment text, nothing else.`,
        { temperature: 0.7 }
      );

      return result.substring(0, 500);
    } catch (error) {
      logger.error('First comment agent error:', error);
      return '';
    }
  }

  /**
   * Visual Agent — Gemini (image/visual tasks)
   */
  private async visualAgent(topic: string, content: string, persona?: Persona | null): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const visualDNA = persona?.visualDNA as any;
      const visualStyle = visualDNA?.style ? `Style: ${visualDNA.style}, Colors: ${visualDNA.colorScheme}` : 'Professional, clean LinkedIn imagery';

      const prompt = `Create 3 image generation prompts for a LinkedIn post about "${topic}"

Content summary: ${content.substring(0, 300)}
Visual style: ${visualStyle}

Return JSON:
{
  "prompts": ["Prompt 1...", "Prompt 2...", "Prompt 3..."]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.prompts || [];
      }
      return [`Professional illustration for ${topic}`];
    } catch (error) {
      logger.error('Visual agent error:', error);
      return [`${topic} illustration`];
    }
  }

  /**
   * Timing Agent — MiniMax
   */
  private async timingAgent(targetAudience?: string): Promise<string> {
    try {
      const result = await this.minimax.promptJSON(
        'You are a LinkedIn posting time optimization expert.',
        `Best time to post for: "${targetAudience || 'General B2B audience'}"

Return JSON:
{
  "bestTime": "Tuesday 9:00 AM EST",
  "reason": "..."
}`
      );
      return result.bestTime || 'Tuesday 9:00 AM EST';
    } catch (error) {
      logger.error('Timing agent error:', error);
      return 'Tuesday 9:00 AM EST';
    }
  }

  /**
   * Engagement Predictor — MiniMax
   */
  private async engagementPredictorAgent(content: string, contentType: string, hookSuggestions: string[]): Promise<any> {
    try {
      return await this.minimax.promptJSON(
        'You are a LinkedIn engagement prediction expert.',
        `Predict engagement for this ${contentType}:

Preview: ${content.substring(0, 300)}
Hooks: ${hookSuggestions.slice(0, 3).join(' | ')}

Return JSON:
{
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "predictedImpressions": "..."
}`
      );
    } catch (error) {
      logger.error('Engagement predictor error:', error);
      return { score: 50, strengths: [], weaknesses: [] };
    }
  }

  // ==================== HELPERS ====================

  /**
   * Enforce LinkedIn character limits on generated output.
   */
  private enforceCharacterLimits(output: any, contentType: string): any {
    switch (contentType) {
      case 'post': {
        if (output.body && output.body.length > LINKEDIN_LIMITS.post.maxChars) {
          output.body = this.truncateAtSentence(output.body, LINKEDIN_LIMITS.post.maxChars);
          output.content = output.body;
          output.formattedContent = output.body;
        }
        output.charCount = output.body?.length || 0;
        break;
      }
      case 'poll': {
        if (output.question && output.question.length > LINKEDIN_LIMITS.poll.questionMaxChars) {
          output.question = output.question.substring(0, LINKEDIN_LIMITS.poll.questionMaxChars);
        }
        if (output.options && Array.isArray(output.options)) {
          output.options = output.options.map((opt: any) => ({
            ...opt,
            text: opt.text?.substring(0, LINKEDIN_LIMITS.poll.optionMaxChars) || opt.text,
          }));
        }
        break;
      }
      case 'carousel': {
        if (output.slides && Array.isArray(output.slides)) {
          output.slides = output.slides.map((slide: any) => ({
            ...slide,
            headline: slide.headline?.length > LINKEDIN_LIMITS.carousel.headlineMaxChars
              ? slide.headline.substring(0, LINKEDIN_LIMITS.carousel.headlineMaxChars)
              : slide.headline,
          }));
        }
        break;
      }
      case 'article': {
        if (output.title && output.title.length > LINKEDIN_LIMITS.article.titleMaxChars) {
          output.title = output.title.substring(0, LINKEDIN_LIMITS.article.titleMaxChars);
          output.articleTitle = output.title;
        }
        if (output.excerpt && output.excerpt.length > LINKEDIN_LIMITS.article.excerptMaxChars) {
          output.excerpt = this.truncateAtSentence(output.excerpt, LINKEDIN_LIMITS.article.excerptMaxChars);
        }
        break;
      }
    }
    return output;
  }

  /**
   * Truncate text at the last sentence boundary before maxLen.
   */
  private truncateAtSentence(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;

    const truncated = text.substring(0, maxLen);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > 0) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    return truncated;
  }

  /**
   * Get type-specific hashtag count ranges.
   */
  private getHashtagCount(contentType: string): { min: number; max: number } {
    const counts: Record<string, { min: number; max: number }> = {
      post: { min: 3, max: 5 },
      carousel: { min: 3, max: 5 },
      article: { min: 0, max: 3 },
      poll: { min: 3, max: 5 },
    };
    return counts[contentType] || counts.post;
  }

  /**
   * Count words in a text string.
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Generate content suggestions — MiniMax
   */
  async generateSuggestions(topic: string, gaps: any): Promise<ContentSuggestion[]> {
    try {
      const result = await this.minimax.promptJSON(
        'You are a LinkedIn content strategist.',
        `Generate 5 content ideas for LinkedIn about "${topic}" based on gaps:
${JSON.stringify(gaps)}

Return JSON:
{
  "suggestions": [
    {"title": "...", "angle": "...", "outline": {"sections": [...]}, "format": "post", "targetAudience": "..."}
  ]
}`
      );
      return result.suggestions || [];
    } catch (error) {
      logger.error('Generate suggestions error:', error);
      return [];
    }
  }

  /**
   * Regenerate section — MiniMax
   */
  async regenerateSection(content: string, section: string, instructions: string): Promise<string> {
    try {
      return await this.minimax.prompt(
        'You are a LinkedIn content editor.',
        `Regenerate this section of a LinkedIn post:

FULL CONTENT: ${content}
SECTION: ${section}
INSTRUCTIONS: ${instructions}

Provide only the regenerated section.`,
        { temperature: 0.8 }
      );
    } catch (error) {
      logger.error('Regenerate section error:', error);
      return content;
    }
  }

  /**
   * Generate topic cluster based on user context and optional iteration feedback
   */
  async generateTopicCluster(context: string, feedback?: string, previousTopics?: any[]): Promise<any> {
    try {
      const promptText = feedback
        ? `The user wants to refine a previous topic cluster based on this feedback: "${feedback}"
        
PREVIOUS TOPICS:
${JSON.stringify(previousTopics)}

Please regenerate the topic cluster of 5 topics incorporating this feedback. Keep the context in mind: "${context}"`
        : `Generate a topic cluster of 5 highly engaging LinkedIn topics based on this context: "${context}"`;

      const result = await this.minimax.promptJSON(
        'You are a LinkedIn content strategist specializing in topic authority and content clusters.',
        `${promptText}

Return a JSON object with this exact structure:
{
  "topics": [
    {
      "keyword": "Main topic / focus keyword phrase (2-4 words)",
      "description": "Brief description of the content angle (1-2 sentences)",
      "targetAudience": "Specific target audience for this post",
      "contentType": "post" | "carousel" | "article" | "poll",
      "engagementReason": "Why this topic will resonate on LinkedIn (1 sentence)"
    }
  ]
}`
      );
      return result.topics || [];
    } catch (error) {
      logger.error('Generate topic cluster error:', error);
      return [];
    }
  }

  /**
   * Fulfill additional requests for an approved topic cluster
   */
  async handleAdditionalWants(topics: any[], request: string): Promise<string> {
    try {
      const prompt = `The user has approved a 5-topic LinkedIn cluster. Here are the topics:
${JSON.stringify(topics)}

The user is asking for the following additional thing: "${request}"

Please fulfill the user's request in detail. Provide a helpful, professional response formatted in clean markdown.`;

      return await this.minimax.prompt(
        'You are a LinkedIn content strategist and assistant.',
        prompt,
        { temperature: 0.7 }
      );
    } catch (error) {
      logger.error('Handle additional wants error:', error);
      throw error;
    }
  }
}
