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
    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          usageStats: true,
          personas: {
            where: { isDefault: true },
            take: 1,
          },
        },
      }),
      prisma.linkedInSession.findUnique({
        where: { userId: req.user!.id },
      }),
    ]);

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
        linkedinConnected: (!!user.linkedinCookies) || (!!session && session.isActive),
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
 * Initiate LinkedIn OAuth login
 * GET /api/auth/linkedin/login
 */
router.get('/linkedin/login', authenticate, (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: { message: 'LinkedIn Client ID not configured', code: 'CONFIG_ERROR' } });
  }
  
  const host = req.get('host');
  const protocol = req.protocol === 'http' && host?.includes('localhost') ? 'http' : 'https';
  const backendUrl = process.env.VITE_API_URL || process.env.BACKEND_URL || `${protocol}://${host}`;
  const redirectUri = `${backendUrl}/api/auth/linkedin/callback`;
  const scope = 'w_member_social openid profile email';
  const state = req.user!.id; // Track user

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
  res.json({ url });
});

import axios from 'axios';

/**
 * Handle LinkedIn OAuth callback
 * GET /api/auth/linkedin/callback
 */
router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://linked-pulse-ai.vercel.app';

  if (error) {
    logger.error('LinkedIn OAuth returned error:', error_description);
    return res.redirect(`${frontendUrl}/settings?linkedin=error`);
  }

  try {
    const userId = state as string;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    
    const host = req.get('host');
    const protocol = req.protocol === 'http' && host?.includes('localhost') ? 'http' : 'https';
    const backendUrl = process.env.VITE_API_URL || process.env.BACKEND_URL || `${protocol}://${host}`;
    const redirectUri = `${backendUrl}/api/auth/linkedin/callback`;

    // Exchange code for token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Save token
    await prisma.linkedInSession.upsert({
      where: { userId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: new Date(Date.now() + (expires_in * 1000)),
        lastUsed: new Date(),
        isActive: true,
      },
      create: {
        userId,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: new Date(Date.now() + (expires_in * 1000)),
        isActive: true,
      },
    });

    // Fetch profile details via LinkedIn OAuth /userinfo API
    try {
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      const info = userinfoResponse.data;
      if (info) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        let profile = (user?.linkedinProfile as any) || {};
        profile = {
          ...profile,
          name: info.name || profile.name || null,
          profilePicUrl: info.picture || profile.profilePicUrl || null,
          email: info.email || profile.email || null
        };
        await prisma.user.update({
          where: { id: userId },
          data: {
            linkedinProfile: profile,
            name: user?.name || info.name || undefined,
            avatar: user?.avatar || info.picture || undefined
          }
        });
        logger.info(`Updated user profile cache via LinkedIn OAuth userinfo for user: ${userId}`);
      }
    } catch (profileErr: any) {
      logger.warn('Failed to fetch LinkedIn profile details during OAuth callback:', profileErr.message);
    }

    res.redirect(`${frontendUrl}/settings?linkedin=success`);
  } catch (err: any) {
    logger.error('LinkedIn OAuth error:', err.response?.data || err.message);
    res.redirect(`${frontendUrl}/settings?linkedin=error`);
  }
});

/**
 * Disconnect LinkedIn
 * DELETE /api/auth/linkedin
 */
router.delete('/linkedin', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    const session = await prisma.linkedInSession.findUnique({ where: { userId } });
    if (session) {
      if (type === 'cookie') {
        await prisma.linkedInSession.update({
          where: { userId },
          data: {
            liAt: null,
            jsessionId: null,
          },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { linkedinCookies: null },
        });
        logger.info(`LinkedIn cookies disconnected for user: ${userId}`);
      } else if (type === 'oauth') {
        await prisma.linkedInSession.update({
          where: { userId },
          data: {
            accessToken: null,
            refreshToken: null,
          },
        });
        logger.info(`LinkedIn OAuth disconnected for user: ${userId}`);
      } else {
        await prisma.linkedInSession.delete({
          where: { userId },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { linkedinCookies: null },
        });
        logger.info(`LinkedIn completely disconnected for user: ${userId}`);
      }

      // Clean up empty session
      const updatedSession = await prisma.linkedInSession.findUnique({ where: { userId } });
      if (updatedSession && !updatedSession.liAt && !updatedSession.jsessionId && !updatedSession.accessToken) {
        await prisma.linkedInSession.delete({
          where: { userId },
        });
      }
    } else {
      // Just in case, clean up user cookies if they exist
      await prisma.user.update({
        where: { id: userId },
        data: { linkedinCookies: null },
      });
    }

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
      hasCookies: !!session && !!session.liAt && !!session.jsessionId,
      hasOAuth: !!session && !!session.accessToken,
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
