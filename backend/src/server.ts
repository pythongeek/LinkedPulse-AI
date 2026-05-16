import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth';
import personaRoutes from './routes/persona';
import trendRoutes from './routes/trends';
import contentRoutes from './routes/content';
import competitorRoutes from './routes/competitor';
import auditRoutes from './routes/audit';
import imageRoutes from './routes/images';
import researchRoutes from './routes/research';
import userRoutes from './routes/user';
import cronRoutes from './routes/cron';

// Import services
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Trust proxy (required for Vercel + rate-limit)
app.set('trust proxy', 1);

// Initialize Prisma (singleton for serverless)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Redis stub (removed — Vercel has no Redis)
export const redis = null;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      redis: 'not-configured',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/competitor', competitorRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/user', userRoutes);
app.use('/api/cron', cronRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
  });
});

// Vercel serverless function export
export default app;
