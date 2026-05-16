import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { imageGenerationSchema } from '../utils/validation';
import { ImageGenerationService } from '../services/imageGeneration';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Generate images
 * POST /api/images/generate
 */
router.post('/generate', authenticate, validateBody(imageGenerationSchema), async (req, res) => {
  try {
    const { prompt, style, count, aspectRatio } = req.body;
    const userId = req.user!.id;

    const imageService = new ImageGenerationService();
    const images = await imageService.generateImages(prompt, style, count, aspectRatio);

    // Update usage stats
    await prisma.usageStats.updateMany({
      where: { userId },
      data: { imagesCreated: { increment: count } },
    });

    res.json({
      images,
      prompt,
      style,
    });
  } catch (error) {
    logger.error('Image generation error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate images',
        code: 'IMAGE_ERROR',
      },
    });
  }
});

/**
 * Generate carousel images
 * POST /api/images/carousel
 */
router.post('/carousel', authenticate, async (req, res) => {
  try {
    const { topic, slides, style } = req.body;
    const userId = req.user!.id;

    const imageService = new ImageGenerationService();
    const images = await imageService.generateCarouselImages(topic, slides, style);

    // Update usage stats
    await prisma.usageStats.updateMany({
      where: { userId },
      data: { imagesCreated: { increment: slides.length } },
    });

    res.json({
      images,
      topic,
    });
  } catch (error) {
    logger.error('Carousel generation error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate carousel images',
        code: 'IMAGE_ERROR',
      },
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
