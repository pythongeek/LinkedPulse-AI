import { Router } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get user usage stats
 * GET /api/user/stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await prisma.usageStats.findUnique({
      where: { userId: req.user!.id },
    });

    if (!stats) {
      return res.json({
        contentsGenerated: 0,
        topicsResearched: 0,
        imagesCreated: 0,
        apiCalls: 0,
      });
    }

    res.json({ stats });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get usage stats',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Get user alerts
 * GET /api/user/alerts
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    const alerts = await prisma.topicAlert.findMany({
      where: {
        userId: req.user!.id,
        ...(unreadOnly === 'true' && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ alerts });
  } catch (error) {
    logger.error('Get user alerts error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get alerts',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Mark alert as read
 * PUT /api/user/alerts/:id/read
 */
router.put('/alerts/:id/read', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;

    await prisma.topicAlert.updateMany({
      where: {
        id,
        userId: req.user!.id,
      },
      data: { isRead: true },
    });

    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    logger.error('Mark alert read error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to mark alert as read',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update profile',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export default router;
