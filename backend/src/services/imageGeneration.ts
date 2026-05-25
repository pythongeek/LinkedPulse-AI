import axios from 'axios';
import { logger } from '../utils/logger';
import {
  LinkedInImagePromptEngine,
  StructuredImagePrompt,
  ImagePurpose,
  LINKEDIN_IMAGE_SPECS,
} from './linkedinImagePromptEngine';

export class ImageGenerationService {
  private provider: string;

  constructor() {
    this.provider = process.env.IMAGE_PROVIDER || 'pollinations';
  }

  // ── Legacy entry point (backwards compat) ────────────────────────

  /**
   * Generate images using the configured provider (legacy path).
   */
  async generateImages(
    prompt: string,
    style: string = 'professional',
    count: number = 1,
    aspectRatio: string = '16:9'
  ): Promise<string[]> {
    switch (this.provider) {
      case 'huggingface':
        return this.generateWithHuggingFace(prompt, style, count);
      case 'pollinations':
      default:
        return this.generateWithPollinations(prompt, style, count, aspectRatio);
    }
  }

  // ── New primary LinkedIn entry point ─────────────────────────────

  /**
   * Generate a LinkedIn-spec image with full persona-aware prompt pipeline.
   * Uses provider chain: HuggingFace → Pollinations (Fal.ai if FAL_API_KEY set).
   */
  async generateLinkedInImage(
    topic: string,
    purpose: ImagePurpose,
    persona?: any,
    contentBody?: string,
    hookFormula?: string,
    campaignId?: string,
    count: number = 1
  ): Promise<string[]> {
    const engine = new LinkedInImagePromptEngine();
    const structuredPrompt = engine.buildPrompt(
      topic,
      purpose,
      persona,
      contentBody,
      hookFormula,
      campaignId
    );

    logger.info(`[ImageGen] Generating ${purpose} image for: "${topic}" | Campaign: ${structuredPrompt.campaignSeed}`);

    const images = await this.providerChain(structuredPrompt, count);
    return images.filter(img => this.isValidImageResponse(img));
  }

  /**
   * Generate coherent carousel image series (all slides share visual identity).
   */
  async generateCarouselImages(
    topic: string,
    slides: Array<{ headline: string; content: string }>,
    style: string = 'professional',
    persona?: any
  ): Promise<string[]> {
    const engine = new LinkedInImagePromptEngine();
    const slideData = slides.map((s, i) => ({
      slideNumber: i + 1,
      type: i === 0 ? 'cover' : 'content',
      headline: s.headline,
    }));

    const prompts = engine.buildCarouselPromptSeries(topic, slideData, persona);

    const images: string[] = [];
    for (const prompt of prompts) {
      const slideImages = await this.providerChain(prompt, 1);
      images.push(...slideImages.filter(img => this.isValidImageResponse(img)));
    }
    return images;
  }

  // ── Provider Chain ─────────────────────────────────────────────

  /**
   * Waterfall provider chain — tries each in order, returns first success.
   */
  private async providerChain(
    prompt: StructuredImagePrompt,
    count: number
  ): Promise<string[]> {
    const providers: Array<() => Promise<string[]>> = [];

    // Primary: Fal.ai (best quality) if API key is configured
    if (process.env.FAL_API_KEY) {
      providers.push(() => this.generateWithFal(prompt, count));
    }

    // Secondary: HuggingFace Stable Diffusion XL
    if (process.env.HUGGINGFACE_API_KEY) {
      providers.push(() => this.generateWithHuggingFace(
        prompt.primaryPrompt,
        'professional',
        count
      ));
    }

    // Fallback: Pollinations.ai (free, always available)
    providers.push(() => this.generateWithPollinations(
      prompt.primaryPrompt,
      'professional',
      count,
      prompt.aspectRatio
    ));

    for (const provider of providers) {
      try {
        const result = await provider();
        if (result && result.length > 0 && result[0]) {
          logger.info(`[ImageGen] Provider success, returning ${result.length} image(s)`);
          return result;
        }
      } catch (err) {
        logger.warn('[ImageGen] Provider failed, trying next:', (err as Error).message);
        continue;
      }
    }

    logger.error('[ImageGen] All providers failed');
    return [];
  }

  // ── Validation ─────────────────────────────────────────────────

