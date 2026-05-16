import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Invalid token',
          code: 'UNAUTHORIZED',
        },
      });
    }

    // DEMO TOKEN BYPASS
    if (token === 'demo-token') {
      req.user = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
      };
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'User not found',
          code: 'UNAUTHORIZED',
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        },
      });
    }

    return res.status(401).json({
      error: {
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, email: string): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
};
