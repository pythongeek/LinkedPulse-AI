import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { contentGenerationSchema } from '../utils/validation';
import { JobService } from '../services/jobService';
import { ContentGenerationService } from '../services/contentGeneration';
import { logger } from '../utils/logger';

const router = Router();

router.get('/debug/:id', async (req, res) => {
  try {
    const record = await prisma.content.findUnique({
      where: { id: req.params.id },
    });
    return res.json({ record });
  } catch (error: any) {
    return res.json({ error: error.message });
  }
});

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
    const { title, body, status, scheduledFor, slides, firstComment, linkedinOptimization } = req.body;

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
        ...(slides !== undefined && { slides: slides as any }),
        ...(firstComment !== undefined && { firstComment }),
        ...(linkedinOptimization !== undefined && { linkedinOptimization: linkedinOptimization as any }),
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
    
    const authorUrn = session?.selectedAuthorUrn || undefined;
    const postUrn = await LinkedInPublisher.publishContentRecord(content, accessToken, logger, authorUrn);


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

/**
 * Generate a topic cluster based on user context and optional iteration feedback
 * POST /api/content/topic-cluster
 */
router.post('/topic-cluster', authenticate, async (req, res) => {
  try {
    const { context, feedback, previousTopics } = req.body;
    if (!context) {
      return res.status(400).json({ error: { message: 'Context is required' } });
    }

    const contentService = new ContentGenerationService();
    const topics = await contentService.generateTopicCluster(context, feedback, previousTopics);

    res.json({ topics });
  } catch (error: any) {
    logger.error('Topic cluster generation error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to generate topic cluster',
        code: 'CLUSTER_ERROR',
      },
    });
  }
});

/**
 * Enqueue content generation jobs for a topic cluster, optionally scheduling them
 * POST /api/content/schedule-cluster
 */
router.post('/schedule-cluster', authenticate, async (req, res) => {
  try {
    const { topics, schedule } = req.body; // schedule: boolean
    const userId = req.user!.id;

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: { message: 'Topics array is required' } });
    }

    // Save topics to user's TopicWatchlist
    for (const t of topics) {
      try {
        await prisma.topicWatchlist.create({
          data: {
            userId,
            keyword: t.keyword,
            contentType: t.contentType || 'post',
            topicType: 'cluster',
            audienceSegment: t.targetAudience || 'B2B',
          },
        });
      } catch (err) {
        logger.warn(`Failed to create topic watchlist item for ${t.keyword}:`, err);
      }
    }

    const jobIds: string[] = [];
    const now = new Date();

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      
      // Stagger schedule by i + 1 days starting tomorrow if schedule is true
      let scheduledFor: string | undefined = undefined;
      if (schedule) {
        const date = new Date(now);
        date.setDate(now.getDate() + (i + 1));
        // Default to 10:00 AM
        date.setHours(10, 0, 0, 0);
        scheduledFor = date.toISOString();
      }

      // Enqueue job
      const job = await JobService.enqueue('CONTENT_GENERATION', {
        userId,
        options: {
          topic: topic.keyword,
          contentType: topic.contentType || 'post',
          targetAudience: topic.targetAudience,
          researchDepth: 'quick',
          includeImages: true,
          status: schedule ? 'scheduled' : 'draft',
          scheduledFor,
        },
      });

      jobIds.push(job.id);
    }

    res.json({
      success: true,
      message: schedule 
        ? `Successfully scheduled ${topics.length} posts stagger-scheduled starting tomorrow`
        : `Successfully enqueued ${topics.length} drafts for generation`,
      jobIds,
    });
  } catch (error: any) {
    logger.error('Schedule cluster error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to schedule cluster',
        code: 'SCHEDULE_CLUSTER_ERROR',
      },
    });
  }
});

/**
 * Handle user's additional requests for approved topic clusters
 * POST /api/content/cluster-additional
 */
router.post('/cluster-additional', authenticate, async (req, res) => {
  try {
    const { topics, request } = req.body;
    if (!request) {
      return res.status(400).json({ error: { message: 'Request is required' } });
    }

    const contentService = new ContentGenerationService();
    const responseText = await contentService.handleAdditionalWants(topics, request);

    res.json({ response: responseText });
  } catch (error: any) {
    logger.error('Cluster additional request error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to process request',
        code: 'ADDITIONAL_ERROR',
      },
    });
  }
});

export default router;