  /**
   * Validate image response — reject CDN error pages or empty strings.
   */
  private isValidImageResponse(base64OrUrl: string): boolean {
    if (!base64OrUrl) return false;
    if (base64OrUrl.startsWith('data:image/')) return true;
    if (base64OrUrl.startsWith('https://') || base64OrUrl.startsWith('http://')) return true;
    return false;
  }

  // ── Providers ──────────────────────────────────────────────────

  /**
   * Fal.ai — premium image generation (requires FAL_API_KEY).
   */
  private async generateWithFal(
    prompt: StructuredImagePrompt,
    count: number
  ): Promise<string[]> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY not configured');

    const response = await axios.post(
      'https://fal.run/fal-ai/flux/schnell',
      {
        prompt: prompt.primaryPrompt,
        negative_prompt: prompt.negativePrompt,
        image_size: {
          width: prompt.spec.width,
          height: prompt.spec.height,
        },
        num_images: count,
        enable_safety_checker: true,
      },
      {
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const images = response.data?.images || [];
    return images.map((img: any) => img.url || img).filter(Boolean);
  }

  /**
   * Pollinations.ai — free fallback, no API key required.
   */
  private async generateWithPollinations(
    prompt: string,
    style: string,
    count: number,
    aspectRatio: string = '1.91:1'
  ): Promise<string[]> {
    try {
      const stylePrompts: Record<string, string> = {
        professional: 'clean, modern, corporate, professional photography',
        creative:     'vibrant, artistic, creative illustration, bold colors',
        minimal:      'minimalist, simple, clean lines, lots of whitespace',
        tech:         'futuristic, technology, digital, neon accents, dark theme',
        bold:         'high contrast, impactful, strong visual, dramatic',
      };

      const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.professional}`;
      const encodedPrompt = encodeURIComponent(fullPrompt);

      // Map ratio to dimensions
      const dimensionMap: Record<string, { width: number; height: number }> = {
        '1.91:1': { width: 1200, height: 627 },
        '1:1':    { width: 1080, height: 1080 },
        '4:1':    { width: 1584, height: 396 },
        '16:9':   { width: 1200, height: 627 },
        '4:3':    { width: 1024, height: 768 },
        '9:16':   { width: 627,  height: 1200 },
      };

      const dims = dimensionMap[aspectRatio] || dimensionMap['1.91:1'];
      const images: string[] = [];

      for (let i = 0; i < count; i++) {
        const seed = Math.floor(Math.random() * 99999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true&model=flux`;

        try {
          const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
          });
          const base64 = Buffer.from(response.data, 'binary').toString('base64');
          images.push(`data:image/jpeg;base64,${base64}`);
        } catch (fetchError) {
          logger.warn('[ImageGen] Pollinations fetch failed, using raw URL');
          images.push(imageUrl); // fallback to raw URL
        }
      }

      return images;
    } catch (error) {
      logger.error('[ImageGen] Pollinations error:', error);
      return [];
    }
  }

  /**
   * HuggingFace Stable Diffusion XL — secondary provider.
   */
  private async generateWithHuggingFace(
    prompt: string,
    style: string,
    count: number
  ): Promise<string[]> {
    try {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) throw new Error('HuggingFace API key not configured');

      const stylePrompts: Record<string, string> = {
        professional: 'professional, corporate, clean, business',
        creative:     'artistic, creative, colorful, editorial',
        minimal:      'minimalist, simple, clean, lots of whitespace',
        tech:         'futuristic, technology, digital, neon',
        bold:         'bold, high contrast, dramatic, poster',
      };

      const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.professional}`;

      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
          { inputs: fullPrompt },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 45000,
          }
        );

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        results.push(`data:image/png;base64,${base64}`);
      }

      return results;
    } catch (error) {
      logger.error('[ImageGen] HuggingFace error:', error);
      return [];
    }
  }

  /**
   * Generate image prompt from content using Gemini.
   */
  async generateImagePrompt(content: string, style: string = 'professional'): Promise<string> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(
        `Based on this LinkedIn content, create a concise image generation prompt for a professional LinkedIn visual.

CONTENT: ${content.substring(0, 500)}
STYLE: ${style}

Requirements:
- No faces, no handshakes, no text overlay
- Professional, B2B appropriate
- Specific visual concept (not abstract nouns)
- Include composition and color palette

Return only the image prompt, 1-2 sentences max.`
      );
      return result.response.text().trim();
    } catch (error) {
      logger.error('[ImageGen] generateImagePrompt error:', error);
      return content.substring(0, 200);
    }
  }
}
