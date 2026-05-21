import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { imageGenerationSchema } from '../utils/validation';
import { ImageGenerationService } from '../services/imageGeneration';
import { LinkedInImagePromptEngine } from '../services/linkedinImagePromptEngine';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Generate images
 * POST /api/images/generate
 */
router.post('/generate', authenticate, validateBody(imageGenerationSchema), async (req, res) => {
  try {
    const { prompt, style, count = 1, aspectRatio, purpose, personaId, hookFormula, campaignId } = req.body;
    const userId = req.user!.id;

    const imageService = new ImageGenerationService();
    let images: string[];
    let promptToReturn = prompt;

    if (personaId || purpose) {
      // New LinkedIn-spec path: persona-aware, purpose-driven
      let persona = null;
      if (personaId) {
        persona = await prisma.persona.findFirst({ where: { id: personaId, userId } });
      }
      const imagePurpose = (purpose as any) || 'feed_post';
      
      const promptEngine = new LinkedInImagePromptEngine();
      const structuredPrompt = promptEngine.buildPrompt(
        prompt,
        imagePurpose,
        persona,
        undefined,
        hookFormula,
        campaignId
      );

      if (count === 0) {
        return res.json({
          images: [],
          prompt: structuredPrompt.primaryPrompt,
          style,
          purpose: imagePurpose,
          provider: 'chain',
        });
      }

      images = await imageService.generateLinkedInImage(
        prompt,
        imagePurpose,
        persona,
        undefined,
        hookFormula,
        campaignId,
        count
      );
      
      // Override prompt with the generated one so client can see it
      promptToReturn = structuredPrompt.primaryPrompt;
    } else {
      // Legacy path
      images = await imageService.generateImages(prompt, style, count, aspectRatio);
    }

    await prisma.usageStats.updateMany({
      where: { userId },
      data: { imagesCreated: { increment: count } },
    });

    res.json({
      images,
      prompt: promptToReturn,
      style,
      purpose: purpose || 'legacy',
      provider: 'chain',
    });
  } catch (error) {
    logger.error('Image generation error:', error);
    res.status(500).json({
      error: { message: 'Failed to generate images', code: 'IMAGE_ERROR' },
    });
  }
});

/**
 * Generate carousel images
 * POST /api/images/carousel
 */
router.post('/carousel', authenticate, async (req, res) => {
  try {
    const { topic, slides, style, personaId } = req.body;
    const userId = req.user!.id;

    let persona = null;
    if (personaId) {
      persona = await prisma.persona.findFirst({ where: { id: personaId, userId } });
    }

    const imageService = new ImageGenerationService();
    const images = await imageService.generateCarouselImages(topic, slides, style, persona);

    await prisma.usageStats.updateMany({
      where: { userId },
      data: { imagesCreated: { increment: slides.length } },
    });

    res.json({ images, topic });
  } catch (error) {
    logger.error('Carousel generation error:', error);
    res.status(500).json({
      error: { message: 'Failed to generate carousel images', code: 'IMAGE_ERROR' },
    });
  }
});

/**
 * Generate banner image
 * POST /api/images/banner
 */
router.post('/banner', authenticate, async (req, res) => {
  try {
    const { prompt, style } = req.body;
    const userId = req.user!.id;

    const imageService = new ImageGenerationService();
    const images = await imageService.generateImages(
      `${prompt}, LinkedIn banner, professional header image`,
      style,
      1,
      '16:9'
    );

    // Update usage stats
    await prisma.usageStats.updateMany({
      where: { userId },
      data: { imagesCreated: { increment: 1 } },
    });

    res.json({
      images,
    });
  } catch (error) {
    logger.error('Banner generation error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate banner',
        code: 'IMAGE_ERROR',
      },
    });
  }
});

export default router;
