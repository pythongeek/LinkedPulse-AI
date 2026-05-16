import axios from 'axios';
import { logger } from '../utils/logger';

export class ImageGenerationService {
  private provider: string;

  constructor() {
    this.provider = process.env.IMAGE_PROVIDER || 'pollinations';
  }

  /**
   * Generate images using the configured provider
   */
  async generateImages(
    prompt: string,
    style: string = 'professional',
    count: number = 1,
    aspectRatio: string = '16:9'
  ): Promise<string[]> {
    switch (this.provider) {
      case 'pollinations':
        return this.generateWithPollinations(prompt, style, count, aspectRatio);
      case 'huggingface':
        return this.generateWithHuggingFace(prompt, style, count);
      default:
        return this.generateWithPollinations(prompt, style, count, aspectRatio);
    }
  }

  /**
   * Generate images using Pollinations.ai (free, no API key)
   */
  private async generateWithPollinations(
    prompt: string,
    style: string,
    count: number,
    aspectRatio: string
  ): Promise<string[]> {
    try {
      const stylePrompts: Record<string, string> = {
        professional: 'clean, modern, corporate, professional photography',
        creative: 'vibrant, artistic, creative illustration, bold colors',
        minimal: 'minimalist, simple, clean lines, lots of whitespace',
        tech: 'futuristic, technology, digital, neon accents, dark theme',
        bold: 'high contrast, impactful, strong visual, dramatic',
      };

      const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.professional}`;
      const encodedPrompt = encodeURIComponent(fullPrompt);

      // Pollinations dimensions
      const dimensions: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1200, height: 627 },
        '4:3': { width: 1024, height: 768 },
        '9:16': { width: 627, height: 1200 },
      };

      const dims = dimensions[aspectRatio] || dimensions['16:9'];

      const images: string[] = [];
      for (let i = 0; i < count; i++) {
        // Add random seed for variety
        const seed = Math.floor(Math.random() * 10000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true`;
        images.push(imageUrl);
      }

      return images;
    } catch (error) {
      logger.error('Pollinations generation error:', error);
      return [];
    }
  }

  /**
   * Generate images using HuggingFace
   */
  private async generateWithHuggingFace(
    prompt: string,
    style: string,
    count: number
  ): Promise<string[]> {
    try {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error('HuggingFace API key not configured');
      }

      const stylePrompts: Record<string, string> = {
        professional: 'professional, corporate, clean',
        creative: 'artistic, creative, colorful',
        minimal: 'minimalist, simple, clean',
        tech: 'futuristic, technology, digital',
        bold: 'bold, high contrast, dramatic',
      };

      const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.professional}`;

      // Using Stable Diffusion via HuggingFace Inference API
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        { inputs: fullPrompt },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      // Convert to base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return [`data:image/png;base64,${base64}`];
    } catch (error) {
      logger.error('HuggingFace generation error:', error);
      // Fallback to Pollinations
      return this.generateWithPollinations(prompt, style, count, '16:9');
    }
  }

  /**
   * Generate carousel images
   */
  async generateCarouselImages(
    topic: string,
    slides: Array<{ headline: string; content: string }>,
    style: string = 'professional'
  ): Promise<string[]> {
    try {
      const images: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const prompt = `LinkedIn carousel slide ${i + 1} about ${topic}: ${slide.headline}. ${slide.content}. Clean, professional design with icons.`;
        
        const slideImages = await this.generateWithPollinations(prompt, style, 1, '1:1');
        images.push(...slideImages);
      }

      return images;
    } catch (error) {
      logger.error('Carousel generation error:', error);
      return [];
    }
  }

  /**
   * Generate image prompt from content
   */
  async generateImagePrompt(content: string, style: string = 'professional'): Promise<string> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Based on this LinkedIn content, create a detailed image generation prompt:

CONTENT:
${content}

Create a prompt that:
1. Captures the main theme
2. Is visually descriptive
3. Works well for LinkedIn (professional)
4. Includes style: ${style}

Return only the image prompt, nothing else.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      logger.error('Generate image prompt error:', error);
      return content.substring(0, 200);
    }
  }
}
