import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { contentGenerationSchema } from '../utils/validation';
import { JobService } from '../services/jobService';
import { ContentGenerationService } from '../services/contentGeneration';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Generate content
 * POST /api/content/generate
 */
router.post('/generate', authenticate, validateBody(contentGenerationSchema), async (req, res) => {
  try {
    const {
      topic,
      contentType,
      personaId,
      outline,
      researchDepth,
      includeImages,
      customInstructions,
      keywords,
      targetAudience,
      hookFormula,
      slideCount,
      pollDuration,
      articleTargetWords,
      ctaType,
      toneOverride,
      emojiBudget,
      includeFirstComment,
      linkToInclude,
      audienceExpertiseLevel,
    } = req.body;
    const userId = req.user!.id;

    // Get persona if specified
    let persona = null;
    if (personaId) {
      persona = await prisma.persona.findFirst({
        where: { id: personaId, userId },
      });
    }

    // Use default persona if none specified
    if (!persona) {
      persona = await prisma.persona.findFirst({
        where: { userId, isDefault: true },
      });
    }

    // Enqueue job instead of processing synchronously
    const job = await JobService.enqueue('CONTENT_GENERATION', {
      userId,
      options: {
        topic,
        contentType,
        persona,
        outline,
        researchDepth,
        includeImages,
        customInstructions,
        keywords,
        targetAudience,
        hookFormula,
        slideCount,
        pollDuration,
        articleTargetWords,
        ctaType,
        toneOverride,
        emojiBudget,
        includeFirstComment,
        linkToInclude,
        audienceExpertiseLevel,
      }
    });

    logger.info(`Content generation job enqueued: ${job.id} for user: ${userId}`);

    res.status(202).json({
      message: 'Content generation started',
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Content generation error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to start content generation',
        code: 'CONTENT_ERROR',
      },
    });
  }
});

/**
 * Get all content for user
 * GET /api/content
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, contentType, limit = '20', offset = '0' } = req.query;

    const contents = await prisma.content.findMany({
      where: {
        userId: req.user!.id,
        ...(status && { status: status as string }),
        ...(contentType && { contentType: contentType as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.content.count({
      where: {
        userId: req.user!.id,
        ...(status && { status: status as string }),
        ...(contentType && { contentType: contentType as string }),
      },
    });

    res.json({
      contents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch content',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get single content
 * GET /api/content/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;

    const content = await prisma.content.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ content });
  } catch (error) {
    logger.error('Get single content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch content',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Update content
 * PUT /api/content/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { title, body, status, scheduledFor } = req.body;

    // Check if content exists and belongs to user
    const existingContent = await prisma.content.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existingContent) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(body && { body }),
        ...(status && { status }),
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
        ...(status === 'published' && { publishedAt: new Date() }),
      },
    });

    logger.info(`Content updated: ${id}`);

    res.json({
      message: 'Content updated successfully',
      content: updatedContent,
    });
  } catch (error) {
    logger.error('Update content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update content',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Delete content
 * DELETE /api/content/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;

    // Check if content exists and belongs to user
    const existingContent = await prisma.content.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existingContent) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    await prisma.content.delete({
      where: { id },
    });

    logger.info(`Content deleted: ${id}`);

    res.json({
      message: 'Content deleted successfully',
    });
  } catch (error) {
    logger.error('Delete content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete content',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get content suggestions
 * POST /api/content/suggestions
 */
router.post('/suggestions', authenticate, async (req, res) => {
  try {
    const { topic, gaps } = req.body;

    const contentService = new ContentGenerationService();
    const suggestions = await contentService.generateSuggestions(topic, gaps);

    res.json({ suggestions });
  } catch (error) {
    logger.error('Content suggestions error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate suggestions',
        code: 'CONTENT_ERROR',
      },
    });
  }
});

/**
 * Regenerate content section
 * POST /api/content/:id/regenerate
 */
router.post('/:id/regenerate', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { section, instructions } = req.body;

    const content = await prisma.content.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const contentService = new ContentGenerationService();
    const regenerated = await contentService.regenerateSection(
      content.body,
      section,
      instructions
    );

    res.json({
      regenerated,
    });
  } catch (error) {
    logger.error('Regenerate content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to regenerate content',
        code: 'CONTENT_ERROR',
      },
    });
  }
});

/**
 * Export content for LinkedIn
 * GET /api/content/:id/export
 */
