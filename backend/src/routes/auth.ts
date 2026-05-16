import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { authenticate, generateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRegistrationSchema, userLoginSchema, linkedinCookiesSchema } from '../utils/validation';
import { Encryption } from '../utils/encryption';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', validateBody(userRegistrationSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'User already exists',
          code: 'USER_EXISTS',
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // Create default usage stats
    await prisma.usageStats.create({
      data: {
        userId: user.id,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to register user',
        code: 'REGISTRATION_ERROR',
      },
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', validateBody(userLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to login',
        code: 'LOGIN_ERROR',
      },
    });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        usageStats: true,
        personas: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        linkedinConnected: !!user.linkedinCookies,
        defaultPersona: user.personas[0] || null,
        usageStats: user.usageStats,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get user',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Setup LinkedIn cookies
 * POST /api/auth/linkedin
 */
router.post('/linkedin', authenticate, validateBody(linkedinCookiesSchema), async (req, res) => {
  try {
    const { liAt, jsessionId } = req.body;
    const userId = req.user!.id;

    // Encrypt cookies
    const encryptedLiAt = Encryption.encrypt(liAt);
    const encryptedJsessionId = Encryption.encrypt(jsessionId);

    // Store in database
    await prisma.linkedInSession.upsert({
      where: { userId },
      update: {
        liAt: encryptedLiAt,
        jsessionId: encryptedJsessionId,
        lastUsed: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      create: {
        userId,
        liAt: encryptedLiAt,
        jsessionId: encryptedJsessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkedinCookies: JSON.stringify({ liAt: encryptedLiAt, jsessionId: encryptedJsessionId }),
      },
    });

    logger.info(`LinkedIn connected for user: ${userId}`);

    res.json({
      message: 'LinkedIn connected successfully',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    logger.error('LinkedIn setup error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to connect LinkedIn',
        code: 'LINKEDIN_ERROR',
      },
    });
  }
});

/**
 * Disconnect LinkedIn
 * DELETE /api/auth/linkedin
 */
router.delete('/linkedin', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Delete session
    await prisma.linkedInSession.deleteMany({
      where: { userId },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { linkedinCookies: null },
    });

    logger.info(`LinkedIn disconnected for user: ${userId}`);

    res.json({
      message: 'LinkedIn disconnected successfully',
    });
  } catch (error) {
    logger.error('LinkedIn disconnect error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to disconnect LinkedIn',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

/**
 * Check LinkedIn connection status
 * GET /api/auth/linkedin/status
 */
router.get('/linkedin/status', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const session = await prisma.linkedInSession.findUnique({
      where: { userId },
    });

    res.json({
      connected: !!session && session.isActive,
      expiresAt: session?.expiresAt || null,
      lastUsed: session?.lastUsed || null,
    });
  } catch (error) {
    logger.error('LinkedIn status error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to check LinkedIn status',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

export default router;
