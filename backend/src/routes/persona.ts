import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { personaSchema } from '../utils/validation';
import { PersonaService } from '../services/personaService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get all personas for current user
 * GET /api/persona
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const personas = await prisma.persona.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ personas });
  } catch (error) {
    logger.error('Get personas error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch personas',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get a single persona
 * GET /api/persona/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;

    const persona = await prisma.persona.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!persona) {
      return res.status(404).json({
        error: {
          message: 'Persona not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ persona });
  } catch (error) {
    logger.error('Get persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch persona',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Create a new persona
 * POST /api/persona
 */
router.post('/', authenticate, validateBody(personaSchema), async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user!.id;

    // Generate system prompt
    const systemPrompt = PersonaService.generateSystemPrompt(data);

    // If this is the first persona or marked as default, unset other defaults
    if (data.isDefault) {
      await prisma.persona.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const persona = await prisma.persona.create({
      data: {
        ...data,
        userId,
        systemPrompt,
      },
    });

    logger.info(`Persona created: ${persona.id} for user: ${userId}`);

    res.status(201).json({
      message: 'Persona created successfully',
      persona,
    });
  } catch (error) {
    logger.error('Create persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create persona',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Update a persona
 * PUT /api/persona/:id
 */
router.put('/:id', authenticate, validateBody(personaSchema), async (req, res) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const userId = req.user!.id;

    // Check if persona exists and belongs to user
    const existingPersona = await prisma.persona.findFirst({
      where: { id, userId },
    });

    if (!existingPersona) {
      return res.status(404).json({
        error: {
          message: 'Persona not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Regenerate system prompt if relevant fields changed
    const systemPrompt = PersonaService.generateSystemPrompt(data);

    // Handle default status
    if (data.isDefault && !existingPersona.isDefault) {
      await prisma.persona.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        ...data,
        systemPrompt,
      },
    });

    logger.info(`Persona updated: ${id}`);

    res.json({
      message: 'Persona updated successfully',
      persona,
    });
  } catch (error) {
    logger.error('Update persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update persona',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Delete a persona
 * DELETE /api/persona/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    // Check if persona exists and belongs to user
    const existingPersona = await prisma.persona.findFirst({
      where: { id, userId },
    });

    if (!existingPersona) {
      return res.status(404).json({
        error: {
          message: 'Persona not found',
          code: 'NOT_FOUND',
        },
      });
    }

    await prisma.persona.delete({
      where: { id },
    });

    logger.info(`Persona deleted: ${id}`);

    res.json({
      message: 'Persona deleted successfully',
    });
  } catch (error) {
    logger.error('Delete persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete persona',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Set default persona
 * POST /api/persona/:id/default
 */
router.post('/:id/default', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    // Check if persona exists and belongs to user
    const existingPersona = await prisma.persona.findFirst({
      where: { id, userId },
    });

    if (!existingPersona) {
      return res.status(404).json({
        error: {
          message: 'Persona not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Unset all other defaults
    await prisma.persona.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this as default
    const persona = await prisma.persona.update({
      where: { id },
      data: { isDefault: true },
    });

    logger.info(`Default persona set: ${id}`);

    res.json({
      message: 'Default persona updated',
      persona,
    });
  } catch (error) {
    logger.error('Set default persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to set default persona',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Preview persona output
 * POST /api/persona/:id/preview
 */
router.post('/:id/preview', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { sampleTopic } = req.body;
    const userId = req.user!.id;

    const persona = await prisma.persona.findFirst({
      where: { id, userId },
    });

    if (!persona) {
      return res.status(404).json({
        error: {
          message: 'Persona not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Generate preview content
    const preview = await PersonaService.generatePreview(persona, sampleTopic || 'AI in healthcare');

    res.json({
      preview,
      persona: {
        name: persona.name,
        jobRole: persona.jobRole,
        tone: persona.tone,
      },
    });
  } catch (error) {
    logger.error('Preview persona error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate preview',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get persona templates
 * GET /api/persona/templates
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = PersonaService.getTemplates();
    res.json({ templates });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch templates',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export default router;
