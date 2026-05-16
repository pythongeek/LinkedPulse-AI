import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from '@prisma/client';
import { MiniMaxClient } from './minimax';
import { PersonaService } from './personaService';
import { ResearchService } from './researchService';
import { TrendAnalyzer } from './trendAnalyzer';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ContentGenerationOptions {
  topic: string;
  contentType: 'post' | 'carousel' | 'article' | 'poll';
  persona?: Persona | null;
  outline?: any;
  researchDepth: 'quick' | 'deep';
  includeImages: boolean;
  targetAudience?: string;
  keywords?: string[];
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
 * MiniMax M2.7 = Main Agent (content planning, writing, editing, engagement)
 * Gemini = Search/Visual Agent (research grounding, image generation, visual analysis)
 */
export class ContentGenerationService {
  private minimax: MiniMaxClient;
  private researchService: ResearchService;
  private trendAnalyzer: TrendAnalyzer;

  constructor() {
    this.minimax = new MiniMaxClient();
    this.researchService = new ResearchService();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  /**
   * Main content generation — orchestrates all agents
   */
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent> {
    const { topic, contentType, persona, outline, researchDepth, includeImages, targetAudience, keywords } = options;

    try {
      // Phase 1: Research (Gemini for grounding) + Trend Analysis (MiniMax)
      logger.info(`[Phase 1] Research & Trend Analysis for: ${topic}`);
      const [researchData, trendData, competitiveAnalysis] = await Promise.all([
        this.researchAgent(topic, researchDepth),
        this.trendAgent(topic),
        this.competitorAnalysisAgent(topic),
      ]);

      // Phase 2: SEO & Keywords (MiniMax)
      logger.info(`[Phase 2] SEO Optimization`);
      const seoData = await this.seoAgent(topic, keywords || [], researchData);

      // Phase 3: Hook Generation (MiniMax)
      logger.info(`[Phase 3] Hook Generation`);
      const hookSuggestions = await this.hookAgent(topic, researchData, persona);

      // Phase 4: Content Writing (MiniMax — main agent)
      logger.info(`[Phase 4] Content Writing`);
      const draft = await this.writingAgent({
        topic, contentType, persona, outline, researchData, seoData,
        bestHook: hookSuggestions[0], targetAudience,
      });

      // Phase 5: Editing (MiniMax)
      logger.info(`[Phase 5] Editing & Optimization`);
      const edited = await this.editingAgent(draft, contentType, seoData);

      // Phase 6: Fact Checking (MiniMax)
      logger.info(`[Phase 6] Fact Checking`);
      const verified = await this.factCheckAgent(edited, researchData.sources);

      // Phase 7: Visual (Gemini — visual tasks)
      let imagePrompts: string[] = [];
      if (includeImages) {
        logger.info(`[Phase 7] Visual Content Generation`);
        imagePrompts = await this.visualAgent(topic, verified.content, persona);
      }

      // Phase 8: Timing (MiniMax)
      logger.info(`[Phase 8] Timing Optimization`);
      const bestPostingTime = await this.timingAgent(targetAudience);

      // Phase 9: Engagement Prediction (MiniMax)
      const engagementData = await this.engagementPredictorAgent(verified.content, contentType, hookSuggestions);

      return {
        title: verified.title,
        content: verified.content,
        outline: verified.outline,
        researchData,
        sources: verified.sources,
        images: [],
        imagePrompts,
        engagementPrediction: engagementData.score,
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
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw error;
    }
  }

  // ==================== AGENTS ====================

  /**
   * Research Agent — Gemini (Google Search Grounding)
   */
  private async researchAgent(topic: string, depth: 'quick' | 'deep'): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Research the topic: "${topic}" thoroughly for LinkedIn content.

Tasks:
1. Find latest statistics and data (2024-2025 preferred, with sources)
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
  private async seoAgent(topic: string, userKeywords: string[], researchData: any): Promise<any> {
    try {
      return await this.minimax.promptJSON(
        'You are a LinkedIn SEO optimization expert.',
        `Create SEO optimization for LinkedIn content about "${topic}"

Context: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
Existing keywords: ${userKeywords.join(', ')}

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

  /**
   * Writing Agent — MiniMax (main content writer)
   */
  private async writingAgent(params: {
    topic: string; contentType: string; persona?: Persona | null;
    outline?: any; researchData: any; seoData: any; bestHook: string; targetAudience?: string;
  }): Promise<any> {
    const { topic, contentType, persona, outline, researchData, seoData, bestHook, targetAudience } = params;

    try {
      let systemPrompt = 'You are an expert LinkedIn content writer who creates viral, engaging posts.';
      if (persona) systemPrompt = persona.systemPrompt;

      const result = await this.minimax.promptJSON(
        systemPrompt,
        `Create a LinkedIn ${contentType} about "${topic}".

USE THIS HOOK (first line): ${bestHook}
TARGET AUDIENCE: ${targetAudience || 'Professionals'}
RESEARCH: ${JSON.stringify(researchData.keyInsights?.slice(0, 5))}
SEO KEYWORDS: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
HASHTAGS: ${seoData.hashtags?.join(' ')}
${outline ? `OUTLINE: ${JSON.stringify(outline)}` : ''}

${this.getContentTypeRequirements(contentType)}

Return JSON:
{
  "title": "Compelling title",
  "content": "Full content with hook as first line",
  "outline": {"sections": [...]},
  "formattedContent": "Content with **bold** formatting"
}`,
        { temperature: 0.8, maxTokens: 4096 }
      );

      return result;
    } catch (error) {
      logger.error('Writing agent error:', error);
      return { title: topic, content: 'Error generating content.', outline: {}, formattedContent: '' };
    }
  }

  /**
   * Editing Agent — MiniMax
   */
  private async editingAgent(draft: any, contentType: string, seoData: any): Promise<any> {
    try {
      const result = await this.minimax.promptJSON(
        'You are a LinkedIn content editor specializing in maximum engagement.',
        `Edit this LinkedIn ${contentType} for MAXIMUM engagement:

CONTENT: ${draft.content}

Tasks:
1. Strengthen the hook
2. Improve readability
3. Optimize emoji usage
4. Strengthen call-to-action
5. Add 3-5 relevant hashtags

Return JSON:
{
  "content": "Edited content",
  "formattedContent": "Content with **bold** formatting",
  "improvements": ["..."]
}`
      );

      return { ...draft, ...result };
    } catch (error) {
      logger.error('Editing agent error:', error);
      return draft;
    }
  }

  /**
   * Fact Check Agent — MiniMax
   */
  private async factCheckAgent(content: any, sources: any[]): Promise<any> {
    try {
      const result = await this.minimax.promptJSON(
        'You are a fact-checking specialist for LinkedIn content.',
        `Fact-check this content:

${content.content}

SOURCES: ${JSON.stringify(sources?.slice(0, 5))}

Return JSON:
{
  "verified": true/false,
  "content": "Updated content with verified claims",
  "title": "${content.title}",
  "outline": ${JSON.stringify(content.outline || {})},
  "formattedContent": "${content.formattedContent || ''}"
}`
      );

      return { ...content, ...result, sources };
    } catch (error) {
      logger.error('Fact check agent error:', error);
      return { ...content, verified: false, sources };
    }
  }

  /**
   * Visual Agent — Gemini (image/visual tasks)
   */
  private async visualAgent(topic: string, content: string, persona?: Persona | null): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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

  private getContentTypeRequirements(contentType: string): string {
    const requirements: Record<string, string> = {
      post: '150-300 words, single topic, strong hook, 3-5 takeaways, clear CTA',
      carousel: '8-12 slides, one point per slide, visual-first, consistent design',
      article: '800-1500 words, headings, data throughout, intro + conclusion',
      poll: 'Clear question, 2-4 options, encourages comments, follow-up context',
    };
    return `FORMAT: ${requirements[contentType] || requirements.post}`;
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
}