router.get('/:id/export', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { format = 'text' } = req.query;

    const content = await prisma.content.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    let exported = '';

    switch (format) {
      case 'html':
        exported = `<h1>${content.title}</h1>\n${content.body.replace(/\n/g, '<br>')}`;
        break;
      case 'markdown':
        exported = `# ${content.title}\n\n${content.body}`;
        break;
      case 'json':
        exported = JSON.stringify(content, null, 2);
        break;
      default:
        exported = content.body;
    }

    res.json({
      exported,
      format,
    });
  } catch (error) {
    logger.error('Export content error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to export content',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Publish content to LinkedIn
 * POST /api/content/:id/publish
 */
router.post('/:id/publish', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const content = await prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Determine the text to publish
    let textToPublish = content.body || (content as any).content || '';
    if (textToPublish === 'undefined') {
      textToPublish = '';
    }

    // Format poll for publication if it is a poll
    if (content.contentType === 'poll' && content.pollQuestion) {
      const options = content.pollOptions as any;
      let optionsText = '';
      if (Array.isArray(options)) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        optionsText = options
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((opt: any, index: number) => {
            const emoji = numberEmojis[index] || '🔹';
            return `${emoji} ${opt.text}`;
          })
          .join('\n');
      }
      const prefix = textToPublish.trim() ? `${textToPublish}\n\n` : '';
      textToPublish = `${prefix}📊 POLL:\n❓ ${content.pollQuestion}\n\n${optionsText}\n\n👇 Vote by replying with your choice in the comments!`;
    }

    // Format carousel for publication if it is a carousel
    if (content.contentType === 'carousel' && content.slides) {
      const slidesList = content.slides as any;
      if (Array.isArray(slidesList) && slidesList.length > 0) {
        const slidesText = slidesList
          .sort((a: any, b: any) => (a.slideNumber || 0) - (b.slideNumber || 0))
          .map((slide: any) => {
            const slideHeader = `Slide ${slide.slideNumber}: ${slide.headline}`;
            const slideBody = slide.body ? `\n   ${slide.body}` : '';
            return `${slideHeader}${slideBody}`;
          })
          .join('\n\n');
        const prefix = textToPublish.trim() ? `${textToPublish}\n\n` : '';
        textToPublish = `${prefix}📖 CAROUSEL SLIDES OUTLINE:\n\n${slidesText}`;
      }
    }

    if (!textToPublish.trim()) {
      return res.status(400).json({
        error: {
          message: 'Content body is empty',
          code: 'BAD_REQUEST',
        },
      });
    }

    // 1. Try to get token from DB (if OAuth is implemented)
    // 2. Fall back to environment variable for single-tenant / admin setup
    let accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    // We check the DB for an OAuth token
    const session = await prisma.linkedInSession.findUnique({ where: { userId } });
    if (session && session.accessToken) {
       accessToken = session.accessToken;
    }

    if (!accessToken) {
      return res.status(401).json({
        error: {
          message: 'LinkedIn API access token not configured in environment or session. Please connect your LinkedIn account via OAuth.',
          code: 'LINKEDIN_UNAUTHORIZED',
        },
      });
    }

    // Import dynamically to avoid circular dependencies if any
    const { LinkedInPublisher } = await import('../services/linkedinPublisher.js');
    
    let postUrn = '';
    
    const hasImage = Array.isArray(content.images) && content.images.length > 0 && typeof content.images[0] === 'string' && content.images[0].trim() !== '';

    if (hasImage) {
      try {
        const imageUrlOrBase64 = (content.images as string[])[0];
        let imageBuffer: Buffer;
        
        if (imageUrlOrBase64.startsWith('data:image')) {
          // Parse base64
          const base64Data = imageUrlOrBase64.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // Download image from URL
          const axios = (await import('axios')).default;
          const imageRes = await axios.get(imageUrlOrBase64, { responseType: 'arraybuffer' });
          imageBuffer = Buffer.from(imageRes.data);
        }

        // 1. Register Upload
        const { uploadUrl, assetUrn } = await LinkedInPublisher.registerImageUpload(accessToken);
        
        // 2. Upload binary
        await LinkedInPublisher.uploadImageBinary(uploadUrl, imageBuffer, accessToken);
        
        // 3. Publish post with image
        postUrn = await LinkedInPublisher.publishImage(textToPublish, assetUrn, accessToken);
      } catch (imageUploadError) {
        logger.error('Failed to upload and publish image, falling back to text post', imageUploadError);
        // Fallback to text
        postUrn = await LinkedInPublisher.publishText(textToPublish, accessToken);
      }
    } else {
      postUrn = await LinkedInPublisher.publishText(textToPublish, accessToken);
    }

    // If firstComment exists, publish it as a comment to the post URN
    if (content.firstComment) {
      try {
        await LinkedInPublisher.publishComment(postUrn, content.firstComment, accessToken);
        logger.info(`Strategic first comment published automatically for post: ${postUrn}`);
      } catch (commentError) {
        logger.error(`Failed to publish automatic first comment for ${postUrn}:`, commentError);
      }
    }

    // Update content status
    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    logger.info(`Content published to LinkedIn: ${id} (URN: ${postUrn})`);

    res.json({
      message: 'Successfully published to LinkedIn',
      postUrn,
      content: updatedContent,
    });
  } catch (error: any) {
    logger.error('Publish content error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to publish content to LinkedIn',
        code: 'PUBLISH_ERROR',
      },
    });
  }
});

/**
 * Regenerate image for content
 * POST /api/content/:id/image/regenerate
 */
router.post('/:id/image/regenerate', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { prompt } = req.body;

    const content = await prisma.content.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!content) {
      return res.status(404).json({
        error: { message: 'Content not found', code: 'NOT_FOUND' },
      });
    }

    const { ImageGenerationService } = await import('../services/imageGeneration.js');
    const imageGen = new ImageGenerationService();
    
    // Check for persona
    const persona = content.personaId 
      ? await prisma.persona.findUnique({ where: { id: content.personaId } })
      : null;

    // Determine purpose based on content type
    let purpose: any = 'feed_post';
    if (content.contentType === 'carousel') purpose = 'carousel_cover';
    if (content.contentType === 'article') purpose = 'article_cover';

    // Generate new images using the new pipeline
    const images = await imageGen.generateLinkedInImage(
      prompt || content.title || 'LinkedIn professional image',
      purpose,
      persona,
      content.body,
      undefined,
      undefined,
      1
    );
    
    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        images: images,
      },
    });

    res.json({
      message: 'Image regenerated successfully',
      content: updatedContent,
    });
  } catch (error) {
    logger.error('Regenerate image error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to regenerate image',
        code: 'IMAGE_GENERATION_ERROR',
      },
    });
  }
});

export default router;
