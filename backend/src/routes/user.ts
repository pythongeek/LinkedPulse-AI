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

/**
 * Get topic watchlist
 * GET /api/user/watchlist
 */
router.get('/watchlist', authenticate, async (req, res) => {
  try {
    const watchlist = await (prisma as any).topicWatchlist.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ watchlist });
  } catch (error) {
    logger.error('Get watchlist error:', error);
    res.status(500).json({
      error: { message: 'Failed to get watchlist', code: 'INTERNAL_ERROR' },
    });
  }
});

/**
 * Add topic to watchlist
 * POST /api/user/watchlist
 */
router.post('/watchlist', authenticate, async (req, res) => {
  try {
    const { keyword, contentType, topicType, audienceSegment, alertThreshold } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: { message: 'Keyword is required', code: 'VALIDATION_ERROR' } });
    }

    // Check for duplicate
    const existing = await (prisma as any).topicWatchlist.findFirst({
      where: { userId: req.user!.id, keyword: keyword.toLowerCase() },
    });

    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        await (prisma as any).topicWatchlist.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return res.json({ watchlist: existing, message: 'Topic already in watchlist' });
    }

    const watchlist = await (prisma as any).topicWatchlist.create({
      data: {
        userId: req.user!.id,
        keyword: keyword.toLowerCase(),
        contentType: contentType || null,
        topicType: topicType || null,
        audienceSegment: audienceSegment || null,
        alertThreshold: alertThreshold || 70,
      },
    });

    res.json({ watchlist, message: 'Topic added to watchlist' });
  } catch (error) {
    logger.error('Add watchlist error:', error);
    res.status(500).json({
      error: { message: 'Failed to add to watchlist', code: 'INTERNAL_ERROR' },
    });
  }
});

/**
 * Remove topic from watchlist
 * DELETE /api/user/watchlist/:id
 */
router.delete('/watchlist/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await (prisma as any).topicWatchlist.deleteMany({
      where: { id, userId: req.user!.id },
    });

    res.json({ message: 'Topic removed from watchlist' });
  } catch (error) {
    logger.error('Delete watchlist error:', error);
    res.status(500).json({
      error: { message: 'Failed to remove from watchlist', code: 'INTERNAL_ERROR' },
    });
  }
});

/**
 * Update watchlist item alert threshold
 * PUT /api/user/watchlist/:id
 */
router.put('/watchlist/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { alertThreshold, isActive } = req.body;

    const updated = await (prisma as any).topicWatchlist.updateMany({
      where: { id, userId: req.user!.id },
      data: {
        ...(alertThreshold !== undefined && { alertThreshold }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ message: 'Watchlist item updated', updated });
  } catch (error) {
    logger.error('Update watchlist error:', error);
    res.status(500).json({
      error: { message: 'Failed to update watchlist', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
